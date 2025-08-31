import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async allocate(
    companyId: string,
    issueDate: Date,
  ): Promise<{ year: number; seq: number; number: string }> {
    const year = issueDate.getUTCFullYear();

    const rows = await this.prisma.$queryRaw<{ seq: bigint | number }[]>`
      INSERT INTO "InvoiceCounter" ("companyId","year","seq")
      VALUES (${companyId}, ${year}, 1)
      ON CONFLICT ("companyId","year")
      DO UPDATE SET "seq" = "InvoiceCounter"."seq" + 1
      RETURNING "seq"
    `;

    if (!rows || rows.length === 0) {
      throw new Error('COUNTER_ALLOC_FAILED');
    }
    const seq = Number(rows[0].seq);
    const number = `${year}-${String(seq).padStart(4, '0')}`;
    return { year, seq, number };
    }
}
