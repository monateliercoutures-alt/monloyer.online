-- ===========================================================================
-- monloyer.online — migration initiale
-- PostgreSQL 15+ (Neon, Supabase, Postgres auto-hébergé)
-- ===========================================================================

-- ------------------------------- ÉNUMÉRATIONS -----------------------------
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN_AGENCE', 'AGENT', 'PROPRIETAIRE', 'LOCATAIRE', 'COMPTABLE');
CREATE TYPE "PropertyType" AS ENUM ('APPARTEMENT', 'VILLA', 'STUDIO', 'CHAMBRE', 'BOUTIQUE', 'BUREAU', 'IMMEUBLE');
CREATE TYPE "PropertyStatus" AS ENUM ('LIBRE', 'OCCUPE', 'EN_TRAVAUX');
CREATE TYPE "UnitStatus" AS ENUM ('LIBRE', 'OCCUPE', 'EN_TRAVAUX');
CREATE TYPE "LeaseStatus" AS ENUM ('BROUILLON', 'ACTIF', 'RESILIE', 'EXPIRE');
CREATE TYPE "RentPeriodicity" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL');
CREATE TYPE "RentStatus" AS ENUM ('A_VENIR', 'PARTIEL', 'PAYE', 'EN_RETARD');
CREATE TYPE "PaymentMethod" AS ENUM ('ESPECES', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE', 'AUTRE');
CREATE TYPE "PaymentStatus" AS ENUM ('VALIDE', 'ANNULE');
CREATE TYPE "ReminderChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');
CREATE TYPE "ReminderStatus" AS ENUM ('A_ENVOYER', 'ENVOYE', 'ECHEC', 'ANNULE');
CREATE TYPE "ExpenseCategory" AS ENUM ('TRAVAUX', 'REPARATION', 'EAU', 'ELECTRICITE', 'ASSURANCE', 'IMPOT', 'HONORAIRES', 'AUTRE');
CREATE TYPE "DocumentType" AS ENUM ('PIECE_IDENTITE', 'CONTRAT', 'QUITTANCE', 'JUSTIFICATIF_BAIL', 'AUTRE');
CREATE TYPE "InvitationStatus" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'EXPIREE', 'ANNULEE');
CREATE TYPE "MandateType" AS ENUM ('GESTION_LOCATIVE', 'MANDAT_SIMPLE');
CREATE TYPE "CommissionType" AS ENUM ('POURCENTAGE', 'MONTANT_FIXE');

-- ------------------------------- ORGANISATION -----------------------------
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Abidjan',
    "country" TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f766e',
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Abidjan',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "penaltyRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "penaltyGraceDays" INTEGER NOT NULL DEFAULT 5,
    "reminderOffsets" INTEGER[] NOT NULL DEFAULT ARRAY[-3, 0, 3, 7, 15],
    "reminderChannels" TEXT[] NOT NULL DEFAULT ARRAY['WHATSAPP', 'SMS'],
    "receiptPrefix" TEXT NOT NULL DEFAULT 'QUI',
    "receiptCounter" INTEGER NOT NULL DEFAULT 0,
    "reminderTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- ------------------------------- UTILISATEURS -----------------------------
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE TABLE "PhoneOtp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PhoneOtp_phone_idx" ON "PhoneOtp"("phone");

CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "invitedById" TEXT,
    "ownerId" TEXT,
    "tenantId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_organizationId_status_idx" ON "Invitation"("organizationId", "status");

-- ------------------------------- PROPRIÉTAIRES ----------------------------
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "idNumber" TEXT,
    "address" TEXT,
    "mandateType" "MandateType" NOT NULL DEFAULT 'GESTION_LOCATIVE',
    "mandateStart" TIMESTAMP(3),
    "mandateEnd" TIMESTAMP(3),
    "commissionType" "CommissionType" NOT NULL DEFAULT 'POURCENTAGE',
    "commissionValue" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "paymentDetails" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Owner_userId_key" ON "Owner"("userId");
CREATE INDEX "Owner_organizationId_idx" ON "Owner"("organizationId");

-- ----------------------------------- BIENS --------------------------------
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT,
    "type" "PropertyType" NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Abidjan',
    "status" "PropertyStatus" NOT NULL DEFAULT 'LIBRE',
    "description" TEXT,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rentAmount" INTEGER NOT NULL DEFAULT 0,
    "chargesAmount" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "areaSqm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Property_organizationId_reference_key" ON "Property"("organizationId", "reference");
CREATE INDEX "Property_organizationId_status_idx" ON "Property"("organizationId", "status");
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "floor" INTEGER,
    "rentAmount" INTEGER,
    "chargesAmount" INTEGER,
    "depositAmount" INTEGER,
    "status" "UnitStatus" NOT NULL DEFAULT 'LIBRE',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Unit_propertyId_name_key" ON "Unit"("propertyId", "name");
CREATE INDEX "Unit_organizationId_status_idx" ON "Unit"("organizationId", "status");

-- --------------------------------- LOCATAIRES -----------------------------
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "idDocumentUrl" TEXT,
    "profession" TEXT,
    "employer" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "guarantorIdNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tenant_userId_key" ON "Tenant"("userId");
CREATE INDEX "Tenant_organizationId_idx" ON "Tenant"("organizationId");
CREATE INDEX "Tenant_organizationId_phone_idx" ON "Tenant"("organizationId", "phone");

-- ------------------------------ CONTRATS DE BAIL --------------------------
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentAmount" INTEGER NOT NULL,
    "chargesAmount" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "advanceMonths" INTEGER NOT NULL DEFAULT 0,
    "periodicity" "RentPeriodicity" NOT NULL DEFAULT 'MENSUEL',
    "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIF',
    "signedAt" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "terminationReason" TEXT,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 30,
    "penaltyRatePercent" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Lease_organizationId_reference_key" ON "Lease"("organizationId", "reference");
CREATE INDEX "Lease_organizationId_status_idx" ON "Lease"("organizationId", "status");
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

CREATE TABLE "RentSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "rentDue" INTEGER NOT NULL,
    "chargesDue" INTEGER NOT NULL DEFAULT 0,
    "penaltyAmount" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "status" "RentStatus" NOT NULL DEFAULT 'A_VENIR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RentSchedule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RentSchedule_leaseId_periodStart_key" ON "RentSchedule"("leaseId", "periodStart");
CREATE INDEX "RentSchedule_organizationId_status_dueDate_idx" ON "RentSchedule"("organizationId", "status", "dueDate");

-- --------------------------------- PAIEMENTS ------------------------------
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "rentScheduleId" TEXT,
    "tenantId" TEXT,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "proofUrl" TEXT,
    "proofName" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'VALIDE',
    "recordedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payment_organizationId_paidAt_idx" ON "Payment"("organizationId", "paidAt");
CREATE INDEX "Payment_rentScheduleId_idx" ON "Payment"("rentScheduleId");

CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "paymentId" TEXT,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "chargesPaid" INTEGER NOT NULL DEFAULT 0,
    "balanceDue" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT,
    "channel" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "Receipt"("paymentId");
CREATE UNIQUE INDEX "Receipt_organizationId_number_key" ON "Receipt"("organizationId", "number");
CREATE INDEX "Receipt_organizationId_issuedAt_idx" ON "Receipt"("organizationId", "issuedAt");

CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rentScheduleId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'A_ENVOYER',
    "offsetDays" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Reminder_rentScheduleId_channel_offsetDays_key" ON "Reminder"("rentScheduleId", "channel", "offsetDays");
CREATE INDEX "Reminder_organizationId_status_idx" ON "Reminder"("organizationId", "status");

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "ownerId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Expense_organizationId_date_idx" ON "Expense"("organizationId", "date");

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "propertyId" TEXT,
    "tenantId" TEXT,
    "leaseId" TEXT,
    "ownerId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");

CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityLog_organizationId_createdAt_idx" ON "ActivityLog"("organizationId", "createdAt");

-- ------------------------------ CLÉS ÉTRANGÈRES ---------------------------
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhoneOtp" ADD CONSTRAINT "PhoneOtp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentSchedule" ADD CONSTRAINT "RentSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentSchedule" ADD CONSTRAINT "RentSchedule_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rentScheduleId_fkey" FOREIGN KEY ("rentScheduleId") REFERENCES "RentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_rentScheduleId_fkey" FOREIGN KEY ("rentScheduleId") REFERENCES "RentSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
