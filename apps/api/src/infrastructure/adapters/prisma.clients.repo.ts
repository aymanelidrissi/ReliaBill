import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ClientEntity,
  ClientsRepoPort,
  CreateClientData,
  UpdateClientData,
  ListOptions,
  ListResult,
} from '../../core/ports/clients.repo.port';

@Injectable()
export class PrismaClientsRepo implements ClientsRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByCompany(companyId: string, opts: ListOptions): Promise<ListResult<ClientEntity>> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (opts.query) {
      where.name = { contains: opts.query, mode: 'insensitive' };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return { items: items as any, total, page, limit };
  }

  findByIdForCompany(companyId: string, id: string) {
    return this.prisma.client.findFirst({ where: { id, companyId } }) as any;
  }

  create(companyId: string, data: CreateClientData) {
    return this.prisma.client.create({
      data: {
        companyId,
        name: data.name,
        vat: data.vat ?? null,
        email: data.email ?? null,
        street: data.street ?? '',
        city: data.city ?? '',
        postalCode: data.postalCode ?? '',
        country: data.country ?? 'BE',
      },
    }) as any;
  }

  update(companyId: string, id: string, data: UpdateClientData) {
    return this.prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        vat: data.vat ?? null,
        email: data.email ?? null,
        street: data.street,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
      },
      select: {
        id: true, companyId: true, name: true, vat: true, email: true,
        street: true, city: true, postalCode: true, country: true,
        createdAt: true, updatedAt: true,
      },
    }) as any;
  }

  async delete(companyId: string, id: string) {
    await this.prisma.client.delete({ where: { id } });
  }
}
