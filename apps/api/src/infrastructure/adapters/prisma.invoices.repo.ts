import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInvoiceData,
  INVOICES_REPO,
  InvoiceListParams,
  InvoiceListResult,
  InvoiceRecord,
  InvoicesRepoPort,
  UpdateInvoiceData,
} from '../../core/ports/invoices.repo.port';

@Injectable()
export class PrismaInvoicesRepo implements InvoicesRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async countForYear(companyId: string, year: number) {
    const gte = new Date(Date.UTC(year, 0, 1));
    const lt = new Date(Date.UTC(year + 1, 0, 1));
    return this.prisma.invoice.count({
      where: { companyId, issueDate: { gte, lt } },
    });
  }

  async list(companyId: string, params: InvoiceListParams): Promise<InvoiceListResult> {
    const { page, limit, query, status, clientId, dateFrom, dateTo } = params;
    const where: any = { companyId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = dateFrom;
      if (dateTo) where.issueDate.lte = dateTo;
    }
    if (query) {
      where.OR = [
        { number: { contains: query, mode: 'insensitive' } },
        { client: { name: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: { lines: true },
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: items.map(mapInvoice),
      total,
      page,
      limit,
    };
  }

  async getById(companyId: string, id: string): Promise<InvoiceRecord | null> {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    return inv ? mapInvoice(inv) : null;
  }

  async create(companyId: string, data: CreateInvoiceData): Promise<InvoiceRecord> {
    const created = await this.prisma.invoice.create({
      data: {
        companyId,
        clientId: data.clientId ?? null,
        number: data.number,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        totalExcl: data.totals.totalExcl,
        totalVat: data.totals.totalVat,
        totalIncl: data.totals.totalIncl,
        status: data.status,
        lines: {
          create: data.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate,
            lineTotalExcl: round2(l.quantity * l.unitPrice),
            lineVat: round2(round2(l.quantity * l.unitPrice) * (l.vatRate / 100)),
          })),
        },
      },
      include: { lines: true },
    });
    return mapInvoice(created);
  }

  async update(companyId: string, id: string, data: UpdateInvoiceData): Promise<InvoiceRecord> {
    const updates: any = {};
    if (data.clientId !== undefined) updates.clientId = data.clientId;
    if (data.issueDate) updates.issueDate = data.issueDate;
    if (data.dueDate) updates.dueDate = data.dueDate;
    if (data.currency) updates.currency = data.currency;
    if (data.status) updates.status = data.status;
    if (data.totals) {
      updates.totalExcl = data.totals.totalExcl;
      updates.totalVat = data.totals.totalVat;
      updates.totalIncl = data.totals.totalIncl;
    }

    const include: any = { lines: true };

    if (data.lines) {
      const invoice = await this.prisma.invoice.update({
        where: { id },
        data: {
          ...updates,
          lines: {
            deleteMany: { invoiceId: id },
            create: data.lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              vatRate: l.vatRate,
              lineTotalExcl: round2(l.quantity * l.unitPrice),
              lineVat: round2(round2(l.quantity * l.unitPrice) * (l.vatRate / 100)),
            })),
          },
        },
        include,
      });
      return mapInvoice(invoice);
    } else {
      const invoice = await this.prisma.invoice.update({
        where: { id },
        data: updates,
        include,
      });
      return mapInvoice(invoice);
    }
  }

  async delete(companyId: string, id: string): Promise<void> {
    await this.prisma.invoice.delete({ where: { id } });
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function mapInvoice(inv: any): any {
  const toNum = (v: any) => (typeof v === 'string' ? parseFloat(v) : Number(v));
  return {
    id: inv.id,
    companyId: inv.companyId,
    clientId: inv.clientId ?? null,
    number: inv.number,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    currency: inv.currency,
    totalExcl: toNum(inv.totalExcl),
    totalVat: toNum(inv.totalVat),
    totalIncl: toNum(inv.totalIncl),
    status: inv.status,
    xmlPath: inv.xmlPath ?? null,
    pdfPath: inv.pdfPath ?? null,
    hermesMessageId: inv.hermesMessageId ?? null,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    lines: inv.lines.map((l: any) => ({
      description: l.description,
      quantity: toNum(l.quantity),
      unitPrice: toNum(l.unitPrice),
      vatRate: toNum(l.vatRate),
      lineTotalExcl: toNum(l.lineTotalExcl),
      lineVat: toNum(l.lineVat),
    })),
  };
}
