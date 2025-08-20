import { Inject, Injectable } from '@nestjs/common';
import { CLIENTS_REPO, COMPANIES_REPO } from '../ports';
import type { ClientsRepoPort, CreateClientData, UpdateClientData, ListOptions } from '../ports';
import type { CompaniesRepoPort } from '../ports';

@Injectable()
export class ClientService {
  constructor(
    @Inject(COMPANIES_REPO) private readonly companies: CompaniesRepoPort,
    @Inject(CLIENTS_REPO) private readonly clients: ClientsRepoPort,
  ) {}

  private async getCompanyId(userId: string) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new Error('NO_COMPANY');
    return company.id;
  }

  async list(userId: string, opts: ListOptions) {
    const companyId = await this.getCompanyId(userId);
    return this.clients.listByCompany(companyId, opts);
  }

  async get(userId: string, id: string) {
    const companyId = await this.getCompanyId(userId);
    const cli = await this.clients.findByIdForCompany(companyId, id);
    if (!cli) throw new Error('NOT_FOUND');
    return cli;
  }

  async create(userId: string, data: CreateClientData) {
    const companyId = await this.getCompanyId(userId);
    return this.clients.create(companyId, data);
  }

  async update(userId: string, id: string, data: UpdateClientData) {
    await this.get(userId, id);
    const companyId = await this.getCompanyId(userId);
    return this.clients.update(companyId, id, data);
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    const companyId = await this.getCompanyId(userId);
    await this.clients.delete(companyId, id);
    return { ok: true };
  }
}
