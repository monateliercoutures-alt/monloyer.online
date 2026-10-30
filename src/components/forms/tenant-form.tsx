'use client';

import * as React from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
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
import { ErrorMessage, useApiForm } from '@/components/forms/form-utils';

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  idType: string | null;
  idNumber: string | null;
  profession: string | null;
  employer: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  guarantorIdNumber: string | null;
  notes: string | null;
};

export function TenantFormDialog({ tenant }: { tenant?: Tenant }) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm(
    tenant ? `/api/tenants/${tenant.id}` : '/api/tenants',
    tenant ? 'PATCH' : 'POST',
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { isActive: true };
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    const ok = await submit(payload, {
      successMessage: tenant ? 'Dossier locataire mis à jour' : 'Locataire créé',
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {tenant ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" /> Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Nouveau locataire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{tenant ? 'Modifier le locataire' : 'Nouveau locataire'}</DialogTitle>
          <DialogDescription>Identité, profession, garant et contacts d&apos;urgence.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="firstName" required>
              <Input id="firstName" name="firstName" defaultValue={tenant?.firstName} required />
            </Field>
            <Field label="Nom" htmlFor="lastName" required>
              <Input id="lastName" name="lastName" defaultValue={tenant?.lastName} required />
            </Field>
            <Field label="Téléphone" htmlFor="phone" required>
              <Input id="phone" name="phone" defaultValue={tenant?.phone} placeholder="07 00 00 00 00" required />
            </Field>
            <Field label="E-mail" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={tenant?.email ?? ''} />
            </Field>
            <Field label="Type de pièce" htmlFor="idType">
              <Input id="idType" name="idType" defaultValue={tenant?.idType ?? ''} placeholder="CNI / Passeport" />
            </Field>
            <Field label="Numéro de pièce" htmlFor="idNumber">
              <Input id="idNumber" name="idNumber" defaultValue={tenant?.idNumber ?? ''} />
            </Field>
            <Field label="Profession" htmlFor="profession">
              <Input id="profession" name="profession" defaultValue={tenant?.profession ?? ''} />
            </Field>
            <Field label="Employeur" htmlFor="employer">
              <Input id="employer" name="employer" defaultValue={tenant?.employer ?? ''} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Garant (nom)" htmlFor="guarantorName">
              <Input id="guarantorName" name="guarantorName" defaultValue={tenant?.guarantorName ?? ''} />
            </Field>
            <Field label="Garant (téléphone)" htmlFor="guarantorPhone">
              <Input id="guarantorPhone" name="guarantorPhone" defaultValue={tenant?.guarantorPhone ?? ''} />
            </Field>
            <Field label="Contact d'urgence" htmlFor="emergencyContactName">
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                defaultValue={tenant?.emergencyContactName ?? ''}
              />
            </Field>
            <Field label="Téléphone d'urgence" htmlFor="emergencyContactPhone">
              <Input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                defaultValue={tenant?.emergencyContactPhone ?? ''}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={tenant?.notes ?? ''} rows={2} />
          </Field>

          <ErrorMessage error={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              {tenant ? 'Enregistrer' : 'Créer le locataire'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
