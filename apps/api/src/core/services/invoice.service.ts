import { Inject, Injectable } from '@nestjs/common';
import { COMPANIES_REPO } from '../ports/companies.repo.port';
import { CLIENTS_REPO } from '../ports/clients.repo.port';
import { INVOICES_REPO } from '../ports/invoices.repo.port';
import type { CompaniesRepoPort } from '../ports/companies.repo.port';
import type { ClientsRepoPort } from '../ports/clients.repo.port';
import type {
  InvoicesRepoPort,
  InvoiceListParams,
  InvoiceStatus,
} from '../ports/invoices.repo.port';
import { InvoiceNumberService } from './invoice.number.service';

type NewLine = { description: string; quantity: number; unitPrice: number; vatRate: number };

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(COMPANIES_REPO) private readonly companies: CompaniesRepoPort,
    @Inject(CLIENTS_REPO) private readonly clients: ClientsRepoPort,
    @Inject(INVOICES_REPO) private readonly invoices: InvoicesRepoPort,
    private readonly numbers: InvoiceNumberService,
  ) { }

  async list(userId: string, params: InvoiceListParams) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new Error('NO_COMPANY');
    return this.invoices.list(company.id, params);
  }

  async get(userId: string, id: string) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new Error('NO_COMPANY');
    const invoice = await this.invoices.getById(company.id, id);
    if (!invoice) throw new Error('NOT_FOUND');
    return invoice;
  }

  async create(
    userId: string,
    dto: { clientId?: string | null; issueDate: string; dueDate: string; currency?: string; lines: NewLine[] },
  ) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new Error('NO_COMPANY');

    if (!dto.lines || dto.lines.length === 0) throw new Error('NO_LINES');

    const issue = new Date(dto.issueDate);
    const due = new Date(dto.dueDate);
    if (isNaN(+issue) || isNaN(+due)) throw new Error('BAD_DATES');
    if (due < issue) throw new Error('DUE_BEFORE_ISSUE');

    if (dto.clientId) {
      const client = await this.clients.findByIdForCompany(company.id, dto.clientId);
      if (!client) throw new Error('CLIENT_NOT_FOUND');
    }

    const totals = this.computeTotals(dto.lines);
    const currency = dto.currency || 'EUR';

    const { number } = await this.numbers.allocate(company.id, issue);

    return this.invoices.create(company.id, {
      clientId: dto.clientId ?? null,
      number,
      issueDate: issue,
      dueDate: due,
      currency,
      status: 'DRAFT',
      totals,
      lines: dto.lines,
    });
  }

  async update(
    userId: string,
    id: string,
    dto: {
      clientId?: string | null;
      issueDate?: string;
      dueDate?: string;
      currency?: string;
      status?: InvoiceStatus;
      lines?: NewLine[];
    },
  ) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new Error('NO_COMPANY');

    const existing = await this.invoices.getById(company.id, id);
    if (!existing) throw new Error('NOT_FOUND');

    let issue = existing.issueDate ? new Date(existing.issueDate) : undefined;
    let due = existing.dueDate ? new Date(existing.dueDate) : undefined;

    if (dto.issueDate) issue = new Date(dto.issueDate);
    if (dto.dueDate) due = new Date(dto.dueDate);
    if (issue && isNaN(+issue)) throw new Error('BAD_DATES');
    if (due && isNaN(+due)) throw new Error('BAD_DATES');
    if (issue && due && due < issue) throw new Error('DUE_BEFORE_ISSUE');

    if (dto.clientId !== undefined && dto.clientId !== null) {
      const client = await this.clients.findByIdForCompany(company.id, dto.clientId);
      if (!client) throw new Error('CLIENT_NOT_FOUND');
    }

    let totals: { totalExcl: number; totalVat: number; totalIncl: number } | undefined;
    if (dto.lines) {
      if (dto.lines.length === 0) throw new Error('NO_LINES');
      totals = this.computeTotals(dto.lines);
    }

    return this.invoices.update(company.id, id, {
      clientId: dto.clientId,
      issueDate: issue,
      dueDate: due,
      currency: dto.currency,
      status: dto.status,
      lines: dto.lines,
      totals,
    });
  }

  async remove(userId: string, id: string) {
    const company = await this.companies.findByUserId(userId);
    if (!company) throw new Error('NO_COMPANY');
    const existing = await this.invoices.getById(company.id, id);
    if (!existing) throw new Error('NOT_FOUND');
    await this.invoices.delete(company.id, id);
    return { ok: true };
  }

  private computeTotals(lines: NewLine[]) {
    let totalExcl = 0;
    let totalVat = 0;
    for (const l of lines) {
      const excl = round2(l.quantity * l.unitPrice);
      const vat = round2(excl * (l.vatRate / 100));
      totalExcl = round2(totalExcl + excl);
      totalVat = round2(totalVat + vat);
    }
    const totalIncl = round2(totalExcl + totalVat);
    return { totalExcl, totalVat, totalIncl };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
