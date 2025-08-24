import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { INVOICES_REPO } from '../../core/ports/invoices.repo.port';
import type { InvoicesRepoPort, InvoiceStatus } from '../../core/ports/invoices.repo.port';
import { CLIENTS_REPO } from '../../core/ports/clients.repo.port';
import type { ClientsRepoPort } from '../../core/ports/clients.repo.port';
import { COMPANIES_REPO } from '../../core/ports/companies.repo.port';
import type { CompaniesRepoPort } from '../../core/ports/companies.repo.port';
import { DOC_GEN } from '../../core/ports/docgen.port';
import type { DocGenPort } from '../../core/ports/docgen.port';
import { HERMES } from '../../core/ports/hermes.port';
import type { HermesPort } from '../../core/ports/hermes.port';
import { DELIVERY_LOGS_REPO } from '../../core/ports/deliverylog.repo.port';
import type { DeliveryLogsRepoPort } from '../../core/ports/deliverylog.repo.port';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class InvoiceDocumentsService {
  constructor(
    @Inject(INVOICES_REPO) private readonly invoices: InvoicesRepoPort,
    @Inject(CLIENTS_REPO) private readonly clients: ClientsRepoPort,
    @Inject(COMPANIES_REPO) private readonly companies: CompaniesRepoPort,
    @Inject(DOC_GEN) private readonly docgen: DocGenPort,
    @Inject(HERMES) private readonly hermes: HermesPort,
    @Inject(DELIVERY_LOGS_REPO) private readonly logs: DeliveryLogsRepoPort,
  ) {}

  private storageDir() {
    return process.env.DOCS_DIR || path.resolve(process.cwd(), 'storage');
  }

  private invoiceDir(invoiceId: string) {
    return path.join(this.storageDir(), 'invoices', invoiceId);
  }

  async prepare(userId: string, invoiceId: string) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new BadRequestException('NO_COMPANY');

    const inv = await this.invoices.getById(company.id, invoiceId);
    if (!inv) throw new BadRequestException('NOT_FOUND');
    if (!inv.clientId) throw new BadRequestException('CLIENT_NOT_FOUND');

    const client = await this.clients.findByIdForCompany(company.id, inv.clientId);
    if (!client) throw new BadRequestException('CLIENT_NOT_FOUND');

    const dir = this.invoiceDir(inv.id);
    fs.mkdirSync(dir, { recursive: true });
    const pdfPath = path.join(dir, `${inv.id}.pdf`);
    const xmlPath = path.join(dir, `${inv.id}.xml`);

    await this.docgen.renderPdf({ invoice: inv, company, client, outPath: pdfPath });
    await this.docgen.renderUbl({ invoice: inv, company, client, outPath: xmlPath });

    const updated = await this.invoices.update(company.id, inv.id, {
      pdfPath,
      xmlPath,
      status: 'READY' as InvoiceStatus,
    });

    await this.logs.create({
      invoiceId: inv.id,
      kind: 'PREPARE',
      message: 'Generated PDF and UBL',
    });

    return { pdfPath, xmlPath, status: updated.status };
  }

  async listLogs(userId: string, invoiceId: string) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new BadRequestException('NO_COMPANY');

    const inv = await this.invoices.getById(company.id, invoiceId);
    if (!inv) throw new BadRequestException('NOT_FOUND');

    return this.logs.listByInvoice(inv.id, 100);
  }

  async send(userId: string, invoiceId: string) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new BadRequestException('NO_COMPANY');

    const inv = await this.invoices.getById(company.id, invoiceId);
    if (!inv) throw new BadRequestException('NOT_FOUND');

    if (!inv.xmlPath || !fs.existsSync(inv.xmlPath)) {
      await this.prepare(userId, invoiceId);
    }
    const fresh = await this.invoices.getById(company.id, invoiceId);
    if (!fresh?.xmlPath) throw new BadRequestException('XML_MISSING');

    if (fresh.hermesMessageId) {
      await this.logs.create({
        invoiceId: inv.id,
        kind: 'SKIP',
        message: 'Already sent',
      });
      return { messageId: fresh.hermesMessageId, status: fresh.status };
    }

    const { messageId, delivered } = await this.hermes.send({ xmlPath: fresh.xmlPath });
    const nextStatus: InvoiceStatus = delivered ? 'DELIVERED' : 'SENT';
    const updated = await this.invoices.update(company.id, inv.id, {
      hermesMessageId: messageId,
      status: nextStatus,
    });

    await this.logs.create({
      invoiceId: inv.id,
      kind: 'SEND',
      message: 'Sent to Hermes',
    });

    return { messageId, status: updated.status };
  }

  async refreshStatus(userId: string, invoiceId: string) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new BadRequestException('NO_COMPANY');

    const inv = await this.invoices.getById(company.id, invoiceId);
    if (!inv) throw new BadRequestException('NOT_FOUND');
    if (!inv.hermesMessageId) throw new BadRequestException('NOT_SENT');

    const res = await this.hermes.status(inv.hermesMessageId);
    const map = { SENT: 'SENT', DELIVERED: 'DELIVERED', FAILED: 'FAILED' } as const;
    const next = map[res.status] as InvoiceStatus;

    if (next !== inv.status) {
      await this.invoices.update(company.id, inv.id, { status: next });
      await this.logs.create({ invoiceId: inv.id, kind: 'STATUS', message: `Status ${next}` });
    }
    return { messageId: res.messageId, status: next };
  }
}
