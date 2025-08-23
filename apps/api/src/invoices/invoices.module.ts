import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoiceService } from '../core/services/invoice.service';
import { InvoiceDocumentsService } from '../core/services/invoice.documents.service';
import { INVOICES_REPO } from '../core/ports/invoices.repo.port';
import { PrismaInvoicesRepo } from '../infrastructure/adapters/prisma.invoices.repo';
import { CLIENTS_REPO } from '../core/ports/clients.repo.port';
import { PrismaClientsRepo } from '../infrastructure/adapters/prisma.clients.repo';
import { COMPANIES_REPO } from '../core/ports/companies.repo.port';
import { PrismaCompaniesRepo } from '../infrastructure/adapters/prisma.companies.repo';
import { DELIVERY_LOGS_REPO } from '../core/ports/deliverylog.repo.port';
import { PrismaDeliveryLogsRepo } from '../infrastructure/adapters/prisma.deliverylogs.repo';
import { DOC_GEN } from '../core/ports/docgen.port';
import { NodeDocGenAdapter } from '../infrastructure/adapters/docgen.node.adapter';
import { HERMES } from '../core/ports/hermes.port';
import { HttpHermesAdapter } from '../infrastructure/adapters/hermes.http.adapter';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [InvoicesController],
  providers: [
    InvoiceService,
    InvoiceDocumentsService,
    { provide: INVOICES_REPO, useClass: PrismaInvoicesRepo },
    { provide: CLIENTS_REPO, useClass: PrismaClientsRepo },
    { provide: COMPANIES_REPO, useClass: PrismaCompaniesRepo },
    { provide: DELIVERY_LOGS_REPO, useClass: PrismaDeliveryLogsRepo },
    { provide: DOC_GEN, useClass: NodeDocGenAdapter },
    { provide: HERMES, useClass: HttpHermesAdapter },
  ],
})
export class InvoicesModule {}
