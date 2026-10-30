import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { fullName } from '@/lib/utils';

type LogInput = {
  organizationId: string | null;
  actorId?: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

/**
 * Journal d'activité : qui a fait quoi, quand.
 * N'échoue jamais la requête métier en cours (best effort).
 */
export async function logActivity(input: LogInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? 'Système',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description ?? null,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("[journal] impossible d'enregistrer l'activité", error);
  }
}

export function actorNameOf(user: { firstName?: string | null; lastName?: string | null }): string {
  return fullName(user.firstName, user.lastName) || 'Utilisateur';
}
