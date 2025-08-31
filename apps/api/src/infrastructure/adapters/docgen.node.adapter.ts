import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { InvoiceDocModel, DocParty, DocLine, DocTaxSubtotal } from '../../core/models/invoice-doc.model';
import { round2, toFixed2 } from '../../core/utils/amounts';

/** XML-safe text */
const xmlEscape = (s: string) =>
  (s ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const fmtDate = (d: string | Date) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);

function normParty(p: any, fallbackName: string): DocParty {
  return {
    name: p?.name || p?.legalName || fallbackName,
    vat: p?.vat ?? null,
    street: p?.street ?? null,
    city: p?.city ?? null,
    postalCode: p?.postalCode ?? null,
    countryCode: p?.country || p?.countryCode || 'BE',
    email: p?.email ?? null,
    iban: p?.iban ?? null,
    bic: p?.bic ?? null,
  };
}

function toModel(input: { invoice: any; company: any; client: any }): InvoiceDocModel {
  const inv = input.invoice || {};
  const supplier = normParty(input.company, 'Supplier');
  const customer = normParty(input.client, 'Customer');

  const lines: DocLine[] = (inv.lines || []).map((l: any, i: number) => ({
    id: String(i + 1),
    description: l.description,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    vatRate: Number(l.vatRate),
  }));

  // Totals
  let totalExcl = 0;
  for (const l of lines) totalExcl = round2(totalExcl + round2(l.quantity * l.unitPrice));

  // Per-rate taxable & tax (DocTaxSubtotal = { rate, taxable, tax })
  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const l of lines) {
    const excl = round2(l.quantity * l.unitPrice);
    const tax = round2(excl * (l.vatRate / 100));
    const prev = byRate.get(l.vatRate) ?? { taxable: 0, tax: 0 };
    byRate.set(l.vatRate, { taxable: round2(prev.taxable + excl), tax: round2(prev.tax + tax) });
  }
  const taxSubtotals: DocTaxSubtotal[] = [...byRate.entries()].map(([rate, v]) => ({
    rate,
    taxable: round2(v.taxable),
    tax: round2(v.tax),
  }));
  const totalVat = round2(taxSubtotals.reduce((s, t) => s + t.tax, 0));
  const totalIncl = round2(totalExcl + totalVat);

  return {
    id: inv.id || inv.invoiceId || 'INV',
    number: inv.number || '0001',
    issueDate: fmtDate(inv.issueDate || new Date()),
    dueDate: fmtDate(inv.dueDate || new Date()),
    currency: inv.currency || 'EUR',
    supplier,
    customer,
    lines,
    totalExcl,
    totalVat,
    totalIncl,
    taxSubtotals,
  };
}


// PDF helpers: WinAnsi sanitization


function sanitizeForWinAnsi(s: string): string {
  if (!s) return '';

  let out = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  out = out
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/€/g, 'EUR');

    out = out.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  return out;
}

function drawSafeText(opts: {
  page: any;
  text: string;
  x: number;
  y: number;
  size: number;
  font: PDFFont;
}) {
  const t = sanitizeForWinAnsi(opts.text ?? '');
  opts.page.drawText(t, { x: opts.x, y: opts.y, size: opts.size, font: opts.font, color: rgb(0, 0, 0) });
}

/* ---------------- UBL/XML Builder ---------------- */

function paymentMeansXML(p: DocParty): string {
  if (!p?.iban) return '';
  const bic = p.bic ? `<cac:FinancialInstitutionBranch><cbc:ID>${xmlEscape(p.bic)}</cbc:ID></cac:FinancialInstitutionBranch>` : '';
  return `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>31</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${xmlEscape(p.iban)}</cbc:ID>
      ${bic}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`;
}

function paymentTermsXML(dueDate: string): string {
  const note = `Pay by ${dueDate}`;
  return `
  <cac:PaymentTerms>
    <cbc:Note>${xmlEscape(note)}</cbc:Note>
  </cac:PaymentTerms>`;
}

function buildUBL(doc: InvoiceDocModel): string {
  const party = (p: DocParty, role: 'AccountingSupplierParty' | 'AccountingCustomerParty') => `
  <cac:${role}>
    <cac:Party>
      <cac:PartyName><cbc:Name>${xmlEscape(p.name)}</cbc:Name></cac:PartyName>
      ${p.vat ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(p.vat)}</cbc:CompanyID></cac:PartyTaxScheme>` : ''}
      <cac:PostalAddress>
        ${p.street ? `<cbc:StreetName>${xmlEscape(p.street)}</cbc:StreetName>` : ''}
        ${p.city ? `<cbc:CityName>${xmlEscape(p.city)}</cbc:CityName>` : ''}
        ${p.postalCode ? `<cbc:PostalZone>${xmlEscape(p.postalCode)}</cbc:PostalZone>` : ''}
        <cbc:CountrySubentity></cbc:CountrySubentity>
        <cac:Country><cbc:IdentificationCode>${xmlEscape(p.countryCode || 'BE')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${p.email ? `<cac:Contact><cbc:ElectronicMail>${xmlEscape(p.email)}</cbc:ElectronicMail></cac:Contact>` : ''}
      ${p.iban
      ? `<cac:PartyFinancialAccount><cbc:ID>${xmlEscape(p.iban)}</cbc:ID>${p.bic
        ? `<cac:FinancialInstitutionBranch><cbc:ID>${xmlEscape(p.bic)}</cbc:ID></cac:FinancialInstitutionBranch>`
        : ''
      }</cac:PartyFinancialAccount>`
      : ''
    }
    </cac:Party>
  </cac:${role}>`;

  const lines = doc.lines
    .map(
      (l, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity>${toFixed2(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${doc.currency}">${toFixed2(round2(l.quantity * l.unitPrice))}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${xmlEscape(l.description)}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${doc.currency}">${toFixed2(l.unitPrice)}</cbc:PriceAmount></cac:Price>
    <cac:TaxTotal>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${doc.currency}">${toFixed2(round2(l.quantity * l.unitPrice))}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${doc.currency}">${toFixed2(round2(l.quantity * l.unitPrice) * (l.vatRate / 100))}</cbc:TaxAmount>
        <cac:TaxCategory><cbc:Percent>${toFixed2(l.vatRate)}</cbc:Percent></cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
  </cac:InvoiceLine>`,
    )
    .join('');

  const subtotals = doc.taxSubtotals
    .map(
      (t) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${doc.currency}">${toFixed2(t.taxable)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${doc.currency}">${toFixed2(t.tax)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:Percent>${toFixed2(t.rate)}</cbc:Percent></cac:TaxCategory>
    </cac:TaxSubtotal>`,
    )
    .join('');

  const payMeans = paymentMeansXML(doc.supplier);
  const payTerms = paymentTermsXML(doc.dueDate);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(doc.number)}</cbc:ID>
  <cbc:IssueDate>${doc.issueDate}</cbc:IssueDate>
  <cbc:DueDate>${doc.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${xmlEscape(doc.currency)}</cbc:DocumentCurrencyCode>
  ${party(doc.supplier, 'AccountingSupplierParty')}
  ${party(doc.customer, 'AccountingCustomerParty')}
  ${payMeans}
  ${payTerms}
  <cac:TaxTotal>
    ${subtotals}
    <cbc:TaxAmount currencyID="${doc.currency}">${toFixed2(doc.totalVat)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${doc.currency}">${toFixed2(doc.totalExcl)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${doc.currency}">${toFixed2(doc.totalExcl)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${doc.currency}">${toFixed2(doc.totalIncl)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${doc.currency}">${toFixed2(doc.totalIncl)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</Invoice>`;
}

/* ---------------- PDF Builder ---------------- */

async function buildPDF(doc: InvoiceDocModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { width } = page.getSize();

  let y = 800;
  const line = (t: string, size = 12) => {
    drawSafeText({ page, text: t, x: 40, y, size, font });
    y -= size + 6;
  };

  line(`Invoice ${doc.number}`, 18);
  line(`Issue: ${doc.issueDate}   Due: ${doc.dueDate}`);
  line('');
  line(`Supplier: ${doc.supplier.name}`);
  if (doc.supplier.vat) line(`VAT: ${doc.supplier.vat}`);
  line(`${doc.supplier.street ?? ''} ${doc.supplier.postalCode ?? ''} ${doc.supplier.city ?? ''}`);
  line('');
  line(`Bill To: ${doc.customer.name}`);
  if (doc.customer.vat) line(`VAT: ${doc.customer.vat}`);
  line(`${doc.customer.street ?? ''} ${doc.customer.postalCode ?? ''} ${doc.customer.city ?? ''}`);
  line('');

  line('Qty   Description                           Unit     VAT%    Line Excl');
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 8;

  for (const l of doc.lines) {
    const excl = round2(l.quantity * l.unitPrice);
    const desc = (l.description ?? '').slice(0, 35);
    const row = `${toFixed2(l.quantity).padStart(4)}  ${desc.padEnd(35)}  ${toFixed2(l.unitPrice).padStart(7)}  ${toFixed2(
      l.vatRate,
    ).padStart(5)}  ${toFixed2(excl).padStart(10)}`;
    line(row);
  }

  y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 12;
  line(`Total excl: ${toFixed2(doc.totalExcl)} ${doc.currency}`);
  line(`Total VAT : ${toFixed2(doc.totalVat)} ${doc.currency}`);
  line(`Total incl: ${toFixed2(doc.totalIncl)} ${doc.currency}`);

  return pdf.save();
}

/* ---------------- Adapter ---------------- */

export class DocGenNodeAdapter {
  private async ensureDirFor(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  async renderUbl(input: { invoice: any; company: any; client: any; outPath: string }): Promise<void> {
    const { outPath } = input;
    if (!outPath) throw new Error('renderUbl: outPath required');
    const model = toModel(input);
    const xml = buildUBL(model);
    await this.ensureDirFor(outPath);
    await fs.writeFile(outPath, xml, 'utf8');
  }

  async renderPdf(input: { invoice: any; company: any; client: any; outPath: string }): Promise<void> {
    const { outPath } = input;
    if (!outPath) throw new Error('renderPdf: outPath required');
    const model = toModel(input);
    const pdfBytes = await buildPDF(model);
    await this.ensureDirFor(outPath);
    await fs.writeFile(outPath, pdfBytes);
  }
}
