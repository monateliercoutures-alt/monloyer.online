'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
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
import { UNIT_STATUS_LABELS } from '@/lib/constants';
import { ErrorMessage, useApiForm } from '@/components/forms/form-utils';

export function UnitFormDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm('/api/units');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { propertyId };
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    const ok = await submit(payload, { successMessage: 'Logement ajouté' });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Ajouter un logement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau logement</DialogTitle>
          <DialogDescription>
            Pour un immeuble ou une résidence : chaque lot suit son propre bail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom du logement" htmlFor="name" required>
              <Input id="name" name="name" placeholder="Appartement 2A" required />
            </Field>
            <Field label="Étage" htmlFor="floor">
              <Input id="floor" name="floor" type="number" min={-5} defaultValue={0} />
            </Field>
            <Field label="Loyer (FCFA)" htmlFor="rentAmount">
              <Input id="rentAmount" name="rentAmount" type="number" min={0} step={5000} />
            </Field>
            <Field label="Charges (FCFA)" htmlFor="chargesAmount">
              <Input id="chargesAmount" name="chargesAmount" type="number" min={0} step={5000} />
            </Field>
            <Field label="Caution (FCFA)" htmlFor="depositAmount">
              <Input id="depositAmount" name="depositAmount" type="number" min={0} step={5000} />
            </Field>
            <Field label="Statut" htmlFor="status">
              <Select id="status" name="status" defaultValue="LIBRE">
                {Object.entries(UNIT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <ErrorMessage error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
