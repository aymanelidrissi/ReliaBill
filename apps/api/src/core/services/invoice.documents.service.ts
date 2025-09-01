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

    const wantsPeppol = inv.client?.deliveryMode === 'PEPPOL';
    if (wantsPeppol && !inv.client?.peppolId) throw new BadRequestException('MISSING_PEPPOL_ID');

    const usePeppol = !!inv.client?.peppolId && inv.client?.deliveryMode !== 'HERMES';
    const route: SendRoute = usePeppol ? 'PEPPOL' : 'HERMES_FALLBACK';

    let messageId: string | null = null;
    let delivered = false;

    if (route === 'PEPPOL') {
      const processId = process.env.ACUBE_PROCESS || 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';
      const documentTypeId =
        process.env.ACUBE_DOC_TYPE ||
        'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1';

      const res = await this.peppol.send({
        xmlPath: xmlAbs,
        recipient: { scheme: inv.client!.peppolScheme || 'iso6523-actorid-upis', id: inv.client!.peppolId! },
        processId,
        documentTypeId,
      });
      messageId = res?.messageId ?? null;
      delivered = !!res?.delivered;
    } else {
      const res = await this.hermes.send({ xmlPath: xmlAbs });
      messageId = res?.messageId ?? null;
      delivered = !!res?.delivered;
    }

    const newStatus = delivered ? 'DELIVERED' : 'SENT';

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: newStatus as any,
        hermesMessageId: messageId,
        logs: {
          create: {
            status: 'SEND',
            message: `Invoice sent (route=${route}, messageId=${messageId ?? 'n/a'}, status=${newStatus})`,
            provider: route === 'PEPPOL' ? 'peppol' : 'hermes',
          },
        },
      },
    });

    return { id: inv.id, messageId, status: newStatus, route };
  }

  async refreshStatus(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company: { userId } },
      include: { client: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (!inv.hermesMessageId) throw new BadRequestException('No message to refresh');

    let newStatus = inv.status;
    let provider = 'hermes';

    const peppolHasStatus = typeof (this.peppol as any).status === 'function';

    if (inv.client?.deliveryMode === 'PEPPOL' && peppolHasStatus) {
      const res = await (this.peppol as any).status(inv.hermesMessageId);
      newStatus = (res?.status as any) || inv.status;
      provider = 'peppol';
    } else {
      const res = await this.hermes.status(inv.hermesMessageId);
      newStatus = (res?.status as any) || inv.status;
      provider = 'hermes';
    }

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: newStatus,
        logs: {
          create: {
            status: 'STATUS',
            message: `Status refreshed (messageId=${inv.hermesMessageId}, status=${newStatus})`,
            provider,
          },
        },
      },
    });

    return { id: inv.id, status: newStatus };
  }

  async validate(userId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, company: { userId } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (!inv.xmlPath) throw new BadRequestException('No XML to validate');
    const xmlAbs = resolveStoredToAbs(inv.xmlPath);
    if (!xmlAbs || !fs.existsSync(xmlAbs)) throw new NotFoundException('XML not found on disk');
    const res = await this.validator.validateFile(xmlAbs);
    return res;
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
