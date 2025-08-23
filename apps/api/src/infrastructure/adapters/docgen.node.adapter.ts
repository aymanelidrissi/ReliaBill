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

function buildUblXml(invoice: any, company: any, client: any) {
  const cur = esc(invoice.currency || 'EUR');
  const linesXml = (invoice.lines || []).map((ln: any, i: number) => lineXml(ln, i, cur)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
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
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${invoice.totalExcl}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${cur}">${invoice.totalExcl}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${invoice.totalIncl}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${cur}">${invoice.totalIncl}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
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
