import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { DocGenNodeAdapter } from '../../infrastructure/adapters/docgen.node.adapter';
import { HttpHermesAdapter } from '../../infrastructure/adapters/hermes.http.adapter';
import { UblValidatorService } from './ubl.validator.service';
import { SmpResolverService } from './smp.resolver.service';
import { PeppolApAdapter } from '../../infrastructure/adapters/peppol.ap.adapter';


type SendRoute = 'PEPPOL' | 'HERMES_FALLBACK';

function docsBase(): string {
  const base = process.env.DOCS_DIR || './storage';
  return path.isAbsolute(base) ? base : path.resolve(process.cwd(), base);
}

function relInvoiceDir(invId: string): string {
  return path.join('invoices', invId);
}

function resolveStoredToAbs(stored: string | null | undefined): string | null {
  if (!stored) return null;
  let rel = String(stored).replace(/[\\/]+/g, path.sep);
  const legacyPrefix = 'storage' + path.sep;
  if (rel.startsWith(legacyPrefix)) rel = rel.slice(legacyPrefix.length);
  if (path.isAbsolute(rel) && fs.existsSync(rel)) return rel;
  const base = docsBase();
  const abs = path.resolve(base, rel);
  if (fs.existsSync(abs)) return abs;
  const alt = path.resolve(process.cwd(), rel);
  if (fs.existsSync(alt)) return alt;
  return abs;
}

function toSlash(p: string): string {
  return p.replace(/\\/g, '/');
}

@Injectable()
export class InvoiceDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly docgen: DocGenNodeAdapter,
    private readonly hermes: HttpHermesAdapter,
    private readonly validator: UblValidatorService,
    private readonly smp: SmpResolverService,
    private readonly peppol: PeppolApAdapter,
  ) { }

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

    const xmlAbs = path.resolve(docsBase(), xmlRel);
    const pdfAbs = path.resolve(docsBase(), pdfRel);

    await this.docgen.renderUbl({ invoice: inv, company: inv.company, client: inv.client, outPath: xmlAbs });
    await this.docgen.renderPdf({ invoice: inv, company: inv.company, client: inv.client, outPath: pdfAbs });

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        xmlPath: toSlash(xmlRel),
        pdfPath: toSlash(pdfRel),
        status: 'READY',
        updatedAt: new Date(),
        logs: {
          create: {
            status: 'PREPARE',
            message: `Documents prepared (xml=${toSlash(xmlRel)}, pdf=${toSlash(pdfRel)})`,
            provider: 'docgen',
          },
        },
      },
    });

    return { status: 'READY', xmlPath: toSlash(xmlRel), pdfPath: toSlash(pdfRel) };
  }

  async send(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company: { userId } },
      include: { client: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'READY' || !inv.xmlPath) throw new BadRequestException('Prepare documents before sending');

    const xmlAbs = resolveStoredToAbs(inv.xmlPath);
    if (!xmlAbs || !fs.existsSync(xmlAbs)) throw new NotFoundException('XML document not found on disk');

    const hasPeppolId = !!inv.client?.peppolId;
    const route: SendRoute = hasPeppolId || inv.client?.deliveryMode === 'PEPPOL' ? 'PEPPOL' : 'HERMES_FALLBACK';

    let messageId: string | null = null;
    let newStatus: 'SENT' | 'DELIVERED' | 'FAILED' = 'SENT';
    let provider = 'hermes';

    if (route === 'PEPPOL') {
      const v = await this.validator.validateFile(xmlAbs);
      if (!v.ok) throw new BadRequestException(`INVALID_UBL: ${v.errors.join('; ')}`);

      const recipient = this.smp.resolveParticipant({
        peppolScheme: inv.client?.peppolScheme,
        peppolId: inv.client?.peppolId,
      });
      if (!recipient) throw new BadRequestException('MISSING_PEPPOL_ID');

      const { processId, documentTypeId } = this.smp.resolveRouting(recipient);
      const r = await this.peppol.send({ xmlPath: xmlAbs, recipient, processId, documentTypeId });
      messageId = r.messageId || null;
      newStatus = r.delivered ? 'DELIVERED' : 'SENT';
      provider = 'peppol-ap';
    } else {
      const r = await this.hermes.send({ xmlPath: xmlAbs });
      messageId = r.messageId || null;
      newStatus = r.delivered ? 'DELIVERED' : 'SENT';
      provider = 'hermes';
    }

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: newStatus,
        hermesMessageId: messageId,
        logs: {
          create: {
            status: 'SEND',
            message: `Invoice sent (route=${route}, messageId=${messageId ?? 'n/a'}, status=${newStatus})`,
            provider,
          },
        },
      },
    });

    return { id: inv.id, messageId, status: newStatus, route };
  }

  async refreshStatus(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({ where: { id: invoiceId, company: { userId } } });
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
