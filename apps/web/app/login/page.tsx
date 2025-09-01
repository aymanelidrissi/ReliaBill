"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getBase } from "@/lib/store";

export default function LoginPage() {
    const router = useRouter();
    const sp = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const base = getBase();
                const r = await fetch(`${base}/auth/me`, { credentials: "include" });
                if (r.ok) router.replace(sp.get("next") || "/invoices");
            } catch {
               
            }
        })();

        const existing = typeof window !== "undefined" ? localStorage.getItem("rb.token") : null;
        if (existing) router.replace(sp.get("next") || "/invoices");
    }, [router, sp]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            const base = getBase();
            const res = await fetch(`${base}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            const text = await res.text();
            if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

            try {
                const json = JSON.parse(text);
                const token = json.access_token || json.accessToken || json.token || "";
                if (token) localStorage.setItem("rb.token", token);
            } catch {  }

            toast.success("Logged in");
            router.replace(sp.get("next") || "/invoices");
        } catch (err: any) {
            toast.error(err.message || "Login failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto max-w-sm pt-12">
            <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
            <Card>
                <CardContent className="p-6">
                    <form className="space-y-4" onSubmit={onSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <Button type="submit" className="w-full" disabled={busy}>
                                {busy ? "Signing in…" : "Sign in"}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push("/register")}
                            >
                                Create an account
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
