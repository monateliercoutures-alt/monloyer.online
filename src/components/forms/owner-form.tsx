'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Pencil, Plus } from 'lucide-react';
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
import { COMMISSION_TYPE_LABELS, MANDATE_TYPE_LABELS } from '@/lib/constants';
import { ErrorMessage, useApiForm } from '@/components/forms/form-utils';

type Owner = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  idNumber: string | null;
  mandateType: 'GESTION_LOCATIVE' | 'MANDAT_SIMPLE';
  mandateStart: string | Date | null;
  mandateEnd: string | Date | null;
  commissionType: 'POURCENTAGE' | 'MONTANT_FIXE';
  commissionValue: number | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  notes: string | null;
  isActive: boolean;
};

export function OwnerFormDialog({ owner }: { owner?: Owner }) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm(
    owner ? `/api/owners/${owner.id}` : '/api/owners',
    owner ? 'PATCH' : 'POST',
  );
  const [commissionType, setCommissionType] = React.useState<'POURCENTAGE' | 'MONTANT_FIXE'>(
    owner?.commissionType ?? 'POURCENTAGE',
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    payload.isActive = true;
    const ok = await submit(payload, {
      successMessage: owner ? 'Fiche propriétaire mise à jour' : 'Propriétaire créé',
    });
    if (ok) {
      setOpen(false);
      if (!owner) toast.success('Vous pouvez maintenant lui rattacher un bien.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {owner ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" /> Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Nouveau propriétaire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{owner ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}</DialogTitle>
          <DialogDescription>
            Mandat de gestion, taux de commission et coordonnées de paiement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="firstName" required>
              <Input id="firstName" name="firstName" defaultValue={owner?.firstName} required />
            </Field>
            <Field label="Nom" htmlFor="lastName" required>
              <Input id="lastName" name="lastName" defaultValue={owner?.lastName} required />
            </Field>
            <Field label="Téléphone" htmlFor="phone" required>
              <Input id="phone" name="phone" defaultValue={owner?.phone} placeholder="07 00 00 00 00" required />
            </Field>
            <Field label="E-mail" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={owner?.email ?? ''} />
            </Field>
            <Field label="Pièce d'identité (n°)" htmlFor="idNumber">
              <Input id="idNumber" name="idNumber" defaultValue={owner?.idNumber ?? ''} />
            </Field>
            <Field label="Adresse" htmlFor="address">
              <Input id="address" name="address" defaultValue={owner?.address ?? ''} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type de mandat" htmlFor="mandateType">
              <Select id="mandateType" name="mandateType" defaultValue={owner?.mandateType ?? 'GESTION_LOCATIVE'}>
                {Object.entries(MANDATE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type de commission" htmlFor="commissionType">
              <Select
                id="commissionType"
                name="commissionType"
                value={commissionType}
                onChange={(event) => setCommissionType(event.target.value as 'POURCENTAGE' | 'MONTANT_FIXE')}
              >
                {Object.entries(COMMISSION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={commissionType === 'POURCENTAGE' ? 'Commission (%)' : 'Commission (FCFA / échéance)'}
              htmlFor="commissionValue"
              hint="Laisser vide pour appliquer le barème de l'agence"
            >
              <Input
                id="commissionValue"
                name="commissionValue"
                type="number"
                min={0}
                step={commissionType === 'POURCENTAGE' ? '0.5' : '1000'}
                defaultValue={owner?.commissionValue ?? ''}
              />
            </Field>
            <Field label="Début du mandat" htmlFor="mandateStart">
              <Input
                id="mandateStart"
                name="mandateStart"
                type="date"
                defaultValue={owner?.mandateStart ? String(owner.mandateStart).slice(0, 10) : ''}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mode de reversement" htmlFor="paymentMethod">
              <Select id="paymentMethod" name="paymentMethod" defaultValue={owner?.paymentMethod ?? ''}>
                <option value="">—</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="VIREMENT">Virement bancaire</option>
                <option value="ESPECES">Espèces</option>
                <option value="CHEQUE">Chèque</option>
              </Select>
            </Field>
            <Field label="Coordonnées de paiement" htmlFor="paymentDetails">
              <Input
                id="paymentDetails"
                name="paymentDetails"
                placeholder="Wave 07 00 00 00 00 / IBAN"
                defaultValue={owner?.paymentDetails ?? ''}
              />
            </Field>
          </div>

          <Field label="Notes internes" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={owner?.notes ?? ''} rows={2} />
          </Field>

          <ErrorMessage error={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              {owner ? 'Enregistrer' : 'Créer le propriétaire'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
