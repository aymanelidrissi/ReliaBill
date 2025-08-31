import { Injectable } from '@nestjs/common';
import { HttpHermesAdapter } from './hermes.http.adapter';

export type ApSendInput = {
  xmlPath: string;
  sender?: { scheme?: string; id?: string } | null;
  recipient: { scheme: string; id: string };
  processId: string;
  documentTypeId: string;
};

export type ApSendResult = { messageId: string; delivered?: boolean };

@Injectable()
export class PeppolApAdapter {
  constructor(private readonly hermes: HttpHermesAdapter) {}

  async send(input: ApSendInput): Promise<ApSendResult> {
    const mode = (process.env.PEPPOL_MODE || 'stub').toLowerCase();

    if (mode === 'stub') {
      const r = await this.hermes.send({ xmlPath: input.xmlPath });
      return { messageId: r.messageId, delivered: r.delivered };
    }

    const r = await this.hermes.send({ xmlPath: input.xmlPath });
    return { messageId: r.messageId, delivered: r.delivered };
  }
}
