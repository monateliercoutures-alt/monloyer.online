'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { formatFCFA, formatDate } from '@/lib/format';
import { ErrorMessage, MoneyHint, useApiForm } from '@/components/forms/form-utils';
import { apiRequest } from '@/lib/api-client';

type LeaseOption = {
  id: string;
  reference: string;
  tenantName: string;
  propertyLabel: string;
  rentAmount: number;
  chargesAmount: number;
};

type ScheduleOption = {
  id: string;
  periodLabel: string;
  dueDate: string;
  status: string;
  rentDue: number;
  chargesDue: number;
  penaltyAmount: number;
  amountPaid: number;
};

export function PaymentFormDialog({
  leases,
  defaultLeaseId,
}: {
  leases: LeaseOption[];
  defaultLeaseId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm('/api/payments');
  const [leaseId, setLeaseId] = React.useState(defaultLeaseId ?? leases[0]?.id ?? '');
  const [schedules, setSchedules] = React.useState<ScheduleOption[]>([]);
  const [scheduleId, setScheduleId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [defaultAmount, setDefaultAmount] = React.useState(0);
  const [loadingSchedules, setLoadingSchedules] = React.useState(false);

  const loadSchedules = React.useCallback(async (id: string) => {
    if (!id) return;
    setLoadingSchedules(true);
    try {
      const result = await apiRequest<{ data: { rentSchedules: ScheduleOption[] } }>(`/api/leases/${id}`);
      const unpaid = (result.data.rentSchedules ?? []).filter((schedule) => schedule.status !== 'PAYE');
      setSchedules(unpaid);
      const first = unpaid[0];
      if (first) {
        setScheduleId(first.id);
        const balance = Math.max(
          0,
          first.rentDue + first.chargesDue + first.penaltyAmount - first.amountPaid,
        );
        setDefaultAmount(balance);
        setAmount(String(balance));
      } else {
        setScheduleId('');
        setDefaultAmount(0);
        setAmount('');
      }
    } catch {
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) void loadSchedules(leaseId);
  }, [open, leaseId, loadSchedules]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      leaseId,
      rentScheduleId: scheduleId || undefined,
      issueReceipt: formData.get('issueReceipt') === 'on',
    };
    formData.forEach((value, key) => {
      if (value !== '' && key !== 'issueReceipt') payload[key] = value;
    });
    const ok = await submit(payload, { successMessage: 'Paiement enregistré, quittance générée' });
    if (ok) {
      setOpen(false);
      setAmount('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Encaisser un paiement</DialogTitle>
          <DialogDescription>
            Espèces, virement, Mobile Money ou chèque. Les paiements partiels sont acceptés.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Contrat" htmlFor="leaseId" required>
            <Select
              id="leaseId"
              value={leaseId}
              onChange={(event) => setLeaseId(event.target.value)}
              required
            >
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.reference} — {lease.tenantName} ({lease.propertyLabel})
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Échéance"
            htmlFor="rentScheduleId"
            hint={loadingSchedules ? 'Chargement des échéances…' : 'Les échéances soldées sont masquées'}
          >
            <Select
              id="rentScheduleId"
              value={scheduleId}
              onChange={(event) => {
                setScheduleId(event.target.value);
                const selected = schedules.find((schedule) => schedule.id === event.target.value);
                if (selected) {
                  const balance = Math.max(
                    0,
                    selected.rentDue + selected.chargesDue + selected.penaltyAmount - selected.amountPaid,
                  );
                  setAmount(String(balance));
                }
              }}
            >
              <option value="">Imputation automatique (plus ancienne impayée)</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.periodLabel} — reste{' '}
                  {formatFCFA(
                    Math.max(0, schedule.rentDue + schedule.chargesDue + schedule.penaltyAmount - schedule.amountPaid),
                  )}{' '}
                  ({formatDate(schedule.dueDate)})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Montant reçu (FCFA)" htmlFor="amount" required>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={1}
                step={500}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
              <MoneyHint value={amount} />
            </Field>
            <Field label="Mode de paiement" htmlFor="method" required>
              <Select id="method" name="method" defaultValue="MOBILE_MONEY">
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date du paiement" htmlFor="paidAt" required>
              <Input
                id="paidAt"
                name="paidAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </Field>
            <Field label="Référence" htmlFor="reference" hint="N° transaction Wave / virement">
              <Input id="reference" name="reference" placeholder="WAVE-123456" />
            </Field>
          </div>

          <Field label="Justificatif" htmlFor="proof" hint="Photo ou PDF du reçu (optionnel, 2 Mo max)">
            <Input
              id="proof"
              name="proof"
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 2_000_000) {
                  alert('Justificatif trop volumineux (2 Mo maximum).');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const input = document.getElementById('proofUrl') as HTMLInputElement | null;
                  const nameInput = document.getElementById('proofName') as HTMLInputElement | null;
                  if (input && typeof reader.result === 'string') input.value = reader.result;
                  if (nameInput) nameInput.value = file.name;
                };
                reader.readAsDataURL(file);
              }}
            />
            <input type="hidden" id="proofUrl" name="proofUrl" />
            <input type="hidden" id="proofName" name="proofName" />
          </Field>

          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} placeholder="Versement partiel, solde promis…" />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="issueReceipt" defaultChecked className="size-4 rounded border-input" />
            Générer automatiquement la quittance
          </label>

          <ErrorMessage error={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Enregistrer le paiement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
