import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompanyService } from '../core/services/company.service';
import { COMPANIES_REPO } from '../core/ports/companies.repo.port';
import { PrismaCompaniesRepo } from '../infrastructure/adapters/prisma.companies.repo';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CompaniesController],
  providers: [
    CompanyService,
    { provide: COMPANIES_REPO, useClass: PrismaCompaniesRepo },
  ],
  exports: [
    CompanyService,
    { provide: COMPANIES_REPO, useClass: PrismaCompaniesRepo },
  ],
})
export class CompaniesModule {}
