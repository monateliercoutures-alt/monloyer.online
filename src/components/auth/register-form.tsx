'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { apiRequest } from '@/lib/api-client';

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const result = await apiRequest<{ redirect: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Bienvenue sur monloyer.online !');
      router.push(result.redirect);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nom de l'agence / organisation" htmlFor="organizationName" required>
        <Input id="organizationName" name="organizationName" required placeholder="Agence Immo Abidjan" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" required placeholder="Aminata" />
        </Field>
        <Field label="Nom" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" required placeholder="Koné" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adresse e-mail" htmlFor="email" required>
          <Input id="email" name="email" type="email" required placeholder="vous@agence.ci" />
        </Field>
        <Field label="Téléphone" htmlFor="phone" hint="Utilisé pour la connexion par code">
          <Input id="phone" name="phone" type="tel" placeholder="07 00 00 00 00" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ville" htmlFor="city">
          <Input id="city" name="city" defaultValue="Abidjan" />
        </Field>
        <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum" required>
          <Input id="password" name="password" type="password" required minLength={8} />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" loading={loading}>
        <Building2 className="size-4" /> Créer mon espace
      </Button>
    </form>
  );
}
