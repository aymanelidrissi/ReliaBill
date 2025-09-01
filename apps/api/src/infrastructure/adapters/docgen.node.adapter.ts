import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';
import type { InvoiceDocModel, DocParty, DocLine, DocTaxSubtotal } from '../../core/models/invoice-doc.model';
import { round2, toFixed2 } from '../../core/utils/amounts';

const xmlEscape = (s: string) =>
  (s ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const fmtDate = (d: string | Date) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);

function normParty(
  p: any,
  fallbackName: string
): DocParty & { peppolId?: string | null; peppolScheme?: string | null } {
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
    peppolId: p?.peppolId ?? null,
    peppolScheme: p?.peppolScheme ?? null,
  };
}

function toModel(input: { invoice: any; company: any; client: any }): InvoiceDocModel {
  const inv = input.invoice || {};
  const supplier = {
    ...normParty(input.company, 'Supplier'),
    peppolId: input.company?.peppolId ?? process.env.SUPPLIER_PEPPOL_ID ?? null,
    peppolScheme: input.company?.peppolScheme ?? process.env.SUPPLIER_PEPPOL_SCHEME ?? 'iso6523-actorid-upis',
  };
  const customer = {
    ...normParty(input.client, 'Customer'),
    peppolId: input.client?.peppolId ?? null,
    peppolScheme: input.client?.peppolScheme ?? 'iso6523-actorid-upis',
  };

  const lines: DocLine[] = (inv.lines || []).map((l: any, i: number) => ({
    id: String(i + 1),
    description: l.description,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    vatRate: Number(l.vatRate),
  }));

  let totalExcl = 0;
  for (const l of lines) totalExcl = round2(totalExcl + round2(l.quantity * l.unitPrice));

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

function normalizeEas(input: { scheme?: string; id?: string }) {
  const rawId = (input.id ?? '').trim();
  const rawScheme = (input.scheme ?? '').trim();
  const prefixed = rawId.match(/^(\d{4}):(.+)$/);
  if (prefixed) return { scheme: prefixed[1], id: prefixed[2] };
  if (/^\d{4}$/.test(rawScheme)) {
    return { scheme: rawScheme, id: rawId.replace(/^\d{4}:/, '') };
  }
  // Unknown/blank scheme: leave out
  return { scheme: '', id: rawId.replace(/^\d{4}:/, '') };
}

function endpointIdXML(p: { peppolId?: string | null; peppolScheme?: string | null }): string {
  const id = p?.peppolId ?? '';
  if (!id) return '';
  const { scheme, id: val } = normalizeEas({ scheme: p?.peppolScheme ?? undefined, id });
  return scheme && val
    ? `<cbc:EndpointID schemeID="${xmlEscape(scheme)}">${xmlEscape(val)}</cbc:EndpointID>`
    : '';
}

function sanitizeWinAnsi(s: string): string {
  if (!s) return '';
  let out = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  out = out
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/€/g, 'EUR')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  return out;
}

function drawTextSafe(page: any, font: PDFFont, text: string, x: number, y: number, size: number) {
  page.drawText(sanitizeWinAnsi(text ?? ''), { x, y, size, font, color: rgb(0, 0, 0) });
}

function drawTextRight(page: any, font: PDFFont, text: string, rightX: number, y: number, size: number) {
  const s = sanitizeWinAnsi(text ?? '');
  const w = font.widthOfTextAtSize(s, size);
  page.drawText(s, { x: rightX - w, y, size, font, color: rgb(0, 0, 0) });
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = sanitizeWinAnsi(text ?? '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(w, size) <= maxWidth) {
        line = w;
      } else {
        let cur = '';
        for (const ch of w.split('')) {
          const nxt = cur + ch;
          if (font.widthOfTextAtSize(nxt, size) <= maxWidth) cur = nxt;
          else {
            if (cur) lines.push(cur);
            cur = ch;
          }
        }
        line = cur;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function toAbsolute(pth: string): string {
  if (!pth) return '';
  if (path.isAbsolute(pth)) return pth;
  const cwd = process.cwd();
  const appsApi = path.resolve(cwd, 'apps', 'api');
  const candidates = [path.resolve(cwd, pth), path.resolve(appsApi, pth), path.resolve(cwd, 'apps', 'api', pth)];
  for (const c of candidates) if (fssync.existsSync(c)) return c;
  return path.resolve(candidates[0]);
}

async function readLogo(): Promise<Uint8Array | null> {
  const env = process.env.DOCGEN_LOGO_PATH;
  if (!env) return null;
  try {
    const abs = toAbsolute(env);
    const buf = await fs.readFile(abs);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } catch {
    return null;
  }
}

function paymentMeansXML(p: DocParty): string {
  if (!p?.iban) return '';
  const bic = p.bic
    ? `<cac:FinancialInstitutionBranch><cbc:ID>${xmlEscape(p.bic)}</cbc:ID></cac:FinancialInstitutionBranch>`
    : '';
  return `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID schemeID="IBAN">${xmlEscape(p.iban)}</cbc:ID>
      ${bic}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`;
}

function buildUBL(doc: InvoiceDocModel): string {
  const party = (
    p: DocParty & { peppolId?: string | null; peppolScheme?: string | null },
    role: 'AccountingSupplierParty' | 'AccountingCustomerParty'
  ) => `
  <cac:${role}>
    <cac:Party>
      ${endpointIdXML(p)}
      <cac:PartyName><cbc:Name>${xmlEscape(p.name)}</cbc:Name></cac:PartyName>

      <cac:PostalAddress>
        ${p.street ? `<cbc:StreetName>${xmlEscape(p.street)}</cbc:StreetName>` : ''}
        ${p.city ? `<cbc:CityName>${xmlEscape(p.city)}</cbc:CityName>` : ''}
        ${p.postalCode ? `<cbc:PostalZone>${xmlEscape(p.postalCode)}</cbc:PostalZone>` : ''}
        <cac:Country><cbc:IdentificationCode>${xmlEscape(p.countryCode || 'BE')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>

      ${p.vat ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(p.vat)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}

      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(p.name)}</cbc:RegistrationName>
        ${p.vat ? `<cbc:CompanyID>${xmlEscape(p.vat)}</cbc:CompanyID>` : ''}
      </cac:PartyLegalEntity>

      ${p.email ? `<cac:Contact><cbc:ElectronicMail>${xmlEscape(p.email)}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:${role}>`;

  const itemName = (raw: string | undefined | null, index1: number): string => {
    const base = (raw ?? '').toString().trim().replace(/\s+/g, ' ');
    const name = base.length ? base.slice(0, 120) : `Item ${index1}`;
    return xmlEscape(name);
  };

  const lines = doc.lines
    .map(
      (l, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${toFixed2(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${doc.currency}">${toFixed2(round2(l.quantity * l.unitPrice))}</cbc:LineExtensionAmount>
    <cac:Item>
      ${l.description ? `<cbc:Description>${xmlEscape(l.description)}</cbc:Description>` : ''}
      <cbc:Name>${itemName(l.description, i + 1)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${toFixed2(l.vatRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${doc.currency}">${toFixed2(l.unitPrice)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`
    )
    .join('');

  const subtotals = doc.taxSubtotals
    .map(
      (t) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${doc.currency}">${toFixed2(t.taxable)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${doc.currency}">${toFixed2(t.tax)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${toFixed2(t.rate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
    )
    .join('');

  const taxTotalBlock = `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${doc.currency}">${toFixed2(doc.totalVat)}</cbc:TaxAmount>
    ${subtotals}
  </cac:TaxTotal>`;

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
  ${paymentMeansXML(doc.supplier)}
  ${taxTotalBlock}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${doc.currency}">${toFixed2(doc.totalExcl)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${doc.currency}">${toFixed2(doc.totalExcl)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${doc.currency}">${toFixed2(doc.totalIncl)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${doc.currency}">${toFixed2(doc.totalIncl)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</Invoice>`;
}

async function buildPDF(doc: InvoiceDocModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readLogo();
  const { width } = page.getSize();

  let y = 812;

  if (logoBytes) {
    try {
      const img = await pdf.embedJpg(logoBytes).catch(async () => await pdf.embedPng(logoBytes));
      const h = 40;
      const scale = h / img.height;
      const w = img.width * scale;
      const x = width - 40 - w;
      page.drawImage(img, { x, y: y - h, width: w, height: h });
    } catch { }
  }

  drawTextSafe(page, bold, `Invoice ${doc.number}`, 40, y - 18, 18);
  drawTextSafe(page, font, `Issue: ${doc.issueDate}   Due: ${doc.dueDate}`, 40, y - 36, 11);
  y -= 56;

  const leftX = 40;
  const rightX = width / 2 + 10;

  drawTextSafe(page, bold, 'Supplier', leftX, y, 12);
  drawTextSafe(page, bold, 'Bill To', rightX, y, 12);
  y -= 14;

  const leftLines = [
    doc.supplier.name,
    doc.supplier.vat ? `VAT: ${doc.supplier.vat}` : '',
    [doc.supplier.street, doc.supplier.postalCode, doc.supplier.city].filter(Boolean).join(' '),
  ].filter(Boolean);

  const rightLines = [
    doc.customer.name,
    doc.customer.vat ? `VAT: ${doc.customer.vat}` : '',
    [doc.customer.street, doc.customer.postalCode, doc.customer.city].filter(Boolean).join(' '),
  ].filter(Boolean);

  const rows = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < rows; i++) {
    if (leftLines[i]) drawTextSafe(page, font, leftLines[i], leftX, y, 11);
    if (rightLines[i]) drawTextSafe(page, font, rightLines[i], rightX, y, 11);
    y -= 14;
  }
  y -= 8;

  const colQtyX = 40;
  const colDescX = 90;
  const colUnitRight = 440;
  const colVatRight = 500;
  const colLineRight = width - 40;
  const descWidth = colUnitRight - colDescX - 12;

  drawTextSafe(page, bold, 'Qty', colQtyX, y, 11);
  drawTextSafe(page, bold, 'Description', colDescX, y, 11);
  drawTextRight(page, bold, 'PPU', colUnitRight, y, 11);
  drawTextRight(page, bold, 'VAT %', colVatRight, y, 11);
  drawTextRight(page, bold, 'Line Excl', colLineRight, y, 11);

  y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 12;

  for (const l of doc.lines) {
    const excl = round2(l.quantity * l.unitPrice);
    const descLines = wrapText(font, l.description || '', 11, descWidth);

    drawTextSafe(page, font, toFixed2(l.quantity), colQtyX, y, 11);
    drawTextRight(page, font, toFixed2(l.unitPrice), colUnitRight, y, 11);
    drawTextRight(page, font, toFixed2(l.vatRate), colVatRight, y, 11);
    drawTextRight(page, font, toFixed2(excl), colLineRight, y, 11);
    drawTextSafe(page, font, descLines[0], colDescX, y, 11);

    if (descLines.length > 1) {
      for (let i = 1; i < descLines.length; i++) {
        y -= 14;
        drawTextSafe(page, font, descLines[i], colDescX, y, 11);
      }
    }
    y -= 18;
  }

  y -= 4;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 14;

  const totalsRight = colLineRight;
  const totalsLabelX = colDescX;
  const rowHeight = 32;
  const amountOffset = 16;

  const drawTotalRow = (label: string, value: string, emphasize = false) => {
    const lf = emphasize ? bold : font;
    const rf = emphasize ? bold : font;
    drawTextSafe(page, lf, label, totalsLabelX, y, emphasize ? 13 : 12);
    drawTextRight(page, rf, value, totalsRight, y - amountOffset, emphasize ? 13 : 12);
    y -= rowHeight;
  };

  drawTotalRow('Total excl:', `${toFixed2(doc.totalExcl)} ${doc.currency}`);
  drawTotalRow('Total VAT:', `${toFixed2(doc.totalVat)} ${doc.currency}`);
  drawTotalRow('Total incl:', `${toFixed2(doc.totalIncl)} ${doc.currency}`, true);

  return pdf.save();
}

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
