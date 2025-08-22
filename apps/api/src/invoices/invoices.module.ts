import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoiceService } from '../core/services/invoice.service';
import { INVOICES_REPO } from '../core/ports/invoices.repo.port';
import { PrismaInvoicesRepo } from '../infrastructure/adapters/prisma.invoices.repo';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { CLIENTS_REPO } from '../core/ports/clients.repo.port';
import { PrismaClientsRepo } from '../infrastructure/adapters/prisma.clients.repo';
import { COMPANIES_REPO } from '../core/ports/companies.repo.port';
import { PrismaCompaniesRepo } from '../infrastructure/adapters/prisma.companies.repo';

@Module({
  imports: [
    AuthModule,
    CompaniesModule,
  ],
  controllers: [InvoicesController],
  providers: [
    InvoiceService,
    { provide: INVOICES_REPO, useClass: PrismaInvoicesRepo },
    { provide: CLIENTS_REPO, useClass: PrismaClientsRepo },
    { provide: COMPANIES_REPO, useClass: PrismaCompaniesRepo },
  ],
})
export class InvoicesModule {}
