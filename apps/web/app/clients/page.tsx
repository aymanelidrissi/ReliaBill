'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

type Client = {
  id: string;
  name: string;
  vat?: string | null;
  email?: string | null;
  country?: string | null;
  deliveryMode?: 'PEPPOL' | 'HERMES';
  peppolScheme?: string | null;
  peppolId?: string | null;
};

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await api<{ items: Client[] }>('/clients?page=1&limit=200');
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load clients');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.vat || '').toLowerCase().includes(q) ||
      (c.peppolId || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Button asChild><Link href="/clients/new">New client</Link></Button>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-2">
          <Input placeholder="Search name, VAT, Peppol ID" value={query} onChange={e => setQuery(e.target.value)} />
          <Button onClick={load} disabled={busy}>Reload</Button>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Peppol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.vat || '-'}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell>{c.country || '-'}</TableCell>
                <TableCell>{c.deliveryMode || '-'}</TableCell>
                <TableCell>{c.peppolId ? `${c.peppolScheme || ''}:${c.peppolId}`.replace(/^:/,'') : '-'}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No clients</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
