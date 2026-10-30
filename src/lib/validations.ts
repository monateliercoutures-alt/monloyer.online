import { z } from 'zod';
import { normalizePhone } from '@/lib/utils';

// ---------------------------------- AUTH ----------------------------------

const email = z
  .string()
  .trim()
  .min(1, "L'e-mail est obligatoire.")
  .email('Adresse e-mail invalide.')
  .toLowerCase();

const phone = z
  .string()
  .trim()
  .min(8, 'Numéro de téléphone invalide.')
  .transform((value) => normalizePhone(value))
  .refine((value) => /^\+?[0-9]{8,15}$/.test(value), 'Numéro de téléphone invalide.');

const password = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(72, 'Le mot de passe est trop long.');

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2, "Le nom de l'agence est obligatoire."),
  city: z.string().trim().optional(),
  firstName: z.string().trim().min(2, 'Le prénom est obligatoire.'),
  lastName: z.string().trim().min(2, 'Le nom est obligatoire.'),
  email,
  phone: phone.optional().or(z.literal('')),
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Mot de passe requis.'),
});

export const otpRequestSchema = z.object({ phone });

export const otpVerifySchema = z.object({
  phone,
  code: z.string().trim().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres.'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
  firstName: z.string().trim().min(2, 'Prénom requis.'),
  lastName: z.string().trim().min(2, 'Nom requis.'),
  email: email.optional().or(z.literal('')),
  phone: phone.optional().or(z.literal('')),
  password,
});

// -------------------------------- PROPRIÉTAIRES ---------------------------

export const ownerSchema = z.object({
  firstName: z.string().trim().min(2, 'Prénom requis.'),
  lastName: z.string().trim().min(2, 'Nom requis.'),
  phone,
  email: z.string().trim().email('Adresse e-mail invalide.').optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  idNumber: z.string().trim().optional().or(z.literal('')),
  mandateType: z.enum(['GESTION_LOCATIVE', 'MANDAT_SIMPLE']).default('GESTION_LOCATIVE'),
  mandateStart: z.coerce.date().optional(),
  mandateEnd: z.coerce.date().optional(),
  commissionType: z.enum(['POURCENTAGE', 'MONTANT_FIXE']).default('POURCENTAGE'),
  commissionValue: z.coerce.number().min(0, 'Valeur de commission invalide.').max(1000000).optional(),
  paymentMethod: z.string().trim().optional().or(z.literal('')),
  paymentDetails: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  isActive: z.coerce.boolean().default(true),
});

// ----------------------------------- BIENS --------------------------------

export const propertySchema = z.object({
  ownerId: z.string().min(1, 'Sélectionnez un propriétaire.'),
  reference: z.string().trim().min(1, 'La référence est obligatoire.').max(40),
  name: z.string().trim().optional().or(z.literal('')),
  type: z.enum(['APPARTEMENT', 'VILLA', 'STUDIO', 'CHAMBRE', 'BOUTIQUE', 'BUREAU', 'IMMEUBLE']),
  address: z.string().trim().min(3, "L'adresse est obligatoire."),
  district: z.string().trim().min(2, 'Le quartier est obligatoire.'),
  city: z.string().trim().default('Abidjan'),
  status: z.enum(['LIBRE', 'OCCUPE', 'EN_TRAVAUX']).default('LIBRE'),
  description: z.string().trim().optional().or(z.literal('')),
  photos: z.array(z.string()).default([]),
  rentAmount: z.coerce.number().int().min(0).default(0),
  chargesAmount: z.coerce.number().int().min(0).default(0),
  depositAmount: z.coerce.number().int().min(0).default(0),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  areaSqm: z.coerce.number().int().min(0).max(100000).optional(),
});

export const unitSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().trim().min(1, 'Le nom du logement est obligatoire.'),
  reference: z.string().trim().optional().or(z.literal('')),
  floor: z.coerce.number().int().min(-5).max(100).optional(),
  rentAmount: z.coerce.number().int().min(0).optional(),
  chargesAmount: z.coerce.number().int().min(0).optional(),
  depositAmount: z.coerce.number().int().min(0).optional(),
  status: z.enum(['LIBRE', 'OCCUPE', 'EN_TRAVAUX']).default('LIBRE'),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
});

export const propertyImportSchema = z.object({
  rows: z
    .array(
      z.object({
        ownerName: z.string().trim().min(2, 'Propriétaire requis.'),
        reference: z.string().trim().min(1, 'Référence requise.'),
        type: z.string().trim().min(2, 'Type requis.'),
        address: z.string().trim().min(3, 'Adresse requise.'),
        district: z.string().trim().min(2, 'Quartier requis.'),
        rentAmount: z.coerce.number().int().min(0),
        chargesAmount: z.coerce.number().int().min(0).optional().default(0),
        depositAmount: z.coerce.number().int().min(0).optional().default(0),
        bedrooms: z.coerce.number().int().min(0).optional(),
      }),
    )
    .min(1, 'Aucune ligne à importer.'),
});

// --------------------------------- LOCATAIRES -----------------------------

export const tenantSchema = z.object({
  firstName: z.string().trim().min(2, 'Prénom requis.'),
  lastName: z.string().trim().min(2, 'Nom requis.'),
  phone,
  email: z.string().trim().email('Adresse e-mail invalide.').optional().or(z.literal('')),
  idType: z.string().trim().optional().or(z.literal('')),
  idNumber: z.string().trim().optional().or(z.literal('')),
  idDocumentUrl: z.string().trim().optional().or(z.literal('')),
  profession: z.string().trim().optional().or(z.literal('')),
  employer: z.string().trim().optional().or(z.literal('')),
  emergencyContactName: z.string().trim().optional().or(z.literal('')),
  emergencyContactPhone: z.string().trim().optional().or(z.literal('')),
  guarantorName: z.string().trim().optional().or(z.literal('')),
  guarantorPhone: z.string().trim().optional().or(z.literal('')),
  guarantorIdNumber: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  isActive: z.coerce.boolean().default(true),
});

// ----------------------------------- BAILS --------------------------------

export const leaseSchema = z
  .object({
    propertyId: z.string().min(1, 'Sélectionnez un bien.'),
    unitId: z.string().optional().or(z.literal('')),
    tenantId: z.string().min(1, 'Sélectionnez un locataire.'),
    reference: z.string().trim().min(1, 'La référence du bail est obligatoire.'),
    startDate: z.coerce.date({ invalid_type_error: 'Date de début invalide.' }),
    endDate: z.coerce.date({ invalid_type_error: 'Date de fin invalide.' }),
    rentAmount: z.coerce.number().int().min(0, 'Loyer invalide.'),
    chargesAmount: z.coerce.number().int().min(0).default(0),
    depositAmount: z.coerce.number().int().min(0).default(0),
    advanceMonths: z.coerce.number().int().min(0).max(24).default(0),
    periodicity: z.enum(['MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL']).default('MENSUEL'),
    noticePeriodDays: z.coerce.number().int().min(0).max(365).default(30),
    penaltyRatePercent: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().optional().or(z.literal('')),
    generateSchedule: z.coerce.boolean().default(true),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['endDate'],
  });

export const terminateLeaseSchema = z.object({
  terminationDate: z.coerce.date(),
  reason: z.string().trim().min(3, 'Précisez le motif de résiliation.'),
});

// -------------------------------- PAIEMENTS -------------------------------

export const paymentSchema = z.object({
  leaseId: z.string().min(1, 'Sélectionnez un contrat.'),
  rentScheduleId: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().int().positive('Le montant doit être supérieur à 0.'),
  method: z.enum(['ESPECES', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE', 'AUTRE']),
  reference: z.string().trim().optional().or(z.literal('')),
  paidAt: z.coerce.date(),
  proofUrl: z.string().optional().or(z.literal('')),
  proofName: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  issueReceipt: z.coerce.boolean().default(true),
});

export const cancelPaymentSchema = z.object({
  reason: z.string().trim().min(3, "Le motif d'annulation est obligatoire."),
});

// --------------------------------- DÉPENSES -------------------------------

export const expenseSchema = z.object({
  propertyId: z.string().optional().or(z.literal('')),
  ownerId: z.string().optional().or(z.literal('')),
  category: z.enum(['TRAVAUX', 'REPARATION', 'EAU', 'ELECTRICITE', 'ASSURANCE', 'IMPOT', 'HONORAIRES', 'AUTRE']),
  label: z.string().trim().min(2, 'Libellé requis.'),
  amount: z.coerce.number().int().positive('Montant invalide.'),
  date: z.coerce.date(),
  supplier: z.string().trim().optional().or(z.literal('')),
  receiptUrl: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

// -------------------------------- PARAMÈTRES ------------------------------

export const settingsSchema = z.object({
  name: z.string().trim().min(2, "Le nom de l'organisation est obligatoire."),
  email: z.string().trim().email('E-mail invalide.').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Ville requise.'),
  logoUrl: z.string().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #RRGGBB).'),
  commissionRate: z.coerce.number().min(0).max(100),
  penaltyRatePercent: z.coerce.number().min(0).max(100),
  penaltyGraceDays: z.coerce.number().int().min(0).max(90),
  reminderOffsets: z
    .array(z.coerce.number().int().min(-60).max(120))
    .min(1, 'Ajoutez au moins un décalage de relance.'),
  reminderChannels: z.array(z.enum(['WHATSAPP', 'SMS', 'EMAIL'])).min(1, 'Choisissez au moins un canal.'),
  reminderTemplate: z.string().trim().min(10, 'Le modèle de message est trop court.'),
  receiptPrefix: z
    .string()
    .trim()
    .min(1)
    .max(8)
    .regex(/^[A-Z0-9-]+$/, 'Préfixe en majuscules (lettres, chiffres, tiret).'),
  receiptCounter: z.coerce.number().int().min(0).max(999999),
});

// -------------------------------- INVITATIONS -----------------------------

export const invitationSchema = z.object({
  email: z.string().trim().email('E-mail invalide.').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  firstName: z.string().trim().optional().or(z.literal('')),
  lastName: z.string().trim().optional().or(z.literal('')),
  role: z.enum(['ADMIN_AGENCE', 'AGENT', 'COMPTABLE', 'PROPRIETAIRE', 'LOCATAIRE']),
  ownerId: z.string().optional().or(z.literal('')),
  tenantId: z.string().optional().or(z.literal('')),
});

// --------------------------------- RELANCES -------------------------------

export const reminderGenerateSchema = z.object({
  leaseId: z.string().optional().or(z.literal('')),
});

export const reminderSendSchema = z.object({
  reminderId: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type OwnerInput = z.infer<typeof ownerSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type LeaseInput = z.infer<typeof leaseSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
