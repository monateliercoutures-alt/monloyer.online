'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { ErrorMessage, useApiForm } from '@/components/forms/form-utils';

export function InvitationForm({
  token,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  defaultPhone,
}: {
  token: string;
  defaultFirstName?: string | null;
  defaultLastName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
}) {
  const router = useRouter();
  const { submit, loading, error } = useApiForm('/api/invitations/accept');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { token };
    formData.forEach((value, key) => {
      if (value !== '') payload[key] = value;
    });
    const ok = await submit(payload, { successMessage: 'Bienvenue !' });
    if (ok) router.push('/tableau-de-bord');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" defaultValue={defaultFirstName ?? ''} required />
        </Field>
        <Field label="Nom" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" defaultValue={defaultLastName ?? ''} required />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={defaultEmail ?? ''} />
        </Field>
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={defaultPhone ?? ''} />
        </Field>
      </div>
      <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum" required>
        <Input id="password" name="password" type="password" minLength={8} required />
      </Field>
      <ErrorMessage error={error} />
      <Button type="submit" className="w-full" loading={loading}>
        Rejoindre l&apos;organisation
      </Button>
    </form>
  );
}
