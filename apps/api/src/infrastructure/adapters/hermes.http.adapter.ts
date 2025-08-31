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

function readXmlSync(xmlPathOrXml: string): { xml: string; isPath: boolean } {
  const s = (xmlPathOrXml || '').trim();
  if (s.startsWith('<')) return { xml: s, isPath: false };
  if (!fs.existsSync(s)) throw new Error('XML not found');
  return { xml: fs.readFileSync(s, 'utf8'), isPath: true };
}

@Injectable()
export class HttpHermesAdapter implements HermesPort {
  async send({ xmlPath }: HermesSendInput): Promise<HermesSendResult> {
    const base = env('HERMES_BASE_URL');
    const key = env('HERMES_API_KEY');

    const { xml } = readXmlSync(xmlPath);

    if (!base || !key) {
      const hash = createHash('sha1').update(Buffer.from(xml, 'utf8')).digest('hex').slice(0, 16);
      return { messageId: `hermes_${hash}`, delivered: false };
    }

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
    try { data = JSON.parse(text); } catch { data = { messageId: text.trim() }; }

    const id = data.messageId || data.id || '';
    if (!id) throw new Error('HERMES_NO_MESSAGE_ID');

    return { messageId: id, delivered: false };
  }

  async status(messageId: string): Promise<HermesStatusResult> {
    const base = env('HERMES_BASE_URL');
    const key = env('HERMES_API_KEY');

    if (!base || !key) {
      return { messageId, status: 'DELIVERED', delivered: true };
    }

    const url = `${base.replace(/\/+$/, '')}/messages/${encodeURIComponent(messageId)}/status`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HERMES_STATUS_FAILED ${res.status} ${text.slice(0, 200)}`);
    }

    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { status: 'SENT' }; }

    const status = (data.status as 'SENT' | 'DELIVERED' | 'FAILED') || 'SENT';
    return { messageId, status, delivered: status === 'DELIVERED' };
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const h = createHmac('sha256', secret).update(payload).digest('hex');
    return h === (signature || '').toLowerCase();
  }
}
