'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getBase, getToken } from '@/lib/store';

export default function CompanySetupPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        legalName: '',
        vat: '',
        iban: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'BE',
    });
    const [submitting, setSubmitting] = useState(false);

    function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Require auth until we switch to cookie-based sessions
        const token = getToken();
        if (!token) {
            toast.error('Please sign in first');
            router.replace('/login');
            return;
        }

        setSubmitting(true);
        try {
            const base = getBase();
            const res = await fetch(`${base}/companies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                // Keep this for the upcoming cookie-auth step; harmless now
                credentials: 'include',
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to create company');
            }

            toast.success('Company created');
            router.replace('/');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to create company');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-lg p-6">
            <h1 className="text-2xl font-semibold mb-2">Set up your company</h1>
            <p className="text-sm text-muted-foreground mb-6">
                Enter details exactly as they appear in official records to avoid PEPPOL validation issues.
            </p>

            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
                <div>
                    <label className="block text-sm mb-1">Legal name</label>
                    <Input
                        value={form.legalName}
                        onChange={(e) => update('legalName', e.target.value)}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm mb-1">VAT</label>
                        <Input
                            placeholder="e.g. BE0123456789"
                            value={form.vat}
                            onChange={(e) => update('vat', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">IBAN</label>
                        <Input
                            placeholder="e.g. BE68 5390 0754 7034"
                            value={form.iban}
                            onChange={(e) => update('iban', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm mb-1">Street</label>
                        <Input
                            value={form.street}
                            onChange={(e) => update('street', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">City</label>
                        <Input
                            value={form.city}
                            onChange={(e) => update('city', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm mb-1">Postal code</label>
                        <Input
                            value={form.postalCode}
                            onChange={(e) => update('postalCode', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Country (2 letters)</label>
                        <Input
                            maxLength={2}
                            value={form.country}
                            onChange={(e) => update('country', e.target.value.toUpperCase())}
                        />
                    </div>
                </div>

                <Button type="submit" className="mt-2" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save company'}
                </Button>

                <div className="text-sm text-muted-foreground mt-4">
                    Already set this up? <Link className="underline" href="/">Go home</Link>
                </div>
            </form>
        </div>
    );
}
