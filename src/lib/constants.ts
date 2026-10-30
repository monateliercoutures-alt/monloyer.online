import type {
  CommissionType,
  ExpenseCategory,
  LeaseStatus,
  MandateType,
  PaymentMethod,
  PaymentStatus,
  PropertyStatus,
  PropertyType,
  ReminderChannel,
  ReminderStatus,
  RentPeriodicity,
  RentStatus,
  Role,
  UnitStatus,
  DocumentType,
  InvitationStatus,
} from '@prisma/client';

export const APP_NAME = 'monloyer.online';
export const APP_TAGLINE = "La gestion locative simple pour l'Afrique de l'Ouest";
export const DEFAULT_TIMEZONE = 'Africa/Abidjan';
export const CURRENCY = 'FCFA';

type Option<T extends string> = { value: T; label: string };

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN_AGENCE: "Administrateur d'agence",
  AGENT: 'Agent',
  PROPRIETAIRE: 'Propriétaire',
  LOCATAIRE: 'Locataire',
  COMPTABLE: 'Comptable',
};

export const STAFF_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_AGENCE', 'AGENT', 'COMPTABLE'];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APPARTEMENT: 'Appartement',
  VILLA: 'Villa',
  STUDIO: 'Studio',
  CHAMBRE: 'Chambre',
  BOUTIQUE: 'Boutique',
  BUREAU: 'Bureau',
  IMMEUBLE: 'Immeuble',
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  LIBRE: 'Libre',
  OCCUPE: 'Occupé',
  EN_TRAVAUX: 'En travaux',
};

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  LIBRE: 'Libre',
  OCCUPE: 'Occupé',
  EN_TRAVAUX: 'En travaux',
};

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  BROUILLON: 'Brouillon',
  ACTIF: 'Actif',
  RESILIE: 'Résilié',
  EXPIRE: 'Expiré',
};

export const RENT_STATUS_LABELS: Record<RentStatus, string> = {
  A_VENIR: 'À venir',
  PARTIEL: 'Partiel',
  PAYE: 'Payé',
  EN_RETARD: 'En retard',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ESPECES: 'Espèces',
  VIREMENT: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CHEQUE: 'Chèque',
  AUTRE: 'Autre',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  VALIDE: 'Validé',
  ANNULE: 'Annulé',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRAVAUX: 'Travaux',
  REPARATION: 'Réparation',
  EAU: 'Eau (SODECI)',
  ELECTRICITE: 'Électricité (CIE)',
  ASSURANCE: 'Assurance',
  IMPOT: 'Impôt / taxe',
  HONORAIRES: 'Honoraires',
  AUTRE: 'Autre',
};

export const PERIODICITY_LABELS: Record<RentPeriodicity, string> = {
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel',
  ANNUEL: 'Annuel',
};

export const PERIODICITY_MONTHS: Record<RentPeriodicity, number> = {
  MENSUEL: 1,
  TRIMESTRIEL: 3,
  SEMESTRIEL: 6,
  ANNUEL: 12,
};

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  EMAIL: 'E-mail',
};

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  A_ENVOYER: 'À envoyer',
  ENVOYE: 'Envoyé',
  ECHEC: 'Échec',
  ANNULE: 'Annulé',
};

export const MANDATE_TYPE_LABELS: Record<MandateType, string> = {
  GESTION_LOCATIVE: 'Gestion locative complète',
  MANDAT_SIMPLE: 'Mandat simple',
};

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  POURCENTAGE: 'Pourcentage du loyer',
  MONTANT_FIXE: 'Montant fixe par échéance',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PIECE_IDENTITE: "Pièce d'identité",
  CONTRAT: 'Contrat',
  QUITTANCE: 'Quittance',
  JUSTIFICATIF_BAIL: 'Justificatif de bail',
  AUTRE: 'Autre',
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  EXPIREE: 'Expirée',
  ANNULEE: 'Annulée',
};

export const MESSAGE_VARIABLES = [
  { key: '{nom}', description: 'Nom complet du locataire' },
  { key: '{montant}', description: 'Montant restant dû (ex. 150 000 FCFA)' },
  { key: '{date}', description: "Date d'échéance" },
  { key: '{periodicite}', description: 'Période concernée (ex. Octobre 2026)' },
  { key: '{logement}', description: 'Adresse du bien' },
  { key: '{agence}', description: "Nom de l'organisation" },
];

export const DEFAULT_REMINDER_TEMPLATE =
  "Bonjour {nom}, votre loyer de {montant} pour {periodicite} (logement : {logement}) est dû le {date}. Merci de procéder au règlement. — {agence}";

export const QUARTIERS_ABIDJAN = [
  'Cocody',
  'Marcory',
  'Yopougon',
  'Plateau',
  'Adjamé',
  'Treichville',
  'Abobo',
  'Koumassi',
  'Port-Bouët',
  'Bingerville',
  'Riviera',
  'Angré',
  'Deux-Plateaux',
  'Zone 4',
];

export function optionsFromLabels<T extends string>(labels: Record<T, string>): Option<T>[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

/** Couleurs des badges de statut (classes Tailwind). */
export const RENT_STATUS_CLASSES: Record<RentStatus, string> = {
  PAYE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  PARTIEL: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  EN_RETARD: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  A_VENIR: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
};

export const PROPERTY_STATUS_CLASSES: Record<PropertyStatus, string> = {
  LIBRE: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  OCCUPE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  EN_TRAVAUX: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
};

export const LEASE_STATUS_CLASSES: Record<LeaseStatus, string> = {
  BROUILLON: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  ACTIF: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  RESILIE: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  EXPIRE: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
};

export const UNIT_STATUS_CLASSES: Record<UnitStatus, string> = {
  LIBRE: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  OCCUPE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  EN_TRAVAUX: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
};
