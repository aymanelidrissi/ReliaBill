export type DocParty = {
  name: string
  vat?: string | null
  street?: string | null
  city?: string | null
  postalCode?: string | null
  countryCode?: string | null
  email?: string | null
  iban?: string | null
  bic?: string | null
}

export type DocLine = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  lineTotalExcl: number
  lineVat: number
}

export type DocTaxSubtotal = {
  rate: number
  taxable: number
  tax: number
}

export type InvoiceDocModel = {
  id: string
  number: string
  issueDate: string
  dueDate: string
  currency: string
  supplier: DocParty
  customer: DocParty
  lines: DocLine[]
  totalExcl: number
  totalVat: number
  totalIncl: number
  taxSubtotals: DocTaxSubtotal[]
}
