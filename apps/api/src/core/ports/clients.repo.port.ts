export interface ClientEntity {
  id: string;
  companyId: string;
  name: string;
  vat: string | null;
  email: string | null;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateClientData = {
  name: string;
  vat?: string | null;
  email?: string | null;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

export type UpdateClientData = Partial<CreateClientData>;

export interface ListOptions {
  query?: string;
  page?: number;
  limit?: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientsRepoPort {
  listByCompany(companyId: string, opts: ListOptions): Promise<ListResult<ClientEntity>>;
  findByIdForCompany(companyId: string, id: string): Promise<ClientEntity | null>;
  create(companyId: string, data: CreateClientData): Promise<ClientEntity>;
  update(companyId: string, id: string, data: UpdateClientData): Promise<ClientEntity>;
  delete(companyId: string, id: string): Promise<void>;
}

export const CLIENTS_REPO = Symbol('CLIENTS_REPO');
