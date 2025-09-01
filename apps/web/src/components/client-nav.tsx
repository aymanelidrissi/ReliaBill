"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToken, getEmail, getToken } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ClientNav() {
  const r = useRouter();
  const [token, setT] = useState<string>("");
  const [email, setE] = useState<string>("");

  useEffect(() => {
    setT(getToken());
    setE(getEmail());
    const onFocus = () => {
      setT(getToken());
      setE(getEmail());
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function logout() {
    clearToken();
    setT("");
    setE("");
    r.push("/login");
  }

  if (!token) {
    return (
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/clients">Clients</Link>
        <Link href="/invoices">Invoices</Link>
        <Link href="/invoices/new">New</Link>
        <Link href="/settings">Settings</Link>
        <Link href="/login" className="ml-4">Login</Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/clients">Clients</Link>
      <Link href="/invoices">Invoices</Link>
      <Link href="/invoices/new">New</Link>
      <Link href="/settings">Settings</Link>
      <span className="ml-4 opacity-70">{email || "Signed in"}</span>
      <Button size="sm" variant="secondary" onClick={logout}>Logout</Button>
    </nav>
  );
}
