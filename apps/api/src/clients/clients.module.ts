import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientService } from '../core/services/client.service';
import { CLIENTS_REPO } from '../core/ports/clients.repo.port';
import { PrismaClientsRepo } from '../infrastructure/adapters/prisma.clients.repo';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [ClientsController],
  providers: [
    ClientService,
    { provide: CLIENTS_REPO, useClass: PrismaClientsRepo },
  ],
})
export class ClientsModule {}
