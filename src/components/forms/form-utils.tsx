'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';

type Method = 'POST' | 'PATCH' | 'DELETE';

/** Soumission de formulaire vers une route API + rafraîchissement des données serveur. */
export function useApiForm(url: string, method: Method = 'POST') {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(
    async (
      payload: unknown,
      options: { successMessage?: string; redirectTo?: string } = {},
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<{ redirect?: string }>(url, {
          method,
          body: JSON.stringify(payload),
        });
        if (options.successMessage) toast.success(options.successMessage);
        router.refresh();
        if (options.redirectTo) router.push(options.redirectTo);
        else if (result?.redirect) router.push(result.redirect);
        return true;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Une erreur est survenue.';
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [url, method, router],
  );

  return { submit, loading, error, setError };
}

/** Convertit un FormData en objet JSON (les nombres restent des chaînes, Zod les coerce). */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (value === '') return;
    if (key.endsWith('[]')) {
      const cleanKey = key.slice(0, -2);
      const list = (result[cleanKey] as string[]) ?? [];
      list.push(String(value));
      result[cleanKey] = list;
      return;
    }
    result[key] = value;
  });
  return result;
}

export function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  );
}

/** Champ montant FCFA avec affichage formaté sous le champ. */
export function MoneyHint({ value }: { value: string }) {
  const amount = Number(value.replace(/\s/g, ''));
  if (!value || Number.isNaN(amount)) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {new Intl.NumberFormat('fr-FR').format(amount).replace(/\u202f|\u00a0/g, ' ')} FCFA
    </p>
  );
}
