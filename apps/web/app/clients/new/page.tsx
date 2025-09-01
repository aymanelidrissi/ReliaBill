'use client';

import { useMemo, useState } from 'react';
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
    const [peppolId, setPeppolId] = useState('');

    const normCountry = (v: string) => v.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
    const isCountryValid = useMemo(() => /^[A-Za-z]{2}$/.test(country), [country]);
    const isPeppolIdValid = useMemo(
        () => (deliveryMode === 'HERMES') || /^\d{4}:.+$/i.test(peppolId.trim()),
        [deliveryMode, peppolId]
    );
    const disabled = !name || !isCountryValid || !isPeppolIdValid;

    async function submit() {
        try {
            if (!isCountryValid) {
                toast.error('Country must be a 2-letter ISO code (e.g., BE)');
                return;
            }
            if (deliveryMode === 'PEPPOL' && !isPeppolIdValid) {
                toast.error('PEPPOL Endpoint ID must look like 0208:4711000087');
                return;
            }

            const payload: any = {
                name,
                vat: vat || null,
                email: email || null,
                street,
                city,
                postalCode,
                country: normCountry(country),
                deliveryMode,
            };

            if (deliveryMode === 'PEPPOL') {
                payload.peppolId = peppolId.trim();
            }

            await api('/clients', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

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
                        <Label>Country (2 letters)</Label>
                        <Input
                            value={country}
                            onChange={e => setCountry(normCountry(e.target.value))}
                            maxLength={2}
                            pattern="^[A-Za-z]{2}$"
                            placeholder="BE"
                        />
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
                            <div className="space-y-2 md:col-span-2">
                                <Label>PEPPOL Endpoint ID</Label>
                                <Input
                                    value={peppolId}
                                    onChange={e => setPeppolId(e.target.value)}
                                    placeholder="0208:4711000087"
                                    pattern="^\d{4}:.+$"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format: <code>dddd:XXXXXXXX</code> (e.g., <code>0208:4711000087</code>)
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Button onClick={submit} disabled={disabled}>Create</Button>
        </div>
    );
}
