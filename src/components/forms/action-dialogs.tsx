'use client';

import * as React from 'react';
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
import { ErrorMessage, useApiForm } from '@/components/forms/form-utils';

/** Résiliation d'un bail avec motif et date d'effet. */
export function TerminateLeaseDialog({ leaseId, leaseReference }: { leaseId: string; leaseReference: string }) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm(`/api/leases/${leaseId}/terminate`);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(Object.fromEntries(formData.entries()), {
      successMessage: 'Contrat résilié, logement libéré',
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Résilier le bail
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Résilier le contrat {leaseReference}</DialogTitle>
          <DialogDescription>
            Le logement repassera en « libre ». Les échéances futures non réglées seront supprimées.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Date d'effet" htmlFor="terminationDate" required>
            <Input
              id="terminationDate"
              name="terminationDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <Field label="Motif" htmlFor="reason" required>
            <Textarea id="reason" name="reason" rows={3} placeholder="Départ volontaire avec préavis de 30 jours" required />
          </Field>
          <ErrorMessage error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" loading={loading}>
              Confirmer la résiliation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Annulation d'un paiement (jamais de suppression définitive). */
export function CancelPaymentDialog({ paymentId, amountLabel }: { paymentId: string; amountLabel: string }) {
  const [open, setOpen] = React.useState(false);
  const { submit, loading, error } = useApiForm(`/api/payments/${paymentId}/cancel`);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(Object.fromEntries(formData.entries()), {
      successMessage: 'Paiement annulé (tracé au journal)',
    });
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          Annuler
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler le paiement de {amountLabel}</DialogTitle>
          <DialogDescription>
            Le paiement reste dans l&apos;historique avec le statut « annulé » et son motif. La quittance associée
            est retirée et l&apos;échéance recalculée.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Motif d'annulation" htmlFor="reason" required>
            <Textarea id="reason" name="reason" rows={3} placeholder="Chèque impayé, erreur de saisie…" required />
          </Field>
          <ErrorMessage error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Retour
            </Button>
            <Button type="submit" variant="destructive" loading={loading}>
              Annuler le paiement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Formulaire d'invitation d'un collaborateur / propriétaire / locataire. */
export function InvitationDialog({
  owners,
  tenants,
}: {
  owners: { id: string; label: string }[];
  tenants: { id: string; label: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<'AGENT' | 'COMPTABLE' | 'ADMIN_AGENCE' | 'PROPRIETAIRE' | 'LOCATAIRE'>('AGENT');
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const { submit, loading, error } = useApiForm('/api/team/invitations');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { role };
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    const result = await submit(payload, { successMessage: 'Invitation créée' });
    if (result) {
      setInviteUrl(`${window.location.origin}/invitation/${payload.token ?? ''}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Inviter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            Un lien sécurisé valable 14 jours est généré : partagez-le par WhatsApp ou e-mail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="firstName">
              <Input id="firstName" name="firstName" />
            </Field>
            <Field label="Nom" htmlFor="lastName">
              <Input id="lastName" name="lastName" />
            </Field>
            <Field label="E-mail" htmlFor="email">
              <Input id="email" name="email" type="email" />
            </Field>
            <Field label="Téléphone" htmlFor="phone">
              <Input id="phone" name="phone" />
            </Field>
          </div>

          <Field label="Rôle" htmlFor="role" required>
            <Select id="role" value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="AGENT">Agent</option>
              <option value="COMPTABLE">Comptable</option>
              <option value="ADMIN_AGENCE">Administrateur d&apos;agence</option>
              <option value="PROPRIETAIRE">Propriétaire</option>
              <option value="LOCATAIRE">Locataire</option>
            </Select>
          </Field>

          {role === 'PROPRIETAIRE' ? (
            <Field label="Propriétaire rattaché" htmlFor="ownerId" required>
              <Select id="ownerId" name="ownerId" required>
                <option value="">Sélectionner…</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {role === 'LOCATAIRE' ? (
            <Field label="Locataire rattaché" htmlFor="tenantId" required>
              <Select id="tenantId" name="tenantId" required>
                <option value="">Sélectionner…</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <ErrorMessage error={error} />

          {inviteUrl ? (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              Lien généré : <span className="font-mono">{inviteUrl}</span>
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button type="submit" loading={loading}>
              Générer le lien
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
