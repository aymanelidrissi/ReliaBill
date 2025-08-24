import { Injectable } from '@nestjs/common';
import { createHmac, createHash } from 'crypto';
import * as fs from 'fs';
import type {
  HermesPort,
  HermesSendInput,
  HermesSendResult,
  HermesStatusResult,
} from '../../core/ports/hermes.port';

function env(k: string) {
  return process.env[k] || '';
}

@Injectable()
export class HttpHermesAdapter implements HermesPort {
  async send({ xmlPath }: HermesSendInput): Promise<HermesSendResult> {
    const base = env('HERMES_BASE_URL');
    const key = env('HERMES_API_KEY');

    if (!fs.existsSync(xmlPath)) {
      throw new Error('XML not found');
    }

    if (!base || !key) {
      const buf = fs.readFileSync(xmlPath);
      const hash = createHash('sha1').update(buf).digest('hex').slice(0, 16);
      return { messageId: `hermes_${hash}`, delivered: false };
    }

    const xml = fs.readFileSync(xmlPath, 'utf8');
    const url = `${base.replace(/\/+$/, '')}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/xml',
        Accept: 'application/json',
      },
      body: xml,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HERMES_SEND_FAILED ${res.status} ${text.slice(0, 200)}`);
    }
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { messageId: text.trim() };
    }
    const id = data.messageId || data.id || '';
    if (!id) throw new Error('HERMES_NO_MESSAGE_ID');
    return { messageId: id, delivered: false };
  }

  async status(messageId: string): Promise<HermesStatusResult> {
    const base = env('HERMES_BASE_URL');
    const key = env('HERMES_API_KEY');

    if (!base || !key) {
      const last = messageId.slice(-1);
      const delivered = /^[0-9a-f]$/i.test(last) && parseInt(last, 16) % 2 === 0;
      return { messageId, status: delivered ? 'DELIVERED' : 'SENT', delivered };
    }

    // For now, mimic “still SENT”, later real status endpoint, plug it here.
    return { messageId, status: 'SENT', delivered: false };
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const h = createHmac('sha256', secret).update(payload).digest('hex');
    return h === (signature || '').toLowerCase();
  }
}
