import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import type { Organization, Role } from '@prisma/client';
import { prisma } from '@/server/db';
import { can, type Permission } from '@/lib/permissions';

export const SESSION_COOKIE = 'ml_session';
const SESSION_DURATION_DAYS = 30;

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
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

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
  if (!user) redirect('/connexion');
  return user;
}

/** Garde-fou + vérification de permission côté serveur. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect('/acces-refuse');
  return user;
}

export async function requireOrganization(): Promise<SessionUser & { organizationId: string }> {
  const user = await requireUser();
  if (!user.organizationId) redirect('/connexion');
  return user as SessionUser & { organizationId: string };
}

/** Contexte multi-tenant : tout service métier reçoit l'organizationId issu de la session. */
export async function getTenantContext(): Promise<{ user: SessionUser; organizationId: string }> {
  const user = await requireOrganization();
  return { user, organizationId: user.organizationId };
}
