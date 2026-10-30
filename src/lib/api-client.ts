/** Petit client fetch typé : renvoie un message d'erreur lisible en cas d'échec. */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const body = payload as { error?: string; issues?: { path: string; message: string }[] } | null;
    const detail = body?.issues?.map((issue) => issue.message).join(' · ');
    throw new Error(detail || body?.error || 'Une erreur est survenue.');
  }

  return payload as T;
}
