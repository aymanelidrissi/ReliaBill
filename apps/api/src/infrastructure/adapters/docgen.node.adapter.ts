import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as fs from 'fs/promises'
import * as path from 'path'
import { InvoiceDocModel, DocParty, DocLine, DocTaxSubtotal } from '../../core/models/invoice-doc.model'
import { round2, toFixed2 } from '../../core/utils/ammounts'

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function normParty(p: any, fallbackName: string): DocParty {
  return {
    name: p?.name || p?.legalName || fallbackName,
    vat: p?.vat ?? null,
    street: p?.street ?? null,
    city: p?.city ?? null,
    postalCode: p?.postalCode ?? null,
    countryCode: p?.country || p?.countryCode || null,
    email: p?.email ?? null,
    iban: p?.iban ?? null,
    bic: p?.bic ?? null
  }
}

function toModel(input: any): InvoiceDocModel {
  if (input && input.number && input.lines && input.supplier && input.customer) return input as InvoiceDocModel
  const inv = input?.invoice ?? input
  const supplierRaw = input?.supplier ?? input?.company ?? {}
  const customerRaw = input?.customer ?? input?.client ?? {}
  const supplier = normParty(supplierRaw, 'Supplier')
  const customer = normParty(customerRaw, 'Customer')
  const lines: DocLine[] = (inv?.lines || []).map((l: any, idx: number) => ({
    id: String(idx + 1),
    description: l.description,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    vatRate: Number(l.vatRate),
    lineTotalExcl: Number(l.lineTotalExcl ?? round2(Number(l.quantity) * Number(l.unitPrice))),
    lineVat: Number(l.lineVat ?? round2((Number(l.lineTotalExcl ?? round2(Number(l.quantity) * Number(l.unitPrice))) * Number(l.vatRate)) / 100))
  }))
  const byRate = new Map<number, { taxable: number; tax: number }>()
  for (const l of lines) {
    const r = Number(l.vatRate)
    const cur = byRate.get(r) || { taxable: 0, tax: 0 }
    cur.taxable = round2(cur.taxable + l.lineTotalExcl)
    cur.tax = round2(cur.tax + l.lineVat)
    byRate.set(r, cur)
  }
  const taxSubtotals: DocTaxSubtotal[] = Array.from(byRate.entries()).map(([rate, v]) => ({ rate, taxable: v.taxable, tax: v.tax }))
  const totalExcl = round2(lines.reduce((a, b) => a + b.lineTotalExcl, 0))
  const totalVat = round2(lines.reduce((a, b) => a + b.lineVat, 0))
  const totalIncl = round2(totalExcl + totalVat)
  return {
    id: inv.id,
    number: inv.number,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    currency: inv.currency || 'EUR',
    supplier,
    customer,
    lines,
    totalExcl,
    totalVat,
    totalIncl,
    taxSubtotals
  }
}

function buildUBL(doc: InvoiceDocModel): string {
  const ns = [
    'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
    'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
    'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"'
  ].join(' ')
  const party = (role: 'AccountingSupplierParty' | 'AccountingCustomerParty', p: DocParty) => {
    const addr = [
      p.street ? `<cbc:StreetName>${xmlEscape(p.street)}</cbc:StreetName>` : '',
      p.postalCode ? `<cbc:PostalZone>${xmlEscape(p.postalCode)}</cbc:PostalZone>` : '',
      p.city ? `<cbc:CityName>${xmlEscape(p.city)}</cbc:CityName>` : '',
      p.countryCode ? `<cac:Country><cbc:IdentificationCode>${xmlEscape(p.countryCode)}</cbc:IdentificationCode></cac:Country>` : ''
    ].join('')
    const tax = p.vat ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(p.vat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''
    const legal = p.name ? `<cac:PartyLegalEntity><cbc:RegistrationName>${xmlEscape(p.name)}</cbc:RegistrationName></cac:PartyLegalEntity>` : ''
    return `<cac:${role}><cac:Party>${tax}${legal}${addr ? `<cac:PostalAddress>${addr}</cac:PostalAddress>` : ''}</cac:Party></cac:${role}>`
  }
  const paymentMeans = doc.supplier.iban
    ? `<cac:PaymentMeans><cbc:PaymentMeansCode>31</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>${xmlEscape(doc.supplier.iban || '')}</cbc:ID>${doc.supplier.bic ? `<cac:FinancialInstitutionBranch><cac:FinancialInstitution><cbc:ID>${xmlEscape(doc.supplier.bic)}</cbc:ID></cac:FinancialInstitution></cac:FinancialInstitutionBranch>` : ''}</cac:PayeeFinancialAccount></cac:PaymentMeans>`
    : ''
  const taxSub = doc.taxSubtotals
    .map(t => `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(t.taxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(t.tax)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${toFixed2(t.rate)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`)
    .join('')
  const lines = doc.lines
    .map((l, i) => {
      return `<cac:InvoiceLine>
<cbc:ID>${i + 1}</cbc:ID>
<cbc:InvoicedQuantity unitCode="H87">${toFixed2(l.quantity)}</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(l.lineTotalExcl)}</cbc:LineExtensionAmount>
<cac:Item><cbc:Name>${xmlEscape(l.description)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${toFixed2(l.vatRate)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
<cac:Price><cbc:PriceAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(l.unitPrice)}</cbc:PriceAmount></cac:Price>
</cac:InvoiceLine>`
    })
    .join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice ${ns}>
<cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:ProfileID>
<cbc:ID>${xmlEscape(doc.number)}</cbc:ID>
<cbc:IssueDate>${xmlEscape(doc.issueDate.substring(0,10))}</cbc:IssueDate>
<cbc:DueDate>${xmlEscape(doc.dueDate.substring(0,10))}</cbc:DueDate>
<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
<cbc:DocumentCurrencyCode>${xmlEscape(doc.currency)}</cbc:DocumentCurrencyCode>
${party('AccountingSupplierParty', doc.supplier)}
${party('AccountingCustomerParty', doc.customer)}
${paymentMeans}
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(doc.totalVat)}</cbc:TaxAmount>
  ${taxSub}
</cac:TaxTotal>
<cac:LegalMonetaryTotal>
  <cbc:LineExtensionAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(doc.totalExcl)}</cbc:LineExtensionAmount>
  <cbc:TaxExclusiveAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(doc.totalExcl)}</cbc:TaxExclusiveAmount>
  <cbc:TaxInclusiveAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(doc.totalIncl)}</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="${xmlEscape(doc.currency)}">${toFixed2(doc.totalIncl)}</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
${lines}
</Invoice>`
  return xml
}

async function buildPDF(doc: InvoiceDocModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const draw = (text: string, x: number, y: number, bold = false, size = 11) => {
    page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) })
  }
  let y = 800
  draw('Invoice', 50, y, true, 16); y -= 20
  draw(doc.number, 50, y); y -= 14
  draw(`Issue: ${doc.issueDate.substring(0,10)}  Due: ${doc.dueDate.substring(0,10)}`, 50, y); y -= 24
  draw('From', 50, y, true); draw('To', 300, y, true); y -= 14
  const s = doc.supplier; const c = doc.customer
  draw(s.name || '', 50, y); draw(c.name || '', 300, y); y -= 12
  draw(`${s.street || ''}`, 50, y); draw(`${c.street || ''}`, 300, y); y -= 12
  draw(`${s.postalCode || ''} ${s.city || ''} ${s.countryCode || ''}`, 50, y); draw(`${c.postalCode || ''} ${c.city || ''} ${c.countryCode || ''}`, 300, y); y -= 12
  draw(`VAT: ${s.vat || ''}`, 50, y); draw(`VAT: ${c.vat || ''}`, 300, y); y -= 20
  draw('Qty', 50, y, true); draw('Description', 90, y, true); draw('Unit', 360, y, true); draw('VAT%', 430, y, true); draw('Line Excl', 480, y, true); y -= 12
  doc.lines.forEach(l => {
    draw(toFixed2(l.quantity), 50, y)
    draw(l.description, 90, y)
    draw(toFixed2(l.unitPrice), 360, y)
    draw(toFixed2(l.vatRate), 430, y)
    draw(toFixed2(l.lineTotalExcl), 480, y)
    y -= 12
  })
  y -= 8
  draw('Tax breakdown', 50, y, true); y -= 12
  doc.taxSubtotals.forEach(t => { draw(`${toFixed2(t.rate)}% on ${toFixed2(t.taxable)} = ${toFixed2(t.tax)}`, 50, y); y -= 12 })
  y -= 8
  draw(`Subtotal: ${toFixed2(doc.totalExcl)}`, 400, y); y -= 12
  draw(`VAT: ${toFixed2(doc.totalVat)}`, 400, y); y -= 12
  draw(`Total: ${toFixed2(doc.totalIncl)}`, 400, y, true); y -= 20
  if (s.iban) draw(`Payment IBAN: ${s.iban}${s.bic ? `  BIC: ${s.bic}` : ''}`, 50, y)
  return await pdf.save()
}

export class NodeDocGenAdapter {
  async generate(input: any): Promise<{ pdfPath: string; xmlPath: string }> {
    const doc = toModel(input)
    const root = process.env.DOCS_DIR || 'storage'
    const dir = path.join(root, 'invoices', doc.id)
    await fs.mkdir(dir, { recursive: true })
    const xml = buildUBL(doc)
    const xmlPath = path.join(dir, `${doc.id}.xml`)
    await fs.writeFile(xmlPath, xml, 'utf8')
    const pdfBytes = await buildPDF(doc)
    const pdfPath = path.join(dir, `${doc.id}.pdf`)
    await fs.writeFile(pdfPath, pdfBytes)
    const relXml = path.relative(process.cwd(), xmlPath).replace(/\\/g, '/')
    const relPdf = path.relative(process.cwd(), pdfPath).replace(/\\/g, '/')
    return { pdfPath: relPdf, xmlPath: relXml }
  }
}
