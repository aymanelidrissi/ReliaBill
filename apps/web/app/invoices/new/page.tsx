'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

type Invoice = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalIncl: number;
  status: 'DRAFT'|'READY'|'SENT'|'DELIVERED'|'FAILED';
};

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('all');

  async function load() {
    try {
      const token = localStorage.getItem('rb.token') || '';
      const qs = new URLSearchParams({ page: '1', limit: '50' });
      if (query) qs.set('query', query);
      if (status !== 'all') qs.set('status', status);
      const r = await fetch(`/rb/invoices?${qs}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      toast.error(String(e));
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load}>Filter</Button>
          <Link href="/invoices/new"><Button>Create</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Number</TableHead>
                <TableHead className="w-40">Issue</TableHead>
                <TableHead className="w-40">Due</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.number}</TableCell>
                  <TableCell>{inv.issueDate.slice(0,10)}</TableCell>
                  <TableCell>{inv.dueDate.slice(0,10)}</TableCell>
                  <TableCell>{inv.status}</TableCell>
                  <TableCell className="text-right">{inv.totalIncl.toFixed(2)} {inv.currency}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/invoices/${inv.id}`}><Button size="sm" variant="secondary">Open</Button></Link>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
