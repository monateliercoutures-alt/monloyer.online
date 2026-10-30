'use client';

import * as React from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field as FormField } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/misc';
import { DEFAULT_REMINDER_TEMPLATE, MESSAGE_VARIABLES, REMINDER_CHANNEL_LABELS } from '@/lib/constants';
import { ErrorMessage, useApiForm } from '@/components/forms/form-utils';
import { formatFCFA } from '@/lib/format';

type Organization = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string;
  logoUrl: string | null;
  primaryColor: string;
  commissionRate: number;
  penaltyRatePercent: number;
  penaltyGraceDays: number;
  reminderOffsets: number[];
  reminderChannels: string[];
  reminderTemplate: string | null;
  receiptPrefix: string;
  receiptCounter: number;
};

const REMINDER_PRESETS = [
  { label: 'Standard (J-3, J0, J+3, J+7, J+15)', value: '-3,0,3,7,15' },
  { label: 'Souple (J0, J+5, J+15)', value: '0,5,15' },
  { label: 'Ferme (J-5, J-1, J+1, J+3, J+7, J+15, J+30)', value: '-5,-1,1,3,7,15,30' },
];

export function SettingsForm({ organization }: { organization: Organization }) {
  const { submit, loading, error } = useApiForm('/api/settings', 'PATCH');
  const [logoUrl, setLogoUrl] = React.useState(organization.logoUrl ?? '');
  const [channels, setChannels] = React.useState<string[]>(organization.reminderChannels);
  const [offsets, setOffsets] = React.useState(organization.reminderOffsets.join(','));

  function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert('Logo trop volumineux (500 Ko maximum).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setLogoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      logoUrl,
      reminderChannels: channels,
      reminderOffsets: offsets
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => !Number.isNaN(value)),
    };
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    await submit(payload, { successMessage: 'Paramètres enregistrés' });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="agence">
        <TabsList>
          <TabsTrigger value="agence">Agence</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
          <TabsTrigger value="relances">Relances</TabsTrigger>
          <TabsTrigger value="numerotation">Numérotation</TabsTrigger>
        </TabsList>

        <TabsContent value="agence">
          <Card>
            <CardHeader>
              <CardTitle>Identité de l&apos;organisation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <FormField label="Nom" htmlFor="name" required>
                <Input id="name" name="name" defaultValue={organization.name} required />
              </FormField>
              <FormField label="Ville" htmlFor="city" required>
                <Input id="city" name="city" defaultValue={organization.city} required />
              </FormField>
              <FormField label="E-mail" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={organization.email ?? ''} />
              </FormField>
              <FormField label="Téléphone" htmlFor="phone">
                <Input id="phone" name="phone" defaultValue={organization.phone ?? ''} />
              </FormField>
              <FormField label="Adresse" htmlFor="address" className="sm:col-span-2">
                <Input id="address" name="address" defaultValue={organization.address ?? ''} />
              </FormField>
              <FormField label="Couleur principale" htmlFor="primaryColor" hint="Utilisée dans l'interface et les PDF">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue={organization.primaryColor}
                  className="h-10 w-24 p-1"
                />
              </FormField>
              <FormField label="Logo (PNG/JPG)" htmlFor="logo" hint="Affiché sur les quittances, contrats et relevés">
                <Input id="logo" type="file" accept="image/png,image/jpeg" onChange={handleLogo} />
              </FormField>
              {logoUrl ? (
                <div className="sm:col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo" className="h-16 rounded-lg border object-contain p-1" />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finances">
          <Card>
            <CardHeader>
              <CardTitle>Commissions & pénalités</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <FormField label="Commission par défaut (%)" htmlFor="commissionRate" required>
                <Input
                  id="commissionRate"
                  name="commissionRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  defaultValue={organization.commissionRate}
                  required
                />
              </FormField>
              <FormField label="Pénalité de retard (% / mois)" htmlFor="penaltyRatePercent" required>
                <Input
                  id="penaltyRatePercent"
                  name="penaltyRatePercent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  defaultValue={organization.penaltyRatePercent}
                  required
                />
              </FormField>
              <FormField label="Jours de tolérance" htmlFor="penaltyGraceDays" required>
                <Input
                  id="penaltyGraceDays"
                  name="penaltyGraceDays"
                  type="number"
                  min={0}
                  max={90}
                  defaultValue={organization.penaltyGraceDays}
                  required
                />
              </FormField>
              <p className="text-xs text-muted-foreground sm:col-span-3">
                Exemple : un loyer de {formatFCFA(350000)} en retard de 20 jours avec 5 % de pénalité et 5 jours de
                tolérance donne {formatFCFA(Math.round((350000 * 5) / 100))} de pénalité.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relances">
          <Card>
            <CardHeader>
              <CardTitle>Relances automatiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Décalages (jours)" htmlFor="reminderOffsets" hint="Négatif = avant l'échéance" required>
                  <Input
                    id="reminderOffsets"
                    value={offsets}
                    onChange={(event) => setOffsets(event.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Préréglages" htmlFor="preset">
                  <Select
                    id="preset"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) setOffsets(event.target.value);
                    }}
                  >
                    <option value="">Choisir un préréglage…</option>
                    {REMINDER_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Canaux d&apos;envoi</p>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(REMINDER_CHANNEL_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={channels.includes(value)}
                        onCheckedChange={(checked) =>
                          setChannels((previous) =>
                            checked ? [...previous, value] : previous.filter((channel) => channel !== value),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <FormField label="Modèle de message" htmlFor="reminderTemplate" required>
                <Textarea
                  id="reminderTemplate"
                  name="reminderTemplate"
                  rows={4}
                  defaultValue={organization.reminderTemplate || DEFAULT_REMINDER_TEMPLATE}
                  required
                />
              </FormField>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Variables disponibles</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {MESSAGE_VARIABLES.map((variable) => (
                    <li key={variable.key}>
                      <span className="font-mono">{variable.key}</span> — {variable.description}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numerotation">
          <Card>
            <CardHeader>
              <CardTitle>Numérotation des quittances</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <FormField label="Préfixe" htmlFor="receiptPrefix" required>
                <Input
                  id="receiptPrefix"
                  name="receiptPrefix"
                  defaultValue={organization.receiptPrefix}
                  maxLength={8}
                  required
                />
              </FormField>
              <FormField label="Prochain compteur" htmlFor="receiptCounter" required>
                <Input
                  id="receiptCounter"
                  name="receiptCounter"
                  type="number"
                  min={0}
                  defaultValue={organization.receiptCounter}
                  required
                />
              </FormField>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Prochaine quittance :{' '}
                <span className="font-mono font-medium">
                  {organization.receiptPrefix}-{new Date().getFullYear()}-
                  {String(organization.receiptCounter + 1).padStart(4, '0')}
                </span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ErrorMessage error={error} />

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          <Save className="size-4" /> Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
}
