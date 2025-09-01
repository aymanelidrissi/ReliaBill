import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto p-10 space-y-6">
      <h1 className="text-2xl font-semibold">ReliaBill</h1>
      <div className="flex gap-3">
        <Link href="/clients"><Button>Clients</Button></Link>
        <Link href="/invoices"><Button variant="secondary">Invoices</Button></Link>
        <Link href="/settings"><Button variant="outline">Settings</Button></Link>
      </div>
    </div>
  );
}
