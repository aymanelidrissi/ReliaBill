 import { Module } from '@nestjs/common';
 import { InvoicesController } from './invoices.controller';
 import { InvoiceService } from '../core/services/invoice.service';
 import { COMPANIES_REPO, CLIENTS_REPO, INVOICES_REPO } from '../core/ports';
 import { PrismaCompaniesRepo } from '../infrastructure/adapters/prisma.companies.repo';
 import { PrismaClientsRepo } from '../infrastructure/adapters/prisma.clients.repo';
 import { PrismaInvoicesRepo } from '../infrastructure/adapters/prisma.invoices.repo';
import { AuthModule } from '../auth/auth.module';

 @Module({
  imports: [AuthModule],
   controllers: [InvoicesController],
   providers: [
     InvoiceService,
     { provide: COMPANIES_REPO, useClass: PrismaCompaniesRepo },
     { provide: CLIENTS_REPO,  useClass: PrismaClientsRepo },
     { provide: INVOICES_REPO, useClass: PrismaInvoicesRepo },
   ],
 })
 export class InvoicesModule {}
