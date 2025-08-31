import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceService } from '../core/services/invoice.service';
import { InvoiceDocumentsService } from '../core/services/invoice.documents.service';
import { InvoiceNumberService } from '../core/services/invoice.number.service';

import { INVOICES_REPO } from '../core/ports/invoices.repo.port';
import { CLIENTS_REPO } from '../core/ports/clients.repo.port';
import { COMPANIES_REPO } from '../core/ports/companies.repo.port';
import { DELIVERY_LOGS_REPO } from '../core/ports/deliverylog.repo.port';
import { DOC_GEN } from '../core/ports/docgen.port';
import { HERMES } from '../core/ports/hermes.port';

import { PrismaInvoicesRepo } from '../infrastructure/adapters/prisma.invoices.repo';
import { PrismaClientsRepo } from '../infrastructure/adapters/prisma.clients.repo';
import { PrismaCompaniesRepo } from '../infrastructure/adapters/prisma.companies.repo';
import { PrismaDeliveryLogsRepo } from '../infrastructure/adapters/prisma.deliverylogs.repo';
import { DocGenNodeAdapter } from '../infrastructure/adapters/docgen.node.adapter';
import { HttpHermesAdapter } from '../infrastructure/adapters/hermes.http.adapter';

import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [InvoicesController],
  providers: [
    PrismaService,
    InvoiceService,
    InvoiceDocumentsService,
    InvoiceNumberService,

    { provide: INVOICES_REPO, useClass: PrismaInvoicesRepo },
    { provide: CLIENTS_REPO, useClass: PrismaClientsRepo },
    { provide: COMPANIES_REPO, useClass: PrismaCompaniesRepo },
    { provide: DELIVERY_LOGS_REPO, useClass: PrismaDeliveryLogsRepo },

    { provide: DOC_GEN, useClass: DocGenNodeAdapter },
    { provide: HERMES, useClass: HttpHermesAdapter },

    DocGenNodeAdapter,
    HttpHermesAdapter,
  ],
})
export class InvoicesModule { }
