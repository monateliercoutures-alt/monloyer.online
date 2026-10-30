import { addMonths, differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RentPeriodicity, RentStatus } from '@prisma/client';
import { PERIODICITY_MONTHS } from '@/lib/constants';

export type SchedulePeriod = {
  periodStart: Date;
  dueDate: Date;
  periodLabel: string;
  rentDue: number;
  chargesDue: number;
};

/** « Octobre 2026 » */
export function periodLabelOf(date: Date): string {
  const label = format(date, 'MMMM yyyy', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Construit l'échéancier d'un bail : une ligne par période de paiement,
 * de la date de début jusqu'à la date de fin (incluse).
 */
export function buildSchedulePeriods(input: {
  startDate: Date;
  endDate: Date;
  periodicity: RentPeriodicity;
  rentAmount: number;
  chargesAmount: number;
}): SchedulePeriod[] {
  const step = PERIODICITY_MONTHS[input.periodicity] ?? 1;
  const periods: SchedulePeriod[] = [];
  let cursor = new Date(input.startDate);

  // Garde-fou : 600 périodes maximum (50 ans de mensualités)
  while (cursor <= input.endDate && periods.length < 600) {
    periods.push({
      periodStart: new Date(cursor),
      // Le loyer est payable d'avance, au début de chaque période.
      dueDate: new Date(cursor),
      periodLabel:
        step === 1
          ? periodLabelOf(cursor)
          : `${periodLabelOf(cursor)} → ${periodLabelOf(addMonths(cursor, step - 1))}`,
      rentDue: input.rentAmount,
      chargesDue: input.chargesAmount,
    });
    cursor = addMonths(cursor, step);
  }

  return periods;
}

export function totalDue(schedule: {
  rentDue: number;
  chargesDue: number;
  penaltyAmount: number;
}): number {
  return schedule.rentDue + schedule.chargesDue + schedule.penaltyAmount;
}

export function balanceOf(schedule: {
  rentDue: number;
  chargesDue: number;
  penaltyAmount: number;
  amountPaid: number;
}): number {
  return Math.max(0, totalDue(schedule) - schedule.amountPaid);
}

/**
 * Statut d'une échéance : payé, partiel, en retard ou à venir.
 * Une échéance partiellement réglée dont la date est dépassée reste « partiel »
 * (elle est signalée dans les impayés via balanceOf > 0).
 */
export function deriveRentStatus(
  schedule: { rentDue: number; chargesDue: number; penaltyAmount: number; amountPaid: number },
  dueDate: Date,
  now: Date = new Date(),
): RentStatus {
  const due = totalDue(schedule);
  if (schedule.amountPaid >= due && due > 0) return 'PAYE';
  if (schedule.amountPaid > 0) return 'PARTIEL';
  const daysLate = differenceInCalendarDays(now, dueDate);
  if (daysLate > 0) return 'EN_RETARD';
  if (due === 0) return 'PAYE';
  return 'A_VENIR';
}

/**
 * Pénalité de retard : pourcentage du loyer par mois de retard commencé,
 * appliquée après le délai de tolérance.
 */
export function computePenalty(input: {
  amountBase: number;
  dueDate: Date;
  penaltyRatePercent: number;
  graceDays: number;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const daysLate = differenceInCalendarDays(now, input.dueDate);
  if (daysLate <= input.graceDays || input.amountBase <= 0) return 0;
  const monthsLate = Math.ceil((daysLate - input.graceDays) / 30);
  return Math.round((input.amountBase * input.penaltyRatePercent * monthsLate) / 100);
}

/** Commission d'agence : pourcentage ou montant fixe défini dans le mandat. */
export function computeCommission(input: {
  collected: number;
  owner?: {
    commissionType: 'POURCENTAGE' | 'MONTANT_FIXE';
    commissionValue: number | null;
  } | null;
  defaultRate: number;
  periodsCount: number;
}): number {
  const { owner } = input;
  if (owner?.commissionValue != null && owner.commissionValue > 0) {
    if (owner.commissionType === 'MONTANT_FIXE') {
      return Math.round(owner.commissionValue * Math.max(1, input.periodsCount));
    }
    return Math.round((input.collected * owner.commissionValue) / 100);
  }
  return Math.round((input.collected * input.defaultRate) / 100);
}
