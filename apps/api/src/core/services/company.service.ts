import { Inject, Injectable } from '@nestjs/common';
import { COMPANIES_REPO } from '../ports';
import type { CompaniesRepoPort, CreateCompanyData, UpdateCompanyData } from '../ports';

@Injectable()
export class CompanyService {
  constructor(@Inject(COMPANIES_REPO) private readonly companies: CompaniesRepoPort) {}

  async getMine(userId: string) {
    return this.companies.findByUserId(userId);
  }

  async createMine(userId: string, data: CreateCompanyData) {
    const existing = await this.companies.findByUserId(userId);
    if (existing) throw new Error('COMPANY_EXISTS');
    const def = { street: '', city: '', postalCode: '', country: 'BE' };
    return this.companies.createForUser(userId, { ...def, ...data });
  }

  async updateMine(userId: string, data: UpdateCompanyData) {
    const existing = await this.companies.findByUserId(userId);
    if (!existing) throw new Error('NOT_FOUND');
    return this.companies.updateForUser(userId, data);
  }
}
