'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

const Schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof Schema>;

export default function LoginPage() {
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(Schema),
  });

  async function onSubmit(data: FormData) {
    await signIn('resend', { email: data.email });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-80 space-y-4 rounded-xl bg-white p-6 shadow"
      >
        <h1 className="text-center text-xl font-semibold">ReliaBill Login</h1>

        <Input
          {...register('email')}
          placeholder="you@example.com"
          disabled={formState.isSubmitting}
        />

        <Button className="w-full" disabled={formState.isSubmitting}>
          Send magic-link
        </Button>
      </form>
    </main>
  );
}
