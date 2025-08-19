export interface CompanyEntity {
  id: string;
  userId: string;
  legalName: string;
  vat: string;
  iban: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCompanyData = Pick<CompanyEntity, 'legalName' | 'vat' | 'iban' | 'street' | 'city' | 'postalCode' | 'country'>;
export type UpdateCompanyData = Partial<CreateCompanyData>;

export interface CompaniesRepoPort {
  findByUserId(userId: string): Promise<CompanyEntity | null>;
  createForUser(userId: string, data: CreateCompanyData): Promise<CompanyEntity>;
  updateForUser(userId: string, data: UpdateCompanyData): Promise<CompanyEntity>;
}

export const COMPANIES_REPO = Symbol('COMPANIES_REPO');
