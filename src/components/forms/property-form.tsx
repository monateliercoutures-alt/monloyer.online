'use client';

import * as React from 'react';
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
import { PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS, QUARTIERS_ABIDJAN } from '@/lib/constants';
import { ErrorMessage, MoneyHint, useApiForm } from '@/components/forms/form-utils';

type OwnerOption = { id: string; firstName: string; lastName: string };

type Property = {
  id: string;
  ownerId: string;
  reference: string;
  name: string | null;
  type: keyof typeof PROPERTY_TYPE_LABELS;
  address: string;
  district: string;
  city: string;
  status: keyof typeof PROPERTY_STATUS_LABELS;
  description: string | null;
  rentAmount: number;
  chargesAmount: number;
  depositAmount: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  photos: string[];
};

export function PropertyFormDialog({
  owners,
  property,
}: {
  owners: OwnerOption[];
  property?: Property;
}) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm(
    property ? `/api/properties/${property.id}` : '/api/properties',
    property ? 'PATCH' : 'POST',
  );
  const [rentAmount, setRentAmount] = React.useState(String(property?.rentAmount ?? ''));
  const [photos, setPhotos] = React.useState<string[]>(property?.photos ?? []);

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      alert('Photo trop volumineuse (1,5 Mo maximum pour le MVP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (result) setPhotos((previous) => [...previous, result].slice(0, 4));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { photos };
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    const ok = await submit(payload, {
      successMessage: property ? 'Bien mis à jour' : 'Bien créé',
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {property ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" /> Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Nouveau bien
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{property ? 'Modifier le bien' : 'Nouveau bien'}</DialogTitle>
          <DialogDescription>Adresse, statut, loyer de base, charges et caution.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Propriétaire" htmlFor="ownerId" required>
              <Select id="ownerId" name="ownerId" defaultValue={property?.ownerId} required>
                <option value="">Sélectionner…</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.firstName} {owner.lastName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Référence" htmlFor="reference" hint="Ex. B-0012" required>
              <Input id="reference" name="reference" defaultValue={property?.reference} required />
            </Field>
            <Field label="Désignation" htmlFor="name">
              <Input id="name" name="name" defaultValue={property?.name ?? ''} placeholder="Villa Riviera 3" />
            </Field>
            <Field label="Type de bien" htmlFor="type" required>
              <Select id="type" name="type" defaultValue={property?.type ?? 'APPARTEMENT'}>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Adresse" htmlFor="address" required className="sm:col-span-2">
              <Input id="address" name="address" defaultValue={property?.address} required />
            </Field>
            <Field label="Quartier" htmlFor="district" required>
              <Input
                id="district"
                name="district"
                list="quartiers"
                defaultValue={property?.district}
                required
              />
              <datalist id="quartiers">
                {QUARTIERS_ABIDJAN.map((quartier) => (
                  <option key={quartier} value={quartier} />
                ))}
              </datalist>
            </Field>
            <Field label="Ville" htmlFor="city">
              <Input id="city" name="city" defaultValue={property?.city ?? 'Abidjan'} />
            </Field>
            <Field label="Statut" htmlFor="status">
              <Select id="status" name="status" defaultValue={property?.status ?? 'LIBRE'}>
                {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Loyer de base (FCFA)" htmlFor="rentAmount" required>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                min={0}
                step={5000}
                value={rentAmount}
                onChange={(event) => setRentAmount(event.target.value)}
                required
              />
              <MoneyHint value={rentAmount} />
            </Field>
            <Field label="Charges mensuelles (FCFA)" htmlFor="chargesAmount">
              <Input
                id="chargesAmount"
                name="chargesAmount"
                type="number"
                min={0}
                step={5000}
                defaultValue={property?.chargesAmount ?? 0}
              />
            </Field>
            <Field label="Caution (FCFA)" htmlFor="depositAmount">
              <Input
                id="depositAmount"
                name="depositAmount"
                type="number"
                min={0}
                step={5000}
                defaultValue={property?.depositAmount ?? 0}
              />
            </Field>
            <Field label="Chambres" htmlFor="bedrooms">
              <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={property?.bedrooms ?? ''} />
            </Field>
            <Field label="Salles d'eau" htmlFor="bathrooms">
              <Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={property?.bathrooms ?? ''} />
            </Field>
            <Field label="Surface (m²)" htmlFor="areaSqm">
              <Input id="areaSqm" name="areaSqm" type="number" min={0} defaultValue={property?.areaSqm ?? ''} />
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={property?.description ?? ''} rows={2} />
          </Field>

          <div className="space-y-2">
            <Field label="Photos" htmlFor="photo" hint="4 photos maximum, 1,5 Mo par image (MVP)">
              <Input id="photo" type="file" accept="image/*" onChange={handlePhoto} />
            </Field>
            {photos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="size-16 rounded-lg border object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((previous) => previous.filter((_, i) => i !== index))}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground"
                      aria-label="Retirer la photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <ErrorMessage error={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              {property ? 'Enregistrer' : 'Créer le bien'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
