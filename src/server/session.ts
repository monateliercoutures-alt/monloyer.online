import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import type { Organization, Role } from '@prisma/client';
import { prisma } from '@/server/db';
import { can, isStaff, type Permission } from '@/lib/permissions';

export const SESSION_COOKIE = 'ml_session';
/** Cookie miroir non httpOnly : sert uniquement à détecter un blocage navigateur. */
export const SESSION_MARKER_COOKIE = 'ml_session_ok';
const SESSION_DURATION_DAYS = 30;

/**
 * Attributs du cookie de session, choisis pour fonctionner partout :
 *
 * - Hébergement réel (Vercel, aperçu E2B servi en HTTPS, souvent dans une
 *   iframe d'un autre domaine) : `Secure` + `SameSite=None` + `Partitioned`.
 *   Sans cela, le navigateur n'envoie pas le cookie dans l'iframe et
 *   l'utilisateur retombe indéfiniment sur l'écran de connexion.
 * - Développement local en HTTP (`npm run dev` sur localhost) : `Lax` sans
 *   `Secure`, sinon le navigateur refuserait le cookie.
 */
async function sessionCookieOptions(expiresAt: Date) {
  const requestHeaders = await headers();
  const host = (requestHeaders.get('host') ?? '').split(':')[0];
  const forwardedProto = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const isLocalHttp =
    (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') && forwardedProto !== 'https';

  return {
    path: '/',
    expires: expiresAt,
    ...(isLocalHttp
      ? { secure: false, sameSite: 'lax' as const }
      : { secure: true, sameSite: 'none' as const, partitioned: true }),
  };
}

export type SessionUser = {
  id: string;
  organizationId: string | null;
  role: Role;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  organization: Organization | null;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Crée une session côté base + pose le cookie httpOnly sécurisé. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const headerList = await headers();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: headerList.get('user-agent')?.slice(0, 255) ?? null,
      ipAddress:
        headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        headerList.get('x-real-ip') ??
        null,
    },
  });

  const cookieStore = await cookies();
  const options = await sessionCookieOptions(expiresAt);

  // Cookie httpOnly : c'est lui qui porte la session.
  cookieStore.set(SESSION_COOKIE, token, { ...options, httpOnly: true });
  // Témoin lisible par le navigateur : permet au formulaire de détecter un
  // blocage des cookies (aperçu en iframe) et de proposer une solution.
  cookieStore.set(SESSION_MARKER_COOKIE, '1', { ...options, httpOnly: false });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SESSION_MARKER_COOKIE);
}

/** Utilisateur courant (ou null) — la session est vérifiée côté serveur à chaque appel. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { organization: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    organizationId: user.organizationId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    organization: user.organization,
  };
}

/** Garde-fou pour les pages protégées. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?erreur=session');
  return user;
}

/**
 * Page d'accueil d'un utilisateur : les comptes propriétaire/locataire sont
 * dirigés vers leur espace personnel, les collaborateurs vers le tableau de bord.
 */
export function homePathForRole(role: Role): string {
  return role === 'LOCATAIRE' || role === 'PROPRIETAIRE' ? '/mon-espace' : '/tableau-de-bord';
}

/** Garde-fou + vérification de permission côté serveur. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    // Un propriétaire ou un locataire n'a rien à faire sur les pages agence :
    // on le renvoie vers son espace plutôt que sur une page d'erreur.
    if (!isStaff(user.role)) redirect('/mon-espace');
    redirect('/acces-refuse');
  }
  return user;
}

export async function requireOrganization(): Promise<SessionUser & { organizationId: string }> {
  const user = await requireUser();
  if (!user.organizationId) redirect('/connexion?erreur=session');
  return user as SessionUser & { organizationId: string };
}

/** Contexte multi-tenant : tout service métier reçoit l'organizationId issu de la session. */
export async function getTenantContext(): Promise<{ user: SessionUser; organizationId: string }> {
  const user = await requireOrganization();
  return { user, organizationId: user.organizationId };
}
