"use client";

import { useEffect, useState } from "react";
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
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="space-y-2">
        <Label htmlFor="base">API Base</Label>
        <Input id="base" value={base} onChange={(e) => setBaseState(e.target.value)} placeholder="/rb" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="token">API Token</Label>
        <Input id="token" value={token} onChange={(e) => setTokenState(e.target.value)} placeholder="Bearer token" />
      </div>
      <Button onClick={save}>Save</Button>
      <p className="text-sm text-muted-foreground">Default base is /rb which proxies to http://localhost:3333.</p>
    </div>
  );
}
