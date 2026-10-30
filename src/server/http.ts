import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ForbiddenError } from '@/lib/permissions';
import { getCurrentUser, type SessionUser } from '@/server/session';
import { can, type Permission } from '@/lib/permissions';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Garde d'API : session + organisation + permission. */
export async function requireApiUser(
  permission?: Permission,
): Promise<SessionUser & { organizationId: string }> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'Session expirée. Merci de vous reconnecter.');
  if (!user.organizationId) throw new ApiError(403, 'Aucune organisation associée à ce compte.');
  if (permission && !can(user.role, permission)) {
    throw new ApiError(403, "Vous n'avez pas les droits requis pour cette action.");
  }
  return user as SessionUser & { organizationId: string };
}

/** Centralise le rendu d'erreur des routes API (Zod, permissions, métier). */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Certains champs sont invalides.',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'Une entrée avec ces informations existe déjà (doublon).' },
        { status: 409 },
      );
    }
    if (code === 'P2003' || code === 'P2014') {
      return NextResponse.json(
        { error: 'Opération impossible : des données liées existent encore.' },
        { status: 409 },
      );
    }
    if (code === 'P2025') {
      return NextResponse.json({ error: 'Élément introuvable.' }, { status: 404 });
    }
  }
  console.error('[api] erreur inattendue', error);
  const message =
    process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Une erreur inattendue est survenue. Réessayez dans un instant.';
  return NextResponse.json({ error: message }, { status: 500 });
}
