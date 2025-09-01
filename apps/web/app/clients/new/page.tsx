'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NewClientPage() {
  const r = useRouter();

  const [name, setName] = useState('');
  const [vat, setVat] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('BE');
  const [deliveryMode, setDeliveryMode] = useState<'PEPPOL' | 'HERMES'>('PEPPOL');
  const [peppolScheme, setPeppolScheme] = useState('iso6523-actorid-upis');
  const [peppolId, setPeppolId] = useState('');

  const disabled = !name;

  async function submit() {
    try {
      const payload: any = {
        name,
        vat: vat || null,
        email: email || null,
        street,
        city,
        postalCode,
        country,
        deliveryMode,
      };
      if (deliveryMode === 'PEPPOL') {
        payload.peppolScheme = peppolScheme || 'iso6523-actorid-upis';
        payload.peppolId = peppolId || null;
      }
      const c = await api('/clients', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Client created');
      r.push('/clients');
    } catch (e: any) {
      toast.error(e.message || 'Create failed');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New Client</h1>

      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>VAT</Label>
            <Input value={vat} onChange={e => setVat(e.target.value)} placeholder="BE0123456789" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Street</Label>
            <Input value={street} onChange={e => setStreet(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Postal code</Label>
            <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={country} onChange={e => setCountry(e.target.value.toUpperCase())} />
          </div>

          <div className="space-y-2">
            <Label>Delivery mode</Label>
            <Select value={deliveryMode} onValueChange={v => setDeliveryMode(v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PEPPOL">PEPPOL</SelectItem>
                <SelectItem value="HERMES">HERMES</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deliveryMode === 'PEPPOL' && (
            <>
              <div className="space-y-2">
                <Label>Peppol scheme</Label>
                <Input value={peppolScheme} onChange={e => setPeppolScheme(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Peppol ID</Label>
                <Input value={peppolId} onChange={e => setPeppolId(e.target.value)} placeholder="0208:4711000087" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button onClick={submit} disabled={disabled}>Create</Button>
    </div>
  );
}
