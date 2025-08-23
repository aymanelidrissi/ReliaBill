import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DeliveryLogsRepoPort,
  DeliveryLogRecord,
  DeliveryLogKind,
} from '../../core/ports/deliverylog.repo.port';

function providerFor(kind: DeliveryLogKind) {
  return kind === 'PREPARE' ? 'DOCS' : 'HERMES';
}

@Injectable()
export class PrismaDeliveryLogsRepo implements DeliveryLogsRepoPort {
  constructor(private prisma: PrismaService) {}

  async create(input: Omit<DeliveryLogRecord, 'id' | 'createdAt'>): Promise<DeliveryLogRecord> {
    const rec = await this.prisma.deliveryLog.create({
      data: {
        invoiceId: input.invoiceId,
        status: input.kind,
        provider: providerFor(input.kind),
        message: input.message ?? '',
        timestamp: new Date(),
      },
    });
    return {
      id: rec.id,
      invoiceId: rec.invoiceId,
      kind: rec.status as DeliveryLogKind,
      message: rec.message ?? '',
      meta: undefined,
      createdAt: rec.createdAt,
    };
  }

  async listByInvoice(invoiceId: string, limit = 50): Promise<DeliveryLogRecord[]> {
    const rows = await this.prisma.deliveryLog.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      invoiceId: r.invoiceId,
      kind: r.status as DeliveryLogKind,
      message: r.message ?? '',
      meta: undefined,
      createdAt: r.createdAt,
    }));
  }
}
