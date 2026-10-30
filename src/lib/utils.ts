import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Slug URL-safe (noms d'organisation, références…). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

/** Référence lisible : BIEN-0001, BAIL-2026-0007… */
export function buildReference(prefix: string, sequence: number, year?: number): string {
  const padded = String(sequence).padStart(4, '0');
  return year ? `${prefix}-${year}-${padded}` : `${prefix}-${padded}`;
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

/** Téléphone ivoirien normalisé : +225 07 00 00 00 00 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('225') && digits.length >= 13) return `+${digits}`;
  if (digits.length === 10) return `+225${digits}`;
  return input.startsWith('+') ? `+${digits}` : digits;
}

export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('225') && digits.length === 13) {
    const local = digits.slice(3);
    return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  }
  return phone;
}

/** Lien WhatsApp prêt à l'emploi (wa.me) à partir d'un téléphone. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
