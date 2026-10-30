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
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants';
import { ErrorMessage, MoneyHint, useApiForm } from '@/components/forms/form-utils';

export function ExpenseFormDialog({
  properties,
  owners,
}: {
  properties: { id: string; label: string; ownerId: string }[];
  owners: { id: string; label: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm('/api/expenses');
  const [amount, setAmount] = React.useState('');
  const [propertyId, setPropertyId] = React.useState('');
  const [ownerId, setOwnerId] = React.useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      propertyId: propertyId || undefined,
      ownerId: ownerId || undefined,
    };
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    const ok = await submit(payload, { successMessage: 'Dépense enregistrée' });
    if (ok) {
      setOpen(false);
      setAmount('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Nouvelle dépense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer une dépense</DialogTitle>
          <DialogDescription>
            Travaux, réparations, charges de copropriété, honoraires… imputables à un bien et/ou un propriétaire.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Catégorie" htmlFor="category" required>
              <Select id="category" name="category" defaultValue="REPARATION">
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Montant (FCFA)" htmlFor="amount" required>
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
            <Field label="Libellé" htmlFor="label" required className="sm:col-span-2">
              <Input id="label" name="label" placeholder="Réparation pompe à eau" required />
            </Field>
            <Field label="Date" htmlFor="date" required>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </Field>
            <Field label="Fournisseur" htmlFor="supplier">
              <Input id="supplier" name="supplier" placeholder="Plomberie Cocody" />
            </Field>
            <Field label="Bien concerné" htmlFor="propertyId">
              <Select
                id="propertyId"
                value={propertyId}
                onChange={(event) => {
                  setPropertyId(event.target.value);
                  const property = properties.find((item) => item.id === event.target.value);
                  if (property) setOwnerId(property.ownerId);
                }}
              >
                <option value="">Aucun bien spécifique</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Propriétaire imputé" htmlFor="ownerId" hint="Utilisé dans le relevé de gérance">
              <Select id="ownerId" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                <option value="">—</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} />
          </Field>
          <ErrorMessage error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
