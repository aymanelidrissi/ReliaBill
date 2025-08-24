export const INVOICES_REPO = Symbol('INVOICES_REPO');

export type InvoiceStatus = 'DRAFT' | 'READY' | 'SENT' | 'DELIVERED' | 'FAILED';

export type InvoiceLineData = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotalExcl: number;
  lineVat: number;
};

export type InvoiceRecord = {
  id: string;
  companyId: string;
  clientId: string | null;
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalExcl: number;
  totalVat: number;
  totalIncl: number;
  status: InvoiceStatus;
  xmlPath: string | null;
  pdfPath: string | null;
  hermesMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  lines: InvoiceLineData[];
};

export type CreateInvoiceData = {
  clientId?: string | null;
  number: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  status: InvoiceStatus;
  totals: { totalExcl: number; totalVat: number; totalIncl: number };
  lines: Omit<InvoiceLineData, 'lineTotalExcl' | 'lineVat'>[];
};

export type UpdateInvoiceData = {
  clientId?: string | null;
  issueDate?: Date;
  dueDate?: Date;
  currency?: string;
  status?: InvoiceStatus;
  lines?: Omit<InvoiceLineData, 'lineTotalExcl' | 'lineVat'>[];
  totals?: { totalExcl: number; totalVat: number; totalIncl: number };
  pdfPath?: string | null;
  xmlPath?: string | null;
  hermesMessageId?: string | null;
};

export type InvoiceListParams = {
  page: number;
  limit: number;
  query?: string;
  status?: InvoiceStatus;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type InvoiceListResult = {
  items: InvoiceRecord[];
  total: number;
  page: number;
  limit: number;
};

export interface InvoicesRepoPort {
  countForYear(companyId: string, year: number): Promise<number>;
  list(companyId: string, params: InvoiceListParams): Promise<InvoiceListResult>;
  getById(companyId: string, id: string): Promise<InvoiceRecord | null>;
  getByHermesMessageId(messageId: string): Promise<InvoiceRecord | null>;
  create(companyId: string, data: CreateInvoiceData): Promise<InvoiceRecord>;
  update(companyId: string, id: string, data: UpdateInvoiceData): Promise<InvoiceRecord>;
  delete(companyId: string, id: string): Promise<void>;
}
