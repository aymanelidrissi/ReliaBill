import { Injectable } from '@nestjs/common';
import { DocGenPort } from '../../core/ports/docgen.port';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function esc(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ymd(d: string) {
  return new Date(d).toISOString().slice(0, 10);
}

function ymdCompact(d: string) {
  return ymd(d).replace(/-/g, '');
}

function lineXml(ln: any, i: number, cur: string) {
  return `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity>${ln.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${cur}">${ln.lineTotalExcl}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${esc(ln.description || '')}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${cur}">${ln.unitPrice}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`.trim();
}

function buildTaxXml(lines: any[], cur: string) {
  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const ln of lines || []) {
    const r = Number(ln.vatRate) || 0;
    const a = byRate.get(r) || { taxable: 0, tax: 0 };
    a.taxable += Number(ln.lineTotalExcl) || 0;
    a.tax += Number(ln.lineVat) || 0;
    byRate.set(r, a);
  }
  const subs = Array.from(byRate.entries())
    .map(([rate, v]) => `
  <cac:TaxSubtotal>
    <cbc:TaxableAmount currencyID="${cur}">${Number(v.taxable)}</cbc:TaxableAmount>
    <cbc:TaxAmount currencyID="${cur}">${Number(v.tax)}</cbc:TaxAmount>
    <cac:TaxCategory>
      <cbc:Percent>${rate}</cbc:Percent>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>`.trim())
    .join('\n');
  const total = Array.from(byRate.values()).reduce((s, v) => s + Number(v.tax), 0);
  return `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cur}">${Number(total)}</cbc:TaxAmount>
${subs ? subs : ''}
  </cac:TaxTotal>`.trim();
}

function paymentMeansXml(company: any) {
  const iban = company?.iban;
  const bic = company?.bic;
  if (!iban) return '';
  return `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>31</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${esc(iban)}</cbc:ID>
      ${bic ? `<cac:FinancialInstitutionBranch><cac:FinancialInstitution><cbc:ID>${esc(bic)}</cbc:ID></cac:FinancialInstitution></cac:FinancialInstitutionBranch>` : ''}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`.trim();
}

function buildUblXml(invoice: any, company: any, client: any) {
  const cur = esc(invoice.currency || 'EUR');
  const linesXml = (invoice.lines || []).map((ln: any, i: number) => lineXml(ln, i, cur)).join('\n');
  const taxXml = buildTaxXml(invoice.lines || [], cur);
  const payXml = paymentMeansXml(company);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:ProfileID>
  <cbc:ID>${esc(invoice.number)}</cbc:ID>
  <cbc:IssueDate>${ymdCompact(invoice.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${ymdCompact(invoice.dueDate)}</cbc:DueDate>
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(company.legalName || '')}</cbc:Name></cac:PartyName>
      ${company.vat ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(company.vat)}</cbc:CompanyID></cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(client.name || '')}</cbc:Name></cac:PartyName>
      ${client.vat ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(client.vat)}</cbc:CompanyID></cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
${taxXml}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${invoice.totalExcl}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${cur}">${invoice.totalExcl}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${invoice.totalIncl}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${cur}">${invoice.totalIncl}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${payXml}
${linesXml}
</Invoice>`.trim();
}

@Injectable()
export class NodeDocGenAdapter implements DocGenPort {
  async renderPdf({ invoice, company, client, outPath }: any) {
    ensureDir(path.dirname(outPath));
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const draw = (text: string, x: number, y: number, size = 12) =>
      page.drawText(String(text ?? ''), { x, y, size, font, color: rgb(0, 0, 0) });

    draw(company.legalName || 'Company', 40, 800, 16);
    if (company.vat) draw(`VAT: ${company.vat}`, 40, 780);
    if (company.street) draw(`${company.street}, ${company.postalCode ?? ''} ${company.city ?? ''}`, 40, 765);

    draw(`Invoice ${invoice.number}`, 400, 800, 16);
    draw(`Issue: ${ymd(invoice.issueDate)}`, 400, 780);
    draw(`Due:   ${ymd(invoice.dueDate)}`, 400, 765);

    draw('Bill To:', 40, 730, 12);
    draw(client.name || 'Client', 40, 715);
    if (client.vat) draw(`VAT: ${client.vat}`, 40, 700);
    if (client.street) draw(`${client.street}, ${client.postalCode ?? ''} ${client.city ?? ''}`, 40, 685);

    let y = 650;
    draw('Description', 40, y); draw('Qty', 320, y); draw('Unit', 360, y); draw('VAT%', 420, y); draw('Line', 470, y);
    y -= 15;
    for (const ln of invoice.lines || []) {
      draw(`${ln.description}`, 40, y);
      draw(`${ln.quantity}`, 320, y);
      draw(`${ln.unitPrice}`, 360, y);
      draw(`${ln.vatRate}`, 420, y);
      draw(`${ln.lineTotalExcl}`, 470, y);
      y -= 15;
      if (y < 100) break;
    }

    y -= 10;
    draw(`Total excl: ${invoice.totalExcl} ${invoice.currency || 'EUR'}`, 400, y); y -= 15;
    draw(`VAT:        ${invoice.totalVat}`, 400, y); y -= 15;
    draw(`Total incl: ${invoice.totalIncl}`, 400, y);

    const bytes = await pdf.save();
    fs.writeFileSync(outPath, bytes);
  }

  async renderUbl({ invoice, company, client, outPath }: any) {
    ensureDir(path.dirname(outPath));
    const xml = buildUblXml(invoice, company, client);
    fs.writeFileSync(outPath, xml);
  }
}
