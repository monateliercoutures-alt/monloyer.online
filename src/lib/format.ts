import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const nf = new Intl.NumberFormat('fr-FR');

/** 150000 → « 150 000 FCFA » */
export function formatFCFA(amount?: number | null): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `${nf.format(Math.round(amount)).replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}

/** 1500000 → « 1,5 M FCFA » (formats compacts pour les cartes KPI) */
export function formatCompactFCFA(amount?: number | null): string {
  if (amount === null || amount === undefined) return '—';
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1).replace('.', ',')} M FCFA`;
  }
  return formatFCFA(amount);
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return '—';
  return nf.format(value).replace(/\u202f|\u00a0/g, ' ');
}

export function formatPercent(value?: number | null, digits = 0): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(digits).replace('.', ',')} %`;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : parseISO(value);
}

/** 05 oct. 2026 */
export function formatDate(value?: Date | string | null): string {
  if (!value) return '—';
  return format(toDate(value), 'dd MMM yyyy', { locale: fr });
}

/** 05/10/2026 */
export function formatDateShort(value?: Date | string | null): string {
  if (!value) return '—';
  return format(toDate(value), 'dd/MM/yyyy');
}

/** Octobre 2026 */
export function formatMonthYear(value?: Date | string | null): string {
  if (!value) return '—';
  const label = format(toDate(value), 'MMMM yyyy', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDateTime(value?: Date | string | null): string {
  if (!value) return '—';
  return format(toDate(value), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
}

/** Valeur pour <input type="date"> */
export function toDateInputValue(value?: Date | string | null): string {
  if (!value) return '';
  return format(toDate(value), 'yyyy-MM-dd');
}

/** Nom de fichier sûr (PDF) */
export function safeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'document';
}
