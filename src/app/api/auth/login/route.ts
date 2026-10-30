import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { loginSchema } from '@/lib/validations';
import { authenticateWithPassword } from '@/server/services/auth.service';
import { createSession, homePathForRole } from '@/server/session';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

/**
 * Connexion. Deux formats acceptés :
 *
 * - `application/json` : utilisé par le formulaire React (fetch), réponse `{ ok, redirect }`.
 * - `application/x-www-form-urlencoded` : soumission HTML classique du formulaire.
 *   Elle renvoie une redirection 303 après avoir posé le cookie. C'est le filet
 *   de sécurité si le JavaScript ne s'exécute pas dans l'aperçu : la connexion
 *   fonctionne quand même, sans page blanche ni formulaire inerte.
 */

/** Construit une URL absolue correcte derrière un proxy (aperçu HTTPS). */
function absoluteUrl(request: Request, path: string): URL {
  const host = request.headers.get('host') ?? 'localhost:3000';
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = forwardedProto === 'https' || !isLocal ? 'https' : 'http';
  return new URL(path, `${proto}://${host}`);
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const isFormPost =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  try {
    let payload;
    if (isFormPost) {
      const form = await request.formData();
      payload = loginSchema.parse({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
    } else {
      payload = loginSchema.parse(await request.json());
    }

    const userId = await authenticateWithPassword(payload.email, payload.password);
    await createSession(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const redirectTo = homePathForRole(user?.role ?? 'AGENT');

    if (isFormPost) {
      return NextResponse.redirect(absoluteUrl(request, redirectTo), 303);
    }
    return NextResponse.json({ ok: true, redirect: redirectTo });
  } catch (error) {
    if (!isFormPost) return handleApiError(error);

    // Formulaire sans JavaScript : on revient sur l'écran de connexion avec un
    // message lisible côté serveur.
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Connexion impossible. Vérifiez vos identifiants.';
    return NextResponse.redirect(
      absoluteUrl(request, `/connexion?erreur=${encodeURIComponent(message)}`),
      303,
    );
  }
}
