'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Client = {
  id: string;
  name: string;
  vat?: string | null;
  peppolScheme?: string | null;
  peppolId?: string | null;
  deliveryMode?: 'PEPPOL' | 'HERMES';
};

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [name, setName] = useState('');
  const [vat, setVat] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'PEPPOL' | 'HERMES'>('PEPPOL');
  const [peppolScheme, setPeppolScheme] = useState('iso6523-actorid-upis');
  const [peppolId, setPeppolId] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const token = localStorage.getItem('rb.token') || '';
      const r = await fetch('/rb/clients?limit=100&page=1', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      toast.error(`Load clients failed: ${String(e)}`);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true);
    try {
      const token = localStorage.getItem('rb.token') || '';
      const body: any = { name, vat: vat || null, deliveryMode };
      if (deliveryMode === 'PEPPOL') {
        body.peppolScheme = peppolScheme || 'iso6523-actorid-upis';
        body.peppolId = peppolId || null;
      }
      const r = await fetch('/rb/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      setName(''); setVat(''); setPeppolId('');
      toast.success('Client created');
      load();
    } catch (e: any) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/invoices/new"><Button>Create invoice</Button></Link>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3 space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>VAT</Label>
            <Input value={vat} onChange={(e) => setVat(e.target.value)} placeholder="BE0…" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Delivery</Label>
            <Select value={deliveryMode} onValueChange={(v: 'PEPPOL' | 'HERMES') => setDeliveryMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PEPPOL">PEPPOL</SelectItem>
                <SelectItem value="HERMES">HERMES</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {deliveryMode === 'PEPPOL' && (
            <>
              <div className="md:col-span-2 space-y-2">
                <Label>Scheme</Label>
                <Input value={peppolScheme} onChange={(e) => setPeppolScheme(e.target.value)} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label>Endpoint ID</Label>
                <Input value={peppolId} onChange={(e) => setPeppolId(e.target.value)} placeholder="0208:4711000087" />
              </div>
            </>
          )}
          <div className="md:col-span-12">
            <Button onClick={create} disabled={busy || !name}>Add client</Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border divide-y">
        {items.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-muted-foreground">
                {c.vat || 'no VAT'} · {c.deliveryMode || 'PEPPOL'}
                {c.deliveryMode !== 'HERMES' && c.peppolId ? ` · ${c.peppolId}` : ''}
              </div>
            </div>
            <Link href={`/invoices/new?client=${c.id}`}><Button variant="secondary" size="sm">Invoice</Button></Link>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-center text-muted-foreground">No clients yet</div>}
      </div>
    </div>
  );
}
