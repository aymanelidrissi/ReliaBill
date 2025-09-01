"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getBase, getToken, setBase, setToken } from "@/lib/store";
import { toast } from "sonner";

export default function SettingsPage() {
  const [base, setBaseState] = useState("/rb");
  const [token, setTokenState] = useState("");

  useEffect(() => {
    setBaseState(getBase());
    setTokenState(getToken());
  }, []);

  function save() {
    setBase(base);
    setToken(token);
    toast.success("Saved");
  }

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-2">
        <Label htmlFor="base">API Base</Label>
        <Input id="base" value={base} onChange={(e) => setBaseState(e.target.value)} placeholder="/rb" />
        <p className="text-sm text-muted-foreground">Default base is /rb which proxies to http://localhost:3333.</p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="token">API Token</Label>
        <Input id="token" value={token} onChange={(e) => setTokenState(e.target.value)} placeholder="Bearer token" />
      </section>

      <Button onClick={save}>Save</Button>

      <section className="space-y-2 pt-4 border-t">
        <h2 className="text-xl font-semibold">Company</h2>
        <p className="text-sm text-muted-foreground">
          Set your legal details (name, VAT, IBAN, address). These appear on invoices and are required for PEPPOL.
        </p>
        <Link href="/settings/company" className="inline-flex">
          <Button variant="outline">Open Company Setup</Button>
        </Link>
      </section>
    </div>
  );
}
