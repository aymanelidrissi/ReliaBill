import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CompaniesRepoPort, CompanyEntity, CreateCompanyData, UpdateCompanyData } from '../../core/ports/companies.repo.port';

@Injectable()
export class PrismaCompaniesRepo implements CompaniesRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<CompanyEntity | null> {
    return this.prisma.company.findUnique({ where: { userId } }) as any;
  }

  createForUser(userId: string, data: CreateCompanyData): Promise<CompanyEntity> {
    return this.prisma.company.create({
      data: { userId, ...data },
    }) as any;
  }

  updateForUser(userId: string, data: UpdateCompanyData): Promise<CompanyEntity> {
    return this.prisma.company.update({
      where: { userId },
      data,
    }) as any;
  }
}
