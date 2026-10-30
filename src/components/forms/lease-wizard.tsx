'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PERIODICITY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/constants';
import { formatDate, formatFCFA } from '@/lib/format';
import { ErrorMessage, useApiForm } from '@/components/forms/form-utils';

type PropertyOption = {
  id: string;
  reference: string;
  name: string | null;
  type: keyof typeof PROPERTY_TYPE_LABELS;
  address: string;
  district: string;
  rentAmount: number;
  chargesAmount: number;
  depositAmount: number;
  units: { id: string; name: string; rentAmount: number | null; chargesAmount: number | null; depositAmount: number | null }[];
};

type TenantOption = { id: string; firstName: string; lastName: string; phone: string };

type FormState = {
  propertyId: string;
  unitId: string;
  tenantId: string;
  reference: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  chargesAmount: string;
  depositAmount: string;
  advanceMonths: string;
  periodicity: 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'ANNUEL';
  noticePeriodDays: string;
  penaltyRatePercent: string;
  notes: string;
};

const today = new Date();
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Formulaire en 3 étapes : bien → conditions → récapitulatif. */
export function LeaseWizard({
  properties,
  tenants,
  defaultPropertyId,
  nextReference,
}: {
  properties: PropertyOption[];
  tenants: TenantOption[];
  defaultPropertyId?: string;
  nextReference: string;
}) {
  const router = useRouter();
  const { submit, loading, error } = useApiForm('/api/leases');
  const [step, setStep] = React.useState(0);

  const initialProperty = properties.find((property) => property.id === defaultPropertyId);
  const [form, setForm] = React.useState<FormState>({
    propertyId: initialProperty?.id ?? '',
    unitId: '',
    tenantId: '',
    reference: nextReference,
    startDate: isoDate(today),
    endDate: isoDate(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())),
    rentAmount: String(initialProperty?.rentAmount ?? ''),
    chargesAmount: String(initialProperty?.chargesAmount ?? ''),
    depositAmount: String(initialProperty?.depositAmount ?? ''),
    advanceMonths: '2',
    periodicity: 'MENSUEL',
    noticePeriodDays: '30',
    penaltyRatePercent: '',
    notes: '',
  });

  const property = properties.find((item) => item.id === form.propertyId);
  const unit = property?.units.find((item) => item.id === form.unitId);
  const tenant = tenants.find((item) => item.id === form.tenantId);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function selectProperty(propertyId: string) {
    const selected = properties.find((item) => item.id === propertyId);
    setForm((previous) => ({
      ...previous,
      propertyId,
      unitId: '',
      rentAmount: String(selected?.rentAmount ?? ''),
      chargesAmount: String(selected?.chargesAmount ?? ''),
      depositAmount: String(selected?.depositAmount ?? ''),
    }));
  }

  function selectUnit(unitId: string) {
    const selected = property?.units.find((item) => item.id === unitId);
    setForm((previous) => ({
      ...previous,
      unitId,
      rentAmount: String(selected?.rentAmount ?? previous.rentAmount),
      chargesAmount: String(selected?.chargesAmount ?? previous.chargesAmount),
      depositAmount: String(selected?.depositAmount ?? previous.depositAmount),
    }));
  }

  async function handleSubmit() {
    const payload = {
      propertyId: form.propertyId,
      unitId: form.unitId || undefined,
      tenantId: form.tenantId,
      reference: form.reference,
      startDate: form.startDate,
      endDate: form.endDate,
      rentAmount: form.rentAmount,
      chargesAmount: form.chargesAmount || 0,
      depositAmount: form.depositAmount || 0,
      advanceMonths: form.advanceMonths || 0,
      periodicity: form.periodicity,
      noticePeriodDays: form.noticePeriodDays || 30,
      penaltyRatePercent: form.penaltyRatePercent || undefined,
      notes: form.notes || undefined,
      generateSchedule: true,
    };

    const ok = await submit(payload, {
      successMessage: 'Contrat créé, échéancier généré',
      redirectTo: '/contrats',
    });
    if (ok) router.refresh();
  }

  const steps = ['Bien & logement', 'Locataire & conditions', 'Récapitulatif'];
  const canContinue =
    step === 0
      ? Boolean(form.propertyId)
      : step === 1
        ? Boolean(form.tenantId && form.reference && form.startDate && form.endDate && form.rentAmount)
        : true;

  return (
    <div className="space-y-4">
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                index < step
                  ? 'bg-emerald-500 text-white'
                  : index === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {index < step ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={`whitespace-nowrap text-xs font-medium ${index === step ? '' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {index < steps.length - 1 ? <span className="h-px w-6 bg-border" /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Quel bien est loué ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Bien" htmlFor="propertyId" required>
              <Select id="propertyId" value={form.propertyId} onChange={(event) => selectProperty(event.target.value)}>
                <option value="">Sélectionner un bien…</option>
                {properties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reference} — {item.name ?? PROPERTY_TYPE_LABELS[item.type]} ({item.district})
                  </option>
                ))}
              </Select>
            </Field>

            {property && property.units.length > 0 ? (
              <Field label="Logement (lot)" htmlFor="unitId" hint="Laisser vide pour louer le bien entier">
                <Select id="unitId" value={form.unitId} onChange={(event) => selectUnit(event.target.value)}>
                  <option value="">Bien entier</option>
                  {property.units.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {property ? (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">
                  {property.address}, {property.district}
                </p>
                <p className="text-xs text-muted-foreground">
                  Loyer indicatif {formatFCFA(unit?.rentAmount ?? property.rentAmount)} · charges{' '}
                  {formatFCFA(unit?.chargesAmount ?? property.chargesAmount)} · caution{' '}
                  {formatFCFA(unit?.depositAmount ?? property.depositAmount)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Locataire et conditions financières</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Locataire" htmlFor="tenantId" required>
                <Select id="tenantId" value={form.tenantId} onChange={(event) => update('tenantId', event.target.value)}>
                  <option value="">Sélectionner un locataire…</option>
                  {tenants.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.firstName} {item.lastName} — {item.phone}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Référence du bail" htmlFor="reference" required>
                <Input
                  id="reference"
                  value={form.reference}
                  onChange={(event) => update('reference', event.target.value)}
                  required
                />
              </Field>
              <Field label="Date de début" htmlFor="startDate" required>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => update('startDate', event.target.value)}
                  required
                />
              </Field>
              <Field label="Date de fin" htmlFor="endDate" required>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => update('endDate', event.target.value)}
                  required
                />
              </Field>
              <Field label="Loyer (FCFA)" htmlFor="rentAmount" required>
                <Input
                  id="rentAmount"
                  type="number"
                  min={0}
                  step={5000}
                  value={form.rentAmount}
                  onChange={(event) => update('rentAmount', event.target.value)}
                  required
                />
              </Field>
              <Field label="Charges (FCFA)" htmlFor="chargesAmount">
                <Input
                  id="chargesAmount"
                  type="number"
                  min={0}
                  step={5000}
                  value={form.chargesAmount}
                  onChange={(event) => update('chargesAmount', event.target.value)}
                />
              </Field>
              <Field label="Caution (FCFA)" htmlFor="depositAmount">
                <Input
                  id="depositAmount"
                  type="number"
                  min={0}
                  step={5000}
                  value={form.depositAmount}
                  onChange={(event) => update('depositAmount', event.target.value)}
                />
              </Field>
              <Field label="Avance (mois)" htmlFor="advanceMonths">
                <Input
                  id="advanceMonths"
                  type="number"
                  min={0}
                  max={24}
                  value={form.advanceMonths}
                  onChange={(event) => update('advanceMonths', event.target.value)}
                />
              </Field>
              <Field label="Périodicité" htmlFor="periodicity">
                <Select
                  id="periodicity"
                  value={form.periodicity}
                  onChange={(event) => update('periodicity', event.target.value as FormState['periodicity'])}
                >
                  {Object.entries(PERIODICITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Préavis (jours)" htmlFor="noticePeriodDays">
                <Input
                  id="noticePeriodDays"
                  type="number"
                  min={0}
                  max={365}
                  value={form.noticePeriodDays}
                  onChange={(event) => update('noticePeriodDays', event.target.value)}
                />
              </Field>
              <Field label="Pénalité de retard (%/mois)" htmlFor="penaltyRatePercent" hint="Vide = barème agence">
                <Input
                  id="penaltyRatePercent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.penaltyRatePercent}
                  onChange={(event) => update('penaltyRatePercent', event.target.value)}
                />
              </Field>
            </div>
            <Field label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" /> Récapitulatif avant validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Bien</p>
                <p className="font-medium">
                  {property?.reference} — {property?.address}, {property?.district}
                  {unit ? ` · ${unit.name}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Locataire</p>
                <p className="font-medium">
                  {tenant?.firstName} {tenant?.lastName} · {tenant?.phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Période</p>
                <p className="font-medium">
                  {formatDate(form.startDate)} → {formatDate(form.endDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loyer + charges</p>
                <p className="font-medium">
                  {formatFCFA(Number(form.rentAmount))} + {formatFCFA(Number(form.chargesAmount || 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Caution / avance</p>
                <p className="font-medium">
                  {formatFCFA(Number(form.depositAmount || 0))} · {form.advanceMonths} mois
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Périodicité / préavis</p>
                <p className="font-medium">
                  {PERIODICITY_LABELS[form.periodicity]} · {form.noticePeriodDays} jours
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">Le logement passera en « occupé »</Badge>
              <Badge variant="info">L&apos;échéancier sera généré automatiquement</Badge>
            </div>
            <ErrorMessage error={error} />
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
          <ChevronLeft className="size-4" /> Précédent
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((value) => value + 1)} disabled={!canContinue}>
            Continuer <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={loading}>
            <Check className="size-4" /> Créer le contrat
          </Button>
        )}
      </div>
    </div>
  );
}
