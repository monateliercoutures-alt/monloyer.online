import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import { DEFAULT_REMINDER_TEMPLATE, REMINDER_CHANNEL_LABELS } from '@/lib/constants';
import { buildReminderMessage } from '@/server/services/payments.service';
import { refreshOrganizationSchedules } from '@/server/services/payments.service';
import type { ReminderChannel } from '@prisma/client';

/**
 * Génère les relances dues (J-3, J0, J+3, J+7, J+15 par défaut) pour toutes les
 * échéances non soldées, sur les canaux configurés par l'organisation.
 * Idempotent : contrainte unique (échéance, canal, décalage).
 */
export async function generateReminders(
  organizationId: string,
  options: { leaseId?: string; createdById?: string } = {},
) {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

  const schedules = await prisma.rentSchedule.findMany({
    where: {
      organizationId,
      status: { in: ['A_VENIR', 'PARTIEL', 'EN_RETARD'] },
      ...(options.leaseId ? { leaseId: options.leaseId } : {}),
    },
    include: {
      lease: {
        include: {
          tenant: true,
          property: true,
          unit: true,
        },
      },
    },
  });

  const channels = (organization.reminderChannels.length
    ? organization.reminderChannels
    : ['WHATSAPP']) as ReminderChannel[];
  const offsets = organization.reminderOffsets.length ? organization.reminderOffsets : [0];
  const template = organization.reminderTemplate || DEFAULT_REMINDER_TEMPLATE;
  const today = startOfDay(new Date());

  let created = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    const base = schedule.rentDue + schedule.chargesDue;
    const balance = Math.max(0, base + schedule.penaltyAmount - schedule.amountPaid);
    if (balance <= 0) {
      skipped += 1;
      continue;
    }

    const daysUntilDue = differenceInCalendarDays(schedule.dueDate, today);

    for (const offset of offsets) {
      // Une relance est due quand on a atteint la date « échéance + offset »
      if (daysUntilDue > -offset) continue;

      const message = buildReminderMessage({
        template,
        tenantName: `${schedule.lease.tenant.firstName} ${schedule.lease.tenant.lastName}`,
        amount: balance,
        dueDate: schedule.dueDate,
        periodLabel: schedule.periodLabel,
        propertyAddress: schedule.lease.property.address,
        organizationName: organization.name,
      });

      for (const channel of channels) {
        try {
          await prisma.reminder.create({
            data: {
              organizationId,
              rentScheduleId: schedule.id,
              channel,
              offsetDays: offset,
              message,
              status: 'A_ENVOYER',
              createdById: options.createdById ?? null,
            },
          });
          created += 1;
        } catch {
          // Doublon : relance déjà programmée pour cette échéance/canal/décalage
          skipped += 1;
        }
      }
    }
  }

  return { created, skipped };
}

export async function listReminders(organizationId: string) {
  return prisma.reminder.findMany({
    where: { organizationId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      rentSchedule: {
        include: {
          lease: {
            include: {
              tenant: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
              property: { select: { address: true, district: true } },
              unit: { select: { name: true } },
            },
          },
        },
      },
    },
    take: 300,
  });
}

/** Simulation d'envoi : le MVP trace l'envoi (WhatsApp/SMS/e-mail via lien wa.me ou mailto). */
export async function markReminderSent(
  organizationId: string,
  reminderId: string,
  status: 'ENVOYE' | 'ECHEC' = 'ENVOYE',
) {
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, organizationId },
    include: {
      rentSchedule: {
        include: { lease: { include: { tenant: true, property: true } } },
      },
    },
  });
  if (!reminder) throw new ApiError(404, 'Relance introuvable.');

  const updated = await prisma.reminder.update({
    where: { id: reminderId },
    data: { status, sentAt: status === 'ENVOYE' ? new Date() : null },
  });

  const tenant = reminder.rentSchedule.lease.tenant;
  const phone = tenant.phone?.replace(/\D/g, '') ?? '';

  return {
    reminder: updated,
    channel: REMINDER_CHANNEL_LABELS[reminder.channel],
    whatsappUrl:
      phone && reminder.channel === 'WHATSAPP'
        ? `https://wa.me/${phone}?text=${encodeURIComponent(reminder.message)}`
        : null,
    mailtoUrl:
      tenant.email && reminder.channel === 'EMAIL'
        ? `mailto:${tenant.email}?subject=${encodeURIComponent('Relance de loyer')}&body=${encodeURIComponent(reminder.message)}`
        : null,
  };
}

/** Cron quotidien : recalcul des pénalités puis génération des relances pour toutes les agences. */
export async function runDailyReminders() {
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  let totalCreated = 0;

  for (const organization of organizations) {
    await refreshOrganizationSchedules(organization.id);
    const result = await generateReminders(organization.id);
    totalCreated += result.created;
  }

  return { organizations: organizations.length, created: totalCreated };
}

export function reminderDueDate(base: Date, offset: number): Date {
  return addDays(base, offset);
}
