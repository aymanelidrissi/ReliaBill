'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Client = { id: string; name: string; vat?: string | null };

type UiLine = {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function isoPlusDays(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
const toNum = (v: string) => (v.trim() === '' ? NaN : Number(v));

export default function NewInvoicePage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [currency, setCurrency] = useState('EUR');
  const [issueDate, setIssueDate] = useState(isoToday());
  const [dueDate, setDueDate] = useState(isoPlusDays(isoToday(), 14));
  const [busy, setBusy] = useState(false);

  const [lines, setLines] = useState<UiLine[]>([
    { description: '', quantity: '1', unitPrice: '0', vatRate: '21' },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api<{ items: any[] }>('/clients?limit=100&page=1');
        const items = Array.isArray(data?.items) ? data.items : [];
        setClients(items.map(c => ({ id: c.id, name: c.name, vat: c.vat ?? null })));
      } catch {
        toast.error('Failed to load clients');
      }
    };
    load();
  }, []);

  const setLine = (i: number, patch: Partial<UiLine>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines(prev => [...prev, { description: '', quantity: '1', unitPrice: '0', vatRate: '21' }]);

  const removeLine = (i: number) =>
    setLines(prev => prev.filter((_, idx) => idx !== i));

  const submitting = useMemo(() => {
    if (busy || lines.length === 0) return true;
    for (const l of lines) {
      if (!l.description.trim()) return true;
      const q = toNum(l.quantity);
      if (!Number.isFinite(q) || q <= 0) return true;
    }
    return false;
  }, [busy, lines]);

  const submit = async () => {
    setBusy(true);
    try {
      const payload: any = {
        currency,
        issueDate,
        dueDate,
        lines: lines.map(l => ({
          description: l.description.trim(),
          quantity: Number.isFinite(toNum(l.quantity)) ? Number(l.quantity) : 0,
          unitPrice: Number.isFinite(toNum(l.unitPrice)) ? Number(l.unitPrice) : 0,
          vatRate: Number.isFinite(toNum(l.vatRate)) ? Number(l.vatRate) : 0,
        })),
      };
      if (clientId && clientId !== 'none') payload.clientId = clientId;

      await api('/invoices', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Created');
      router.push('/invoices');
    } catch (e: any) {
      const msg = String(e?.message || e || 'Failed');
      const friendly =
        msg.includes('Client not found') || msg.includes('CLIENT_NOT_FOUND')
          ? 'Client not found. Pick a client from the list.'
          : msg.includes('NO_LINES')
          ? 'Add at least one line.'
          : msg.includes('BAD_DATES')
          ? 'Dates are invalid.'
          : msg.includes('DUE_BEFORE_ISSUE')
          ? 'Due date must be after issue date.'
          : msg;
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Invoice</h1>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.vat ? `· ${c.vat}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCurrency(e.target.value.toUpperCase())
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue">Issue Date</Label>
            <Input
              id="issue"
              type="date"
              value={issueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIssueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due">Due Date</Label>
            <Input
              id="due"
              type="date"
              value={dueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="w-28">Qty</TableHead>
              <TableHead className="w-36">Price per unit</TableHead>
              <TableHead className="w-28">VAT %</TableHead>
              <TableHead className="w-28 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Input
                    value={l.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLine(i, { description: e.target.value })
                    }
                    placeholder="Work description"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={0}
                    value={l.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLine(i, { quantity: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={0}
                    value={l.unitPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLine(i, { unitPrice: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={0}
                    value={l.vatRate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLine(i, { vatRate: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="secondary" size="sm" onClick={() => removeLine(i)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={5}>
                <Button size="sm" onClick={addLine}>Add line</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Button onClick={submit} disabled={submitting}>Create</Button>
    </div>
  );
}
