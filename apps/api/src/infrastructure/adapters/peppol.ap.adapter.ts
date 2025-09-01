import { Injectable } from '@nestjs/common';
import { HttpHermesAdapter } from './hermes.http.adapter';
import * as fs from 'fs/promises';

export type ApSendInput = {
  xmlPath: string;
  sender?: { scheme?: string; id?: string } | null;
  recipient: { scheme: string; id: string };
  processId: string;
  documentTypeId: string;
};

export type ApSendResult = { messageId: string; delivered?: boolean };
type StatusResult = { status: 'SENT' | 'DELIVERED' | 'FAILED' };

const doFetch = (...args: any[]) => (globalThis.fetch as any)(...args);

@Injectable()
export class PeppolApAdapter {
  constructor(private readonly hermes: HttpHermesAdapter) { }

  private _token: string | null = null;
  private _tokenExp: number | null = null;

  private nowSec() {
    return Math.floor(Date.now() / 1000);
  }

  private get authUrl() {
    return process.env.ACUBE_AUTH_URL || 'https://common-sandbox.api.acubeapi.com/login';
  }

  private get apiUrl() {
    return (
      process.env.ACUBE_BASE_URL ||
      process.env.ACUBE_API_URL ||
      'https://peppol-sandbox.api.acubeapi.com'
    );
  }

  private get email() {
    return process.env.ACUBE_EMAIL || '';
  }

  private get password() {
    return (process.env.ACUBE_PASSWORD || '').replace(/^'|'$/g, '');
  }

  private async getToken(): Promise<string> {
    const margin = 60;
    if (this._token && this._tokenExp && this._tokenExp > this.nowSec() + margin) {
      return this._token;
    }
    const res = await doFetch(this.authUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`A-Cube login failed (${res.status}): ${txt}`);
    }
    const body = await res.json().catch(() => ({}));
    const token = body.token as string;
    if (!token) throw new Error('A-Cube login: missing token');
    this._token = token;
    this._tokenExp = this.nowSec() + 15 * 60;
    return token;
  }

  private mapMessageId(payload: any): string | null {
    return payload?.document_id || payload?.id || payload?.uuid || payload?.documentId || null;
  }

  async send(input: ApSendInput): Promise<ApSendResult> {
    const mode = (process.env.PEPPOL_MODE || 'stub').toLowerCase();

    if (mode !== 'acube') {
      const r = await this.hermes.send({ xmlPath: input.xmlPath });
      return { messageId: r.messageId, delivered: r.delivered };
    }

    const xml = await fs.readFile(input.xmlPath, 'utf8');
    const url = `${this.apiUrl.replace(/\/+$/, '')}/invoices/outgoing/ubl`;

    const attempt = async (token: string) => {
      const r = await doFetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/xml',
          Accept: 'application/json',
          'X-Document-Type': input.documentTypeId,
          'X-Process': input.processId,
        },
        body: xml,
      });
      return r;
    };

    let token = await this.getToken();
    let resp = await attempt(token);

    if (resp.status === 401) {
      token = await this.getToken();
      resp = await attempt(token);
    }

    if (!resp.ok && resp.status !== 202) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`A-Cube send failed (${resp.status}): ${txt}`);
    }

    const payload: any = await resp.json().catch(() => ({}));
    const messageId = this.mapMessageId(payload) ?? '';
    return { messageId, delivered: false };
  }

  async status(messageId: string): Promise<StatusResult> {
    const mode = (process.env.PEPPOL_MODE || 'stub').toLowerCase();

    if (mode !== 'acube') {
      const r = await this.hermes.status(messageId);
      const st = (r?.status || '').toUpperCase();
      if (st === 'DELIVERED') return { status: 'DELIVERED' };
      if (st === 'FAILED') return { status: 'FAILED' };
      return { status: 'SENT' };
    }

    const token = await this.getToken();
    const url = `${this.apiUrl.replace(/\/+$/, '')}/invoices/${encodeURIComponent(messageId)}`;
    const r = await doFetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`A-Cube status failed (${r.status}): ${txt}`);
    }
    const body: any = await r.json().catch(() => ({}));

    const state = (body?.status || body?.state || body?.delivery_status || '').toString().toUpperCase();

    if (state.includes('DELIVERED') || state === 'DELIVERED' || state === 'COMPLETED') {
      return { status: 'DELIVERED' };
    }
    if (
      state.includes('FAIL') ||
      state.includes('ERROR') ||
      state === 'TRANSPORT_ERROR' ||
      state === 'FAILED'
    ) {
      return { status: 'FAILED' };
    }
    return { status: 'SENT' };
  }
}
