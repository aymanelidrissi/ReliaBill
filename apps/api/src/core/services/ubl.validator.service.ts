import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';

type ValidationResult = { ok: boolean; errors: string[] };

@Injectable()
export class UblValidatorService {
  async validateFile(xmlPath: string): Promise<ValidationResult> {
    const xml = await fs.readFile(xmlPath, 'utf8');
    return this.validateString(xml);
  }

  async validateString(xml: string): Promise<ValidationResult> {
    const errs: string[] = [];
    const need = (tag: RegExp, name: string) => {
      if (!tag.test(xml)) errs.push(`missing ${name}`);
    };

    need(/<Invoice[\s>]/, 'Invoice root');
    need(/<cbc:CustomizationID>.*en16931.*<\/cbc:CustomizationID>/i, 'cbc:CustomizationID en16931');
    need(/<cbc:ProfileID>.*billing:3\.0.*<\/cbc:ProfileID>/i, 'cbc:ProfileID BIS Billing 3.0');
    need(/<cbc:ID>.*<\/cbc:ID>/, 'cbc:ID');
    need(/<cbc:IssueDate>\d{4}-\d{2}-\d{2}<\/cbc:IssueDate>/, 'cbc:IssueDate');
    need(/<cbc:DocumentCurrencyCode>.*<\/cbc:DocumentCurrencyCode>/, 'cbc:DocumentCurrencyCode');
    need(/<cac:AccountingSupplierParty>/, 'cac:AccountingSupplierParty');
    need(/<cac:AccountingCustomerParty>/, 'cac:AccountingCustomerParty');
    need(/<cac:LegalMonetaryTotal>/, 'cac:LegalMonetaryTotal');

    const ok = errs.length === 0;
    return { ok, errors: errs };
  }
}
