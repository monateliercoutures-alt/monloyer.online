import { createHash, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import { logActivity } from '@/server/activity';
import { slugify } from '@/lib/utils';
import type { z } from 'zod';
import type { acceptInvitationSchema, registerSchema } from '@/lib/validations';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

export function hashOtp(code: string): string {
  return createHash('sha256').update(`otp:${code}`).digest('hex');
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'organisation';
  let candidate = root;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}

/** Crée une organisation + son administrateur (inscription libre). */
export async function registerOrganization(
  input: z.infer<typeof registerSchema>,
): Promise<{ userId: string; organizationId: string }> {
  const emailTaken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (emailTaken) {
    throw new ApiError(409, 'Un compte existe déjà avec cette adresse e-mail.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const slug = await uniqueSlug(input.organizationName);
  const phone = input.phone || null;

  const organization = await prisma.organization.create({
    data: {
      name: input.organizationName,
      slug,
      city: input.city || 'Abidjan',
      email: input.email,
      phone,
      users: {
        create: {
          role: 'ADMIN_AGENCE',
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone,
          passwordHash,
          lastLoginAt: new Date(),
        },
      },
    },
    include: { users: true },
  });

  const user = organization.users[0];

  await logActivity({
    organizationId: organization.id,
    actorId: user.id,
    actorName: `${input.firstName} ${input.lastName}`,
    action: 'organization.create',
    entityType: 'Organization',
    entityId: organization.id,
    description: `Création de l'organisation « ${organization.name} »`,
  });

  return { userId: user.id, organizationId: organization.id };
}

export async function authenticateWithPassword(email: string, password: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Message volontairement générique (pas d'énumération de comptes).
  if (!user?.passwordHash) {
    throw new ApiError(401, 'E-mail ou mot de passe incorrect.');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Ce compte est désactivé. Contactez votre administrateur.');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'E-mail ou mot de passe incorrect.');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logActivity({
    organizationId: user.organizationId,
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    action: 'auth.login',
    entityType: 'User',
    entityId: user.id,
    description: 'Connexion par e-mail',
  });

  return user.id;
}

/** Envoie (ou simule l'envoi) d'un code OTP à 6 chiffres par téléphone. */
export async function requestPhoneOtp(
  phone: string,
): Promise<{ debugCode?: string; expiresInMinutes: number }> {
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, isActive: true } });
  if (!user || !user.isActive) {
    throw new ApiError(404, "Aucun compte n'est associé à ce numéro. Demandez une invitation à votre agence.");
  }

  // Limitation : 3 codes maximum par tranche de 10 minutes
  const recent = await prisma.phoneOtp.count({
    where: { phone, createdAt: { gte: new Date(Date.now() - OTP_TTL_MINUTES * 60 * 1000) } },
  });
  if (recent >= 3) {
    throw new ApiError(429, 'Trop de demandes de code. Réessayez dans quelques minutes.');
  }

  const code = String(randomInt(100000, 999999));
  await prisma.phoneOtp.create({
    data: {
      phone,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  // En production, brancher ici un fournisseur SMS/WhatsApp (Orange SMS API, Twilio…).
  console.info(`[otp] code pour ${phone} : ${code}`);

  const debugEnabled =
    process.env.OTP_DEBUG_CODE === 'true' || process.env.NODE_ENV !== 'production';

  return { debugCode: debugEnabled ? code : undefined, expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<string> {
  const otp = await prisma.phoneOtp.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) throw new ApiError(400, 'Aucun code en cours pour ce numéro. Demandez un nouveau code.');
  if (otp.expiresAt < new Date()) throw new ApiError(400, 'Ce code a expiré. Demandez un nouveau code.');
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new ApiError(429, 'Trop de tentatives. Demandez un nouveau code.');

  if (otp.codeHash !== hashOtp(code)) {
    await prisma.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, 'Code incorrect.');
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(404, 'Compte introuvable.');

  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await logActivity({
    organizationId: user.organizationId,
    actorId: user.id,
    actorName: `${user.firstName} ${user.lastName}`,
    action: 'auth.login_otp',
    entityType: 'User',
    entityId: user.id,
    description: 'Connexion par code téléphone',
  });

  return user.id;
}

/** Acceptation d'une invitation (collaborateur, propriétaire ou locataire). */
export async function acceptInvitation(
  input: z.infer<typeof acceptInvitationSchema>,
): Promise<{ userId: string }> {
  const invitation = await prisma.invitation.findUnique({ where: { token: input.token } });

  if (!invitation || invitation.status !== 'EN_ATTENTE') {
    throw new ApiError(400, "Cette invitation n'est plus valide.");
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIREE' } });
    throw new ApiError(400, 'Cette invitation a expiré. Demandez-en une nouvelle.');
  }

  const email = input.email || invitation.email || null;
  const phone = input.phone || invitation.phone || null;

  if (email) {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) throw new ApiError(409, 'Un compte existe déjà avec cette adresse e-mail.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const role = invitation.role as Role;

  const user = await prisma.user.create({
    data: {
      organizationId: invitation.organizationId,
      role,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone,
      passwordHash,
      lastLoginAt: new Date(),
      ...(invitation.ownerId ? { ownerProfile: { connect: { id: invitation.ownerId } } } : {}),
      ...(invitation.tenantId ? { tenantProfile: { connect: { id: invitation.tenantId } } } : {}),
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'ACCEPTEE', acceptedAt: new Date() },
  });

  await logActivity({
    organizationId: invitation.organizationId,
    actorId: user.id,
    actorName: `${input.firstName} ${input.lastName}`,
    action: 'invitation.accept',
    entityType: 'Invitation',
    entityId: invitation.id,
    description: `Invitation acceptée (${role})`,
  });

  return { userId: user.id };
}
