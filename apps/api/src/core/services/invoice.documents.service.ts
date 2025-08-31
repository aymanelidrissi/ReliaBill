// purpose: prepare UBL/PDF, then send with simple routing (PEPPOL vs fallback) and clear logs

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { DocGenNodeAdapter } from '../../infrastructure/adapters/docgen.node.adapter';
import { HttpHermesAdapter } from '../../infrastructure/adapters/hermes.http.adapter';

type SendRoute = 'PEPPOL' | 'HERMES_FALLBACK';

function storageRoot(): string {
  const base = process.env.DOCS_DIR || './storage';
  return path.isAbsolute(base) ? base : path.resolve(process.cwd(), base);
}

function relInvoiceDir(invId: string): string {
  return path.join('storage', 'invoices', invId);
}

function toAbsolute(maybeRelative: string): string {
  if (!maybeRelative) return '';
  if (path.isAbsolute(maybeRelative)) return maybeRelative;

  const cwd = process.cwd();
  const docs = storageRoot();
  const appsApi = path.resolve(cwd, 'apps', 'api');

  const norm = maybeRelative.replace(/[\\/]+/g, path.sep);
  const candidates = [
    path.resolve(cwd, norm),
    path.resolve(docs, norm),
    path.resolve(appsApi, norm),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(docs, norm);
}

@Injectable()
export class InvoiceDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly docgen: DocGenNodeAdapter,
    private readonly hermes: HttpHermesAdapter,
  ) {}

  async prepare(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company: { userId } },
      include: { company: true, client: true, lines: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (!inv.lines || inv.lines.length === 0) throw new BadRequestException('NO_LINES');

    const dirRel = relInvoiceDir(inv.id);
    const xmlRel = path.join(dirRel, `${inv.id}.xml`);
    const pdfRel = path.join(dirRel, `${inv.id}.pdf`);
    const xmlAbs = toAbsolute(xmlRel);
    const pdfAbs = toAbsolute(pdfRel);

    await this.docgen.renderUbl({ invoice: inv, company: inv.company, client: inv.client, outPath: xmlAbs });
    await this.docgen.renderPdf({ invoice: inv, company: inv.company, client: inv.client, outPath: pdfAbs });

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        xmlPath: xmlRel.replace(/[\\/]+/g, path.sep),
        pdfPath: pdfRel.replace(/[\\/]+/g, path.sep),
        status: 'READY',
        updatedAt: new Date(),
        logs: {
          create: {
            status: 'PREPARE',
            message: `Documents prepared (xml=${xmlRel}, pdf=${pdfRel})`,
            provider: 'docgen',
          },
        },
      },
    });

    return { status: 'READY', xmlPath: xmlRel, pdfPath: pdfRel };
  }

  async send(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company: { userId } },
      include: { client: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'READY' || !inv.xmlPath) {
      throw new BadRequestException('Prepare documents before sending');
    }

    const xmlAbs = toAbsolute(inv.xmlPath);
    if (!fs.existsSync(xmlAbs)) throw new NotFoundException('XML document not found on disk');

    const hasPeppolId = !!inv.client?.peppolId;
    const route: SendRoute =
      hasPeppolId || inv.client?.deliveryMode === 'PEPPOL'
        ? 'PEPPOL'
        : 'HERMES_FALLBACK';

    const result = await this.hermes.send({ xmlPath: xmlAbs });
    const messageId = result?.messageId ?? null;
    const newStatus = result?.delivered ? 'DELIVERED' : 'SENT';

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: newStatus as any,
        hermesMessageId: messageId,
        logs: {
          create: {
            status: 'SEND',
            message: `Invoice sent (route=${route}, messageId=${messageId ?? 'n/a'}, status=${newStatus})`,
            provider: 'hermes',
          },
        },
      },
    });

    return { id: inv.id, messageId, status: newStatus, route };
  }

  async refreshStatus(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company: { userId } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (!inv.hermesMessageId) throw new BadRequestException('No message to refresh');

    const res = await this.hermes.status(inv.hermesMessageId);
    const newStatus = (res?.status as any) || inv.status;

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: newStatus,
        logs: {
          create: {
            status: 'STATUS',
            message: `Status refreshed (messageId=${inv.hermesMessageId}, status=${newStatus})`,
            provider: 'hermes',
          },
        },
      },
    });

    return { id: inv.id, status: newStatus };
  }

  async listLogs(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company: { userId } },
      include: { logs: { orderBy: { timestamp: 'asc' } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv.logs;
  }
}
