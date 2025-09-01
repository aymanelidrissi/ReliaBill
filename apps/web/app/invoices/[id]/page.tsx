'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Line = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotalExcl: number;
  lineVat: number;
};

type Invoice = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalExcl: number;
  totalVat: number;
  totalIncl: number;
  status: 'DRAFT' | 'READY' | 'SENT' | 'DELIVERED' | 'FAILED';
  xmlPath: string | null;
  pdfPath: string | null;
  hermesMessageId: string | null;
  lines: Line[];
};

type Log = {
  id: string;
  timestamp: string;
  status: string;
  message: string | null;
  provider: string;
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(false);

  const token = useMemo(() => localStorage.getItem('rb.token') || '', []);

  async function load() {
    try {
      const r1 = await fetch(`/rb/invoices/${id}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (!r1.ok) throw new Error(`HTTP ${r1.status}`);
      const invoice = await r1.json();
      setInv(invoice);
      const r2 = await fetch(`/rb/invoices/${id}/logs`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (r2.ok) setLogs(await r2.json());
    } catch (e: any) {
      toast.error(`Load failed: ${String(e)}`);
    }
  }

  useEffect(() => { load(); }, []);

  async function call(path: string, method = 'POST') {
    const r = await fetch(`/rb/invoices/${id}/${path}`, {
      method,
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function doPrepare() {
    if (!inv) return;
    setBusy(true);
    try {
      await call('prepare');
      toast.success('Prepared');
      await load();
    } catch (e: any) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doSend() {
    if (!inv) return;
    setBusy(true);
    try {
      const res = await call('send');
      toast.success(`Sent (${res.status})`);
      await load();
    } catch (e: any) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doRefresh() {
    if (!inv) return;
    setBusy(true);
    try {
      const res = await call('refresh-status', 'GET');
      toast.success(`Status: ${res.status}`);
      await load();
    } catch (e: any) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!inv) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invoice</h1>
          <Link href="/invoices"><Button variant="secondary">Back</Button></Link>
        </div>
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const canPrepare = inv.status === 'DRAFT' || inv.status === 'FAILED' || !inv.xmlPath || !inv.pdfPath;
  const canSend = inv.status === 'READY';
  const canRefresh = inv.status === 'SENT';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice {inv.number}</h1>
        <div className="flex gap-2">
          <Link href="/invoices"><Button variant="secondary">Back</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Issue date</div>
            <div className="font-medium">{inv.issueDate.slice(0, 10)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Due date</div>
            <div className="font-medium">{inv.dueDate.slice(0, 10)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium">{inv.status}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total excl</div>
            <div className="font-medium">{inv.totalExcl.toFixed(2)} {inv.currency}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">VAT</div>
            <div className="font-medium">{inv.totalVat.toFixed(2)} {inv.currency}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total incl</div>
            <div className="font-medium">{inv.totalIncl.toFixed(2)} {inv.currency}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={doPrepare} disabled={busy || !canPrepare}>Prepare</Button>
            <Button onClick={doSend} disabled={busy || !canSend}>Send</Button>
            <Button onClick={doRefresh} variant="secondary" disabled={busy || !canRefresh}>Refresh</Button>
            <a
              href={`/rb/invoices/${inv.id}/download-xml`}
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" disabled={!inv.xmlPath}>Download XML</Button>
            </a>
            <a
              href={`/rb/invoices/${inv.id}/download-pdf`}
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" disabled={!inv.pdfPath}>Download PDF</Button>
            </a>
          </div>

          <div className="text-sm">
            Message ID: {inv.hermesMessageId ? <span className="font-mono">{inv.hermesMessageId}</span> : '—'}
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-36">Price per unit</TableHead>
                  <TableHead className="w-24">VAT %</TableHead>
                  <TableHead className="w-32 text-right">Line excl</TableHead>
                  <TableHead className="w-32 text-right">VAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.description}</TableCell>
                    <TableCell>{l.quantity}</TableCell>
                    <TableCell>{l.unitPrice}</TableCell>
                    <TableCell>{l.vatRate}</TableCell>
                    <TableCell className="text-right">{l.lineTotalExcl.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{l.lineVat.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="text-lg font-medium">Logs</div>
          <div className="rounded-md border divide-y">
            {logs.map(l => (
              <div key={l.id} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-3 text-sm text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</div>
                <div className="md:col-span-2 font-medium">{l.status}</div>
                <div className="md:col-span-1 text-sm">{l.provider}</div>
                <div className="md:col-span-6 text-sm break-words">{l.message || ''}</div>
              </div>
            ))}
            {logs.length === 0 && <div className="p-6 text-center text-muted-foreground">No logs yet</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
