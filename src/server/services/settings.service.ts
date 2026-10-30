import { randomBytes } from 'node:crypto';
import { addDays } from 'date-fns';
import type { z } from 'zod';
import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import { normalizePhone } from '@/lib/utils';
import type { invitationSchema, settingsSchema } from '@/lib/validations';

export type SettingsInputZ = z.infer<typeof settingsSchema>;
export type InvitationInputZ = z.infer<typeof invitationSchema>;

export async function getOrganizationSettings(organizationId: string) {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new ApiError(404, 'Organisation introuvable.');
  return organization;
}

export async function updateOrganizationSettings(organizationId: string, input: SettingsInputZ) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city,
      logoUrl: input.logoUrl || null,
      primaryColor: input.primaryColor,
      commissionRate: input.commissionRate,
      penaltyRatePercent: input.penaltyRatePercent,
      penaltyGraceDays: input.penaltyGraceDays,
      reminderOffsets: [...new Set(input.reminderOffsets)].sort((a, b) => a - b),
      reminderChannels: [...new Set(input.reminderChannels)],
      reminderTemplate: input.reminderTemplate,
      receiptPrefix: input.receiptPrefix,
      receiptCounter: input.receiptCounter,
    },
  });
}

export async function listTeam(organizationId: string) {
  const [members, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { firstName: true, lastName: true } } },
      take: 50,
    }),
  ]);

  return { members, invitations };
}

export async function inviteMember(
  organizationId: string,
  input: InvitationInputZ,
  options: { invitedById?: string } = {},
) {
  if (!input.email && !input.phone) {
    throw new ApiError(400, 'Renseignez au moins un e-mail ou un téléphone pour envoyer l’invitation.');
  }

  if (input.role === 'PROPRIETAIRE' && !input.ownerId) {
    throw new ApiError(400, 'Sélectionnez le propriétaire à rattacher à ce compte.');
  }
  if (input.role === 'LOCATAIRE' && !input.tenantId) {
    throw new ApiError(400, 'Sélectionnez le locataire à rattacher à ce compte.');
  }

  const token = randomBytes(24).toString('hex');
  const invitation = await prisma.invitation.create({
    data: {
      organizationId,
      email: input.email || null,
      phone: input.phone ? normalizePhone(input.phone) : null,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      role: input.role,
      token,
      ownerId: input.ownerId || null,
      tenantId: input.tenantId || null,
      invitedById: options.invitedById ?? null,
      expiresAt: addDays(new Date(), 14),
    },
  });

  return { invitation, url: `/invitation/${token}` };
}

export async function revokeInvitation(organizationId: string, invitationId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId },
    select: { id: true },
  });
  if (!invitation) throw new ApiError(404, 'Invitation introuvable.');
  await prisma.invitation.update({ where: { id: invitationId }, data: { status: 'ANNULEE' } });
}

export async function getInvitationByToken(token: string) {
  return prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true, city: true } } },
  });
}

export async function updateMember(
  organizationId: string,
  memberId: string,
  data: { role?: 'ADMIN_AGENCE' | 'AGENT' | 'COMPTABLE'; isActive?: boolean },
  actorId: string,
) {
  const member = await prisma.user.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true, role: true },
  });
  if (!member) throw new ApiError(404, 'Collaborateur introuvable.');
  if (member.id === actorId && data.isActive === false) {
    throw new ApiError(400, 'Vous ne pouvez pas désactiver votre propre compte.');
  }
  if ((member.role === 'PROPRIETAIRE' || member.role === 'LOCATAIRE') && data.role) {
    throw new ApiError(400, 'Un compte propriétaire ou locataire ne peut pas changer de rôle.');
  }

  return prisma.user.update({
    where: { id: memberId },
    data: { ...(data.role ? { role: data.role } : {}), ...(data.isActive === undefined ? {} : { isActive: data.isActive }) },
    select: { id: true, role: true, isActive: true },
  });
}
