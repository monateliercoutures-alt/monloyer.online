import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import { computePenalty, deriveRentStatus } from '@/lib/rent';
import type { z } from 'zod';
import type { paymentSchema } from '@/lib/validations';

type Tx = Prisma.TransactionClient | PrismaClient;

export type PaymentInputZ = z.infer<typeof paymentSchema>;

/** Numérotation séquentielle par organisation : QUI-2026-0001. */
export async function nextReceiptNumber(tx: Tx, organizationId: string): Promise<string> {
  const organization = await tx.organization.update({
    where: { id: organizationId },
    data: { receiptCounter: { increment: 1 } },
    select: { receiptCounter: true, receiptPrefix: true },
  });
  const year = new Date().getFullYear();
  return `${organization.receiptPrefix}-${year}-${String(organization.receiptCounter).padStart(4, '0')}`;
}

/** Recalcule une échéance : montant payé, pénalité de retard et statut. */
export async function recalculateSchedule(tx: Tx, scheduleId: string) {
  const schedule = await tx.rentSchedule.findUnique({
    where: { id: scheduleId },
    include: { lease: { include: { organization: true } } },
  });
  if (!schedule) return null;

  const aggregate = await tx.payment.aggregate({
    where: { rentScheduleId: scheduleId, status: 'VALIDE' },
    _sum: { amount: true },
  });
  const amountPaid = aggregate._sum.amount ?? 0;
  const base = schedule.rentDue + schedule.chargesDue;
  const fullyPaid = amountPaid >= base && base > 0;

  const penaltyRate = schedule.lease.penaltyRatePercent ?? schedule.lease.organization.penaltyRatePercent;
  const graceDays = schedule.lease.organization.penaltyGraceDays;
  const penaltyAmount = fullyPaid
    ? 0
    : computePenalty({ amountBase: base, dueDate: schedule.dueDate, penaltyRatePercent: penaltyRate, graceDays });

  const status = deriveRentStatus(
    { rentDue: schedule.rentDue, chargesDue: schedule.chargesDue, penaltyAmount, amountPaid },
    schedule.dueDate,
  );

  return tx.rentSchedule.update({
    where: { id: scheduleId },
    data: { amountPaid, penaltyAmount, status },
    include: { lease: { include: { tenant: true } } },
  });
}

/** Recalcule toutes les échéances d'une organisation (appelé par le cron et la page relances). */
export async function refreshOrganizationSchedules(organizationId: string): Promise<number> {
  const schedules = await prisma.rentSchedule.findMany({
    where: { organizationId, status: { in: ['A_VENIR', 'PARTIEL', 'EN_RETARD'] } },
    select: { id: true },
  });
  for (const schedule of schedules) {
    await recalculateSchedule(prisma, schedule.id);
  }
  return schedules.length;
}

export async function listPayments(organizationId: string, options: { leaseId?: string } = {}) {
  return prisma.payment.findMany({
    where: { organizationId, ...(options.leaseId ? { leaseId: options.leaseId } : {}) },
    orderBy: { paidAt: 'desc' },
    include: {
      lease: { include: { property: { select: { address: true, district: true } }, unit: true } },
      tenant: { select: { id: true, firstName: true, lastName: true } },
      rentSchedule: { select: { periodLabel: true, dueDate: true } },
      receipt: { select: { id: true, number: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
    take: 500,
  });
}

/**
 * Enregistre un paiement (manuel, partiel accepté) et émet la quittance.
 * Le solde restant est conservé sur l'échéance.
 */
export async function createPayment(
  organizationId: string,
  input: PaymentInputZ,
  options: { recordedById?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id: input.leaseId, organizationId },
      include: { tenant: true, property: true, unit: true },
    });
    if (!lease) throw new ApiError(400, 'Contrat invalide.');

    let schedule = null;
    if (input.rentScheduleId) {
      schedule = await tx.rentSchedule.findFirst({
        where: { id: input.rentScheduleId, leaseId: lease.id, organizationId },
      });
      if (!schedule) throw new ApiError(400, 'Échéance invalide pour ce contrat.');
    } else {
      // Imputation automatique sur l'échéance impayée la plus ancienne
      schedule = await tx.rentSchedule.findFirst({
        where: { leaseId: lease.id, status: { in: ['EN_RETARD', 'PARTIEL', 'A_VENIR'] } },
        orderBy: { dueDate: 'asc' },
      });
    }

    const payment = await tx.payment.create({
      data: {
        organizationId,
        leaseId: lease.id,
        rentScheduleId: schedule?.id ?? null,
        tenantId: lease.tenantId,
        amount: input.amount,
        method: input.method,
        reference: input.reference || null,
        paidAt: input.paidAt,
        proofUrl: input.proofUrl || null,
        proofName: input.proofName || null,
        recordedById: options.recordedById ?? null,
        notes: input.notes || null,
        status: 'VALIDE',
      },
    });

    if (schedule) await recalculateSchedule(tx, schedule.id);

    let receipt = null;
    if (input.issueReceipt && schedule) {
      const updatedSchedule = await tx.rentSchedule.findUnique({ where: { id: schedule.id } });
      const number = await nextReceiptNumber(tx, organizationId);

      receipt = await tx.receipt.create({
        data: {
          organizationId,
          number,
          paymentId: payment.id,
          leaseId: lease.id,
          tenantId: lease.tenantId,
          periodLabel: updatedSchedule?.periodLabel ?? schedule.periodLabel,
          amountPaid: input.amount,
          chargesPaid: schedule.chargesDue,
          balanceDue: updatedSchedule
            ? Math.max(
                0,
                updatedSchedule.rentDue +
                  updatedSchedule.chargesDue +
                  updatedSchedule.penaltyAmount -
                  updatedSchedule.amountPaid,
              )
            : 0,
          issuedAt: input.paidAt,
          issuedById: options.recordedById ?? null,
        },
      });
    }

    return { payment, receipt, lease };
  });
}

/**
 * Annulation d'un paiement : aucune suppression définitive, on trace le motif.
 * La quittance associée est retirée et les échéances recalculées.
 */
export async function cancelPayment(
  organizationId: string,
  paymentId: string,
  reason: string,
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: { receipt: true },
    });
    if (!payment) throw new ApiError(404, 'Paiement introuvable.');
    if (payment.status === 'ANNULE') throw new ApiError(409, 'Ce paiement est déjà annulé.');

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'ANNULE', cancelledAt: new Date(), cancelReason: reason },
    });

    if (payment.receipt) {
      await tx.receipt.delete({ where: { id: payment.receipt.id } });
    }
    if (payment.rentScheduleId) {
      await recalculateSchedule(tx, payment.rentScheduleId);
    }

    return updated;
  });
}

export async function listReceipts(organizationId: string) {
  return prisma.receipt.findMany({
    where: { organizationId },
    orderBy: { issuedAt: 'desc' },
    include: {
      tenant: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      lease: { include: { property: { select: { address: true, district: true } }, unit: true } },
      payment: { select: { method: true, reference: true } },
    },
    take: 500,
  });
}

export function buildReminderMessage(input: {
  template: string;
  tenantName: string;
  amount: number;
  dueDate: Date;
  periodLabel: string;
  propertyAddress: string;
  organizationName: string;
}): string {
  const amount = new Intl.NumberFormat('fr-FR').format(input.amount).replace(/\u202f|\u00a0/g, ' ');
  return input.template
    .replaceAll('{nom}', input.tenantName)
    .replaceAll('{montant}', `${amount} FCFA`)
    .replaceAll('{date}', input.dueDate.toLocaleDateString('fr-FR'))
    .replaceAll('{periodicite}', input.periodLabel)
    .replaceAll('{logement}', input.propertyAddress)
    .replaceAll('{agence}', input.organizationName);
}
