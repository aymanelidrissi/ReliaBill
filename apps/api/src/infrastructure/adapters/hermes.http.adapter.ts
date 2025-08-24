import { Injectable } from '@nestjs/common';
import { HermesPort } from '../../core/ports/hermes.port';
import * as fs from 'fs';

function env(k: string) {
  return process.env[k] || '';
}

@Injectable()
export class HttpHermesAdapter implements HermesPort {
  async send({ xmlPath }: { xmlPath: string }) {
    const base = env('HERMES_BASE_URL');
    const key = env('HERMES_API_KEY');
    if (!base || !key) {
      const crypto = await import('crypto');
      const buf = fs.readFileSync(xmlPath);
      const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
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
}
