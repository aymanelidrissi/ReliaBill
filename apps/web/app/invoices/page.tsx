"use client";

import { useEffect, useMemo, useState } from "react";
import { api, download } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Invoice = {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalIncl: number;
  xmlPath: string | null;
  pdfPath: string | null;
};

type Log = { id: string; timestamp: string; status: string; message?: string; provider: string };

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ items: Invoice[] }>("/invoices?page=1&limit=50");
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(i => i.number.toLowerCase().includes(q) || i.status.toLowerCase().includes(q));
  }, [items, query]);

  async function prepare(id: string) {
    try {
      await api(`/invoices/${id}/prepare`, { method: "POST" });
      toast.success("Prepared");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function send(id: string) {
    try {
      await api(`/invoices/${id}/send`, { method: "POST" });
      toast.success("Sent");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function refresh(id: string) {
    try {
      await api(`/invoices/${id}/refresh-status`, { method: "GET" });
      toast.success("Refreshed");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function openLogs(id: string) {
    try {
      const l = await api<Log[]>(`/invoices/${id}/logs`);
      setLogs(l);
      setSelectedId(id);
      setLogsOpen(true);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function dlPdf(row: Invoice) {
    download(`/invoices/${row.id}/download-pdf`, `${row.number}.pdf`).catch(() => toast.error("Download failed"));
  }

  function dlXml(row: Invoice) {
    download(`/invoices/${row.id}/download-xml`, `${row.number}.xml`).catch(() => toast.error("Download failed"));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 flex gap-2">
          <Input placeholder="Search by number or status" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={load} disabled={loading}>Reload</Button>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.number}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.issueDate.slice(0,10)}</TableCell>
                <TableCell>{row.dueDate.slice(0,10)}</TableCell>
                <TableCell className="text-right">{row.totalIncl.toFixed(2)} {row.currency}</TableCell>
                <TableCell className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => prepare(row.id)}>Prepare</Button>
                  <Button size="sm" onClick={() => send(row.id)}>Send</Button>
                  <Button size="sm" onClick={() => refresh(row.id)}>Refresh</Button>
                  <Button size="sm" onClick={() => openLogs(row.id)}>Logs</Button>
                  <Button size="sm" onClick={() => dlPdf(row)}>PDF</Button>
                  <Button size="sm" onClick={() => dlXml(row)}>XML</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Logs {selectedId ? `· ${selectedId.slice(0,6)}…` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {logs.map(l => (
              <div key={l.id} className="border rounded p-2 text-sm">
                <div className="flex justify-between">
                  <div className="font-medium">{l.status}</div>
                  <div className="text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</div>
                </div>
                <div className="text-muted-foreground">{l.provider}</div>
                {l.message ? <div>{l.message}</div> : null}
              </div>
            ))}
            {logs.length === 0 && <div className="text-muted-foreground">No logs</div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
