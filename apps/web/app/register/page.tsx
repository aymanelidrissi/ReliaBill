'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBase } from '@/lib/store';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirm) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const base = getBase();
            const res = await fetch(`${base}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // future-proof for cookie auth
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Registration failed');
            }

            toast.success('Account created. Please sign in.');
            router.replace('/login');
        } catch (err: any) {
            toast.error(err?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-sm p-6">
            <h1 className="text-2xl font-semibold mb-4">Create account</h1>

            <form onSubmit={onSubmit} className="space-y-3">
                <Input
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                />
                <Input
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                />
                <Input
                    placeholder="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating…' : 'Create account'}
                </Button>
            </form>

            <div className="mt-4 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="underline">
                    Sign in
                </Link>
            </div>
        </div>
    );
}
