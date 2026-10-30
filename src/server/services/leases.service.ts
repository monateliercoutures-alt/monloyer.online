import { addMonths } from 'date-fns';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import { buildSchedulePeriods, deriveRentStatus } from '@/lib/rent';
import type { z } from 'zod';
import type { leaseSchema, terminateLeaseSchema } from '@/lib/validations';

export type LeaseInputZ = z.infer<typeof leaseSchema>;

type Tx = Prisma.TransactionClient | PrismaClient;

export async function listLeases(organizationId: string) {
  return prisma.lease.findMany({
    where: { organizationId },
    orderBy: { startDate: 'desc' },
    include: {
      property: { select: { id: true, reference: true, address: true, district: true } },
      unit: { select: { id: true, name: true } },
      tenant: { select: { id: true, firstName: true, lastName: true, phone: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
      rentSchedules: { select: { status: true, amountPaid: true, rentDue: true, chargesDue: true } },
    },
  });
}

export async function getLease(organizationId: string, leaseId: string) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
    include: {
      property: { include: { owner: true } },
      unit: true,
      tenant: true,
      owner: true,
      rentSchedules: { orderBy: { dueDate: 'asc' }, include: { payments: true, reminders: true } },
      payments: { orderBy: { paidAt: 'desc' }, include: { receipt: true } },
      documents: true,
    },
  });
  if (!lease) throw new ApiError(404, 'Contrat introuvable.');
  return lease;
}

/** Règle métier : un logement (ou un bien sans lots) ne peut avoir qu'un bail actif. */
async function assertNoActiveLease(tx: Tx, input: { organizationId: string; propertyId: string; unitId?: string | null; excludeLeaseId?: string }) {
  const active = await tx.lease.findFirst({
    where: {
      organizationId: input.organizationId,
      status: 'ACTIF',
      id: input.excludeLeaseId ? { not: input.excludeLeaseId } : undefined,
      ...(input.unitId ? { unitId: input.unitId } : { propertyId: input.propertyId, unitId: null }),
    },
    select: { id: true, reference: true },
  });
  if (active) {
    throw new ApiError(
      409,
      `Un bail actif existe déjà pour ce logement (${active.reference}). Résiliez-le avant d'en créer un nouveau.`,
    );
  }
}

export async function createLease(
  organizationId: string,
  input: LeaseInputZ,
  options: { actorId?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findFirst({
      where: { id: input.propertyId, organizationId },
      select: { id: true, ownerId: true, status: true },
    });
    if (!property) throw new ApiError(400, 'Bien invalide.');

    const tenant = await tx.tenant.findFirst({
      where: { id: input.tenantId, organizationId },
      select: { id: true },
    });
    if (!tenant) throw new ApiError(400, 'Locataire invalide.');

    await assertNoActiveLease(tx, {
      organizationId,
      propertyId: input.propertyId,
      unitId: input.unitId || null,
    });

    const lease = await tx.lease.create({
      data: {
        organizationId,
        propertyId: input.propertyId,
        unitId: input.unitId || null,
        tenantId: input.tenantId,
        ownerId: property.ownerId,
        reference: input.reference,
        startDate: input.startDate,
        endDate: input.endDate,
        rentAmount: input.rentAmount,
        chargesAmount: input.chargesAmount,
        depositAmount: input.depositAmount,
        advanceMonths: input.advanceMonths,
        periodicity: input.periodicity,
        status: 'ACTIF',
        signedAt: new Date(),
        noticePeriodDays: input.noticePeriodDays,
        penaltyRatePercent: input.penaltyRatePercent ?? null,
        notes: input.notes || null,
      },
    });

    if (input.generateSchedule) {
      const periods = buildSchedulePeriods({
        startDate: input.startDate,
        endDate: input.endDate,
        periodicity: input.periodicity,
        rentAmount: input.rentAmount,
        chargesAmount: input.chargesAmount,
      });

      await tx.rentSchedule.createMany({
        data: periods.map((period) => ({
          organizationId,
          leaseId: lease.id,
          periodStart: period.periodStart,
          dueDate: period.dueDate,
          periodLabel: period.periodLabel,
          rentDue: period.rentDue,
          chargesDue: period.chargesDue,
          status: deriveRentStatus(
            { rentDue: period.rentDue, chargesDue: period.chargesDue, penaltyAmount: 0, amountPaid: 0 },
            period.dueDate,
          ),
        })),
      });
    }

    // Le logement devient « occupé » dès la signature
    if (lease.unitId) {
      await tx.unit.update({ where: { id: lease.unitId }, data: { status: 'OCCUPE' } });
    }
    await tx.property.update({ where: { id: lease.propertyId }, data: { status: 'OCCUPE' } });

    return lease;
  });
}

export async function updateLease(organizationId: string, leaseId: string, input: LeaseInputZ) {
  return prisma.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({ where: { id: leaseId, organizationId } });
    if (!lease) throw new ApiError(404, 'Contrat introuvable.');
    if (lease.status !== 'ACTIF' && lease.status !== 'BROUILLON') {
      throw new ApiError(409, 'Seul un contrat actif peut être modifié.');
    }

    const paidSchedules = await tx.rentSchedule.count({
      where: { leaseId, amountPaid: { gt: 0 } },
    });
    if (paidSchedules > 0 && (input.rentAmount !== lease.rentAmount || input.startDate !== lease.startDate)) {
      throw new ApiError(
        409,
        'Des paiements existent déjà : le loyer et la date de début ne peuvent plus être modifiés.',
      );
    }

    await assertNoActiveLease(tx, {
      organizationId,
      propertyId: input.propertyId,
      unitId: input.unitId || null,
      excludeLeaseId: leaseId,
    });

    return tx.lease.update({
      where: { id: leaseId },
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId || null,
        tenantId: input.tenantId,
        reference: input.reference,
        startDate: input.startDate,
        endDate: input.endDate,
        rentAmount: input.rentAmount,
        chargesAmount: input.chargesAmount,
        depositAmount: input.depositAmount,
        advanceMonths: input.advanceMonths,
        periodicity: input.periodicity,
        noticePeriodDays: input.noticePeriodDays,
        penaltyRatePercent: input.penaltyRatePercent ?? null,
        notes: input.notes || null,
      },
    });
  });
}

/** Résiliation avec préavis : libère le logement et clôt les échéances non réglées à venir. */
export async function terminateLease(
  organizationId: string,
  leaseId: string,
  input: z.infer<typeof terminateLeaseSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id: leaseId, organizationId },
      include: { property: { select: { id: true } } },
    });
    if (!lease) throw new ApiError(404, 'Contrat introuvable.');
    if (lease.status === 'RESILIE') throw new ApiError(409, 'Ce contrat est déjà résilié.');

    const updated = await tx.lease.update({
      where: { id: leaseId },
      data: {
        status: 'RESILIE',
        terminationDate: input.terminationDate,
        terminationReason: input.reason,
        endDate: input.terminationDate < lease.endDate ? input.terminationDate : lease.endDate,
      },
    });

    // Échéances futures non commencées et impayées : supprimées (aucune trace financière)
    await tx.rentSchedule.deleteMany({
      where: { leaseId, amountPaid: 0, dueDate: { gt: input.terminationDate } },
    });

    if (lease.unitId) {
      const otherActive = await tx.lease.count({
        where: { unitId: lease.unitId, status: 'ACTIF', id: { not: leaseId } },
      });
      await tx.unit.update({
        where: { id: lease.unitId },
        data: { status: otherActive > 0 ? 'OCCUPE' : 'LIBRE' },
      });
    }

    const otherPropertyLeases = await tx.lease.count({
      where: { propertyId: lease.propertyId, status: 'ACTIF', id: { not: leaseId } },
    });
    if (otherPropertyLeases === 0) {
      await tx.property.update({ where: { id: lease.propertyId }, data: { status: 'LIBRE' } });
    }

    return updated;
  });
}

/** Renouvelle un bail arrivé à échéance (nouvelle période, échéancier régénéré). */
export async function renewLease(organizationId: string, leaseId: string, months = 12) {
  const lease = await prisma.lease.findFirst({ where: { id: leaseId, organizationId } });
  if (!lease) throw new ApiError(404, 'Contrat introuvable.');

  const newStart = addMonths(lease.endDate, 1);
  const newEnd = addMonths(newStart, months);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lease.update({
      where: { id: leaseId },
      data: { startDate: newStart, endDate: newEnd, status: 'ACTIF', terminationDate: null, terminationReason: null },
    });

    const periods = buildSchedulePeriods({
      startDate: newStart,
      endDate: newEnd,
      periodicity: lease.periodicity,
      rentAmount: lease.rentAmount,
      chargesAmount: lease.chargesAmount,
    });

    for (const period of periods) {
      await tx.rentSchedule.upsert({
        where: { leaseId_periodStart: { leaseId, periodStart: period.periodStart } },
        create: {
          organizationId,
          leaseId,
          periodStart: period.periodStart,
          dueDate: period.dueDate,
          periodLabel: period.periodLabel,
          rentDue: period.rentDue,
          chargesDue: period.chargesDue,
          status: deriveRentStatus(
            { rentDue: period.rentDue, chargesDue: period.chargesDue, penaltyAmount: 0, amountPaid: 0 },
            period.dueDate,
          ),
        },
        update: {},
      });
    }

    return updated;
  });
}
