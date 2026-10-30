import { addDays, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import { computeCommission, periodLabelOf } from '@/lib/rent';

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

/** Indicateurs du tableau de bord agence. */
export async function getDashboard(organizationId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const next30 = addDays(now, 30);
  const next60 = addDays(now, 60);

  const [
    schedulesThisMonth,
    paymentsThisMonth,
    overdueSchedules,
    properties,
    units,
    expiringLeases,
    recentPayments,
    ownersCount,
    tenantsCount,
    remindersPending,
  ] = await Promise.all([
    prisma.rentSchedule.findMany({
      where: { organizationId, periodStart: { gte: monthStart, lte: monthEnd } },
      select: { rentDue: true, chargesDue: true, amountPaid: true, status: true },
    }),
    prisma.payment.findMany({
      where: { organizationId, status: 'VALIDE', paidAt: { gte: monthStart, lte: monthEnd } },
      select: { amount: true },
    }),
    prisma.rentSchedule.findMany({
      where: { organizationId, status: { in: ['EN_RETARD', 'PARTIEL'] } },
      orderBy: { dueDate: 'asc' },
      take: 8,
      include: {
        lease: {
          include: {
            tenant: { select: { id: true, firstName: true, lastName: true, phone: true } },
            property: { select: { address: true, district: true } },
            unit: { select: { name: true } },
          },
        },
      },
    }),
    prisma.property.findMany({
      where: { organizationId },
      select: { id: true, status: true, rentAmount: true },
    }),
    prisma.unit.findMany({ where: { organizationId }, select: { id: true, status: true } }),
    prisma.lease.findMany({
      where: { organizationId, status: 'ACTIF', endDate: { lte: next60 } },
      orderBy: { endDate: 'asc' },
      take: 8,
      include: {
        tenant: { select: { firstName: true, lastName: true } },
        property: { select: { address: true, district: true } },
      },
    }),
    prisma.payment.findMany({
      where: { organizationId },
      orderBy: { paidAt: 'desc' },
      take: 6,
      include: {
        tenant: { select: { firstName: true, lastName: true } },
        lease: { include: { property: { select: { address: true } }, unit: { select: { name: true } } } },
        receipt: { select: { id: true, number: true } },
      },
    }),
    prisma.owner.count({ where: { organizationId } }),
    prisma.tenant.count({ where: { organizationId } }),
    prisma.reminder.count({ where: { organizationId, status: 'A_ENVOYER' } }),
  ]);

  const expectedThisMonth = schedulesThisMonth.reduce((sum, s) => sum + s.rentDue + s.chargesDue, 0);
  const collectedThisMonth = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

  const overdueAmount = overdueSchedules.reduce(
    (sum, s) => sum + Math.max(0, s.rentDue + s.chargesDue + s.penaltyAmount - s.amountPaid),
    0,
  );

  // Impayés : total sur toutes les échéances non soldées (pas seulement les 8 affichées)
  const allOverdue = await prisma.rentSchedule.findMany({
    where: { organizationId, status: { in: ['EN_RETARD', 'PARTIEL'] } },
    select: { rentDue: true, chargesDue: true, penaltyAmount: true, amountPaid: true },
  });
  const totalUnpaid = allOverdue.reduce(
    (sum, s) => sum + Math.max(0, s.rentDue + s.chargesDue + s.penaltyAmount - s.amountPaid),
    0,
  );

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === 'OCCUPE').length;
  const occupancyRate =
    totalUnits > 0
      ? (occupiedUnits / totalUnits) * 100
      : properties.length > 0
        ? (properties.filter((p) => p.status === 'OCCUPE').length / properties.length) * 100
        : 0;

  const vacantProperties = properties.filter((p) => p.status === 'LIBRE');
  const collectionRate = expectedThisMonth > 0 ? (collectedThisMonth / expectedThisMonth) * 100 : 0;

  const monthTrend = await Promise.all(
    Array.from({ length: 6 }).map(async (_, index) => {
      const month = subMonths(monthStart, 5 - index);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const [expected, collected] = await Promise.all([
        prisma.rentSchedule.aggregate({
          where: { organizationId, periodStart: { gte: start, lte: end } },
          _sum: { rentDue: true, chargesDue: true },
        }),
        prisma.payment.aggregate({
          where: { organizationId, status: 'VALIDE', paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
      return {
        label: periodLabelOf(start),
        expected: (expected._sum.rentDue ?? 0) + (expected._sum.chargesDue ?? 0),
        collected: collected._sum.amount ?? 0,
      };
    }),
  );

  return {
    expectedThisMonth,
    collectedThisMonth,
    collectionRate,
    totalUnpaid,
    overdueCount: allOverdue.length,
    overdueAmount,
    overdueSchedules,
    occupancyRate,
    vacantCount: vacantProperties.length,
    totalUnits,
    totalProperties: properties.length,
    ownersCount,
    tenantsCount,
    remindersPending,
    expiringLeases,
    expiringSoon: expiringLeases.filter((lease) => lease.endDate <= next30).length,
    recentPayments,
    monthTrend,
    generatedAt: now,
  };
}

/** Relevé de gérance mensuel d'un propriétaire (loyers encaissés, commission, charges, net). */
export async function buildOwnerStatement(organizationId: string, ownerId: string, month: Date) {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const owner = await prisma.owner.findFirst({
    where: { id: ownerId, organizationId },
    include: { properties: { select: { id: true, reference: true, address: true, district: true } } },
  });
  if (!owner) throw new ApiError(404, 'Propriétaire introuvable.');

  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const [payments, expenses, leases] = await Promise.all([
    prisma.payment.findMany({
      where: {
        organizationId,
        status: 'VALIDE',
        paidAt: { gte: start, lte: end },
        lease: { ownerId },
      },
      orderBy: { paidAt: 'asc' },
      include: {
        tenant: { select: { firstName: true, lastName: true } },
        lease: { include: { property: { select: { address: true, district: true } }, unit: { select: { name: true } } } },
        rentSchedule: { select: { periodLabel: true } },
        receipt: { select: { number: true } },
      },
    }),
    prisma.expense.findMany({
      where: { organizationId, ownerId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.lease.findMany({
      where: { organizationId, ownerId, status: { in: ['ACTIF', 'RESILIE'] } },
      select: { id: true, reference: true, status: true, rentAmount: true, chargesAmount: true },
    }),
  ]);

  const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const periodsCount = new Set(
    payments.map((payment) => payment.rentSchedule?.periodLabel ?? payment.paidAt.toISOString().slice(0, 7)),
  ).size;

  const commission = computeCommission({
    collected,
    owner,
    defaultRate: organization.commissionRate,
    periodsCount,
  });

  const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netToRemit = collected - commission - expensesTotal;

  return {
    organization,
    owner,
    month: start,
    monthLabel: periodLabelOf(start),
    periodStart: start,
    periodEnd: end,
    payments,
    expenses,
    leases,
    collected,
    commission,
    expensesTotal,
    netToRemit,
    periodsCount,
  };
}

export type OwnerStatement = Awaited<ReturnType<typeof buildOwnerStatement>>;

/** Vue d'ensemble de l'espace locataire. */
export async function getTenantPortal(organizationId: string, userId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { userId, organizationId },
    include: {
      leases: {
        include: {
          property: true,
          unit: true,
          rentSchedules: { orderBy: { dueDate: 'asc' } },
        },
        orderBy: { startDate: 'desc' },
      },
      receipts: { orderBy: { issuedAt: 'desc' }, include: { lease: { include: { property: true } } } },
      payments: { orderBy: { paidAt: 'desc' }, include: { receipt: true, rentSchedule: true } },
    },
  });
  if (!tenant) throw new ApiError(404, 'Aucun dossier locataire associé à ce compte.');

  const activeLease = tenant.leases.find((lease) => lease.status === 'ACTIF') ?? tenant.leases[0] ?? null;
  const balance = activeLease
    ? activeLease.rentSchedules.reduce(
        (sum, schedule) =>
          sum + Math.max(0, schedule.rentDue + schedule.chargesDue + schedule.penaltyAmount - schedule.amountPaid),
        0,
      )
    : 0;

  return { tenant, activeLease, balance };
}

/** Vue d'ensemble de l'espace propriétaire. */
export async function getOwnerPortal(organizationId: string, userId: string) {
  const owner = await prisma.owner.findFirst({
    where: { userId, organizationId },
    include: {
      properties: { include: { units: true, leases: { where: { status: 'ACTIF' } } } },
      leases: { include: { tenant: true, property: true, unit: true } },
    },
  });
  if (!owner) throw new ApiError(404, 'Aucun profil propriétaire associé à ce compte.');

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const month = new Date();
  const statement = await buildOwnerStatement(organizationId, owner.id, month).catch(() => null);

  return { owner, organization, statement };
}
