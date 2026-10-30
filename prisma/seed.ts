/**
 * Jeu de données de démonstration — Agence Immo Abidjan.
 * Quartiers réels d'Abidjan, loyers en FCFA, échéanciers cohérents avec la date
 * du jour (impayés, paiements partiels, quittances numérotées, relances).
 *
 *   npm run db:seed          (après prisma migrate deploy)
 *   npm run db:local         (Postgres local + migration + seed)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { addDays, addMonths, differenceInCalendarDays, startOfMonth, subMonths } from 'date-fns';
import { buildSchedulePeriods, deriveRentStatus, periodLabelOf } from '../src/lib/rent';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL manquant pour exécuter le seed.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 3 }) });

const DEMO_SLUG = 'agence-immo-abidjan';
const PASSWORD = 'Demo1234!';

/** Générateur pseudo-aléatoire déterministe (démo reproductible). */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
const random = makeRandom(20261030);
const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)];

async function main() {
  const existing = await prisma.organization.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    console.log('[seed] organisation de démonstration déjà présente → suppression puis recréation');
    await prisma.organization.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const currentMonth = startOfMonth(now);

  // ------------------------------- ORGANISATION ----------------------------
  const org = await prisma.organization.create({
    data: {
      name: 'Agence Immo Abidjan',
      slug: DEMO_SLUG,
      email: 'contact@agence-immo-abidjan.ci',
      phone: '+2252722445566',
      address: 'Boulevard Latrille, Cocody',
      city: 'Abidjan',
      primaryColor: '#0f766e',
      commissionRate: 10,
      penaltyRatePercent: 5,
      penaltyGraceDays: 5,
      reminderOffsets: [-3, 0, 3, 7, 15],
      reminderChannels: ['WHATSAPP', 'SMS'],
      receiptPrefix: 'QUI',
      receiptCounter: 0,
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        organizationId: org.id,
        role: 'ADMIN_AGENCE',
        firstName: 'Aminata',
        lastName: 'Koné',
        email: 'admin@monloyer.ci',
        phone: '+2250708112233',
        passwordHash,
        lastLoginAt: now,
        onboardingCompletedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        role: 'AGENT',
        firstName: 'Yao',
        lastName: 'Kouassi',
        email: 'agent@monloyer.ci',
        phone: '+2250708112244',
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        role: 'COMPTABLE',
        firstName: 'Fatou',
        lastName: 'Diallo',
        email: 'comptable@monloyer.ci',
        phone: '+2250708112255',
        passwordHash,
      },
    }),
  ]);

  const [admin, agent, accountant] = users;

  // ------------------------------- PROPRIÉTAIRES ---------------------------
  const ownerBamba = await prisma.owner.create({
    data: {
      organizationId: org.id,
      firstName: 'Kouadio',
      lastName: 'Bamba',
      phone: '+2250709112233',
      email: 'kouadio.bamba@gmail.com',
      idNumber: 'CI-0012345678',
      address: 'Riviera Palmeraie, Cocody',
      mandateType: 'GESTION_LOCATIVE',
      mandateStart: subMonths(now, 18),
      commissionType: 'POURCENTAGE',
      commissionValue: 10,
      paymentMethod: 'MOBILE_MONEY',
      paymentDetails: 'Wave 07 09 11 22 33',
      notes: 'Propriétaire de longue date, préfère être payé par Wave.',
    },
  });

  const ownerCisse = await prisma.owner.create({
    data: {
      organizationId: org.id,
      firstName: 'Mariam',
      lastName: 'Cissé',
      phone: '+2250544556677',
      email: 'mariam.cisse@yahoo.fr',
      idNumber: 'CI-0098765432',
      address: 'Zone 4, Marcory',
      mandateType: 'GESTION_LOCATIVE',
      mandateStart: subMonths(now, 10),
      commissionType: 'POURCENTAGE',
      commissionValue: 8,
      paymentMethod: 'VIREMENT',
      paymentDetails: 'SGCI IBAN CI93 0001 2345 6789 0123 4567 890',
    },
  });

  const ownerSociete = await prisma.owner.create({
    data: {
      organizationId: org.id,
      firstName: 'Jean-Marc',
      lastName: 'Adou',
      phone: '+2250744556677',
      email: 'contact@ivoire-patrimoine.ci',
      address: 'Immeuble Alpha 2000, Plateau',
      mandateType: 'GESTION_LOCATIVE',
      mandateStart: subMonths(now, 36),
      commissionType: 'MONTANT_FIXE',
      commissionValue: 25000,
      paymentMethod: 'VIREMENT',
      paymentDetails: 'NSIA Banque CI12 0002 1111 2222 3333 4444 555',
    },
  });

  const ownerOuattara = await prisma.owner.create({
    data: {
      organizationId: org.id,
      firstName: 'Alassane',
      lastName: 'Ouattara',
      phone: '+2250123456789',
      email: 'a.ouattara@outlook.com',
      address: 'Niangon Sud, Yopougon',
      mandateType: 'MANDAT_SIMPLE',
      mandateStart: subMonths(now, 6),
      commissionType: 'POURCENTAGE',
      commissionValue: 12,
      paymentMethod: 'ESPECES',
    },
  });

  // Compte propriétaire (espace propriétaire)
  await prisma.user.create({
    data: {
      organizationId: org.id,
      role: 'PROPRIETAIRE',
      firstName: 'Kouadio',
      lastName: 'Bamba',
      email: 'proprietaire@monloyer.ci',
      phone: '+2250709112299',
      passwordHash,
      ownerProfile: { connect: { id: ownerBamba.id } },
    },
  });

  // ----------------------------------- BIENS -------------------------------
  const immeubleAlpha = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerSociete.id,
      reference: 'B-0001',
      name: 'Immeuble Alpha 2000',
      type: 'IMMEUBLE',
      address: 'Rue du Commerce, Plateau',
      district: 'Plateau',
      city: 'Abidjan',
      status: 'OCCUPE',
      description: 'Immeuble R+3 de 6 appartements, gardiennage 24h, ascenseur.',
      rentAmount: 350000,
      chargesAmount: 25000,
      depositAmount: 700000,
      bedrooms: 12,
      bathrooms: 6,
      areaSqm: 620,
    },
  });

  const villaCocody = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerBamba.id,
      reference: 'B-0002',
      name: 'Villa Riviera 3',
      type: 'VILLA',
      address: 'Riviera 3, rue L120',
      district: 'Cocody',
      status: 'OCCUPE',
      description: 'Villa 4 pièces avec cour, piscine et dépendance.',
      rentAmount: 650000,
      chargesAmount: 40000,
      depositAmount: 1300000,
      bedrooms: 4,
      bathrooms: 3,
      areaSqm: 280,
    },
  });

  const studioMarcory = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerCisse.id,
      reference: 'B-0003',
      name: 'Studio Zone 4',
      type: 'STUDIO',
      address: 'Rue Pierre et Marie Curie, Zone 4',
      district: 'Marcory',
      status: 'OCCUPE',
      description: 'Studio meublé, proche des commerces et restaurants.',
      rentAmount: 180000,
      chargesAmount: 15000,
      depositAmount: 360000,
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 42,
    },
  });

  const appartAngre = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerBamba.id,
      reference: 'B-0004',
      name: 'Appartement Angré 8e tranche',
      type: 'APPARTEMENT',
      address: 'Angré 8e tranche, près du carrefour Djibi',
      district: 'Cocody',
      status: 'OCCUPE',
      rentAmount: 220000,
      chargesAmount: 20000,
      depositAmount: 440000,
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 95,
    },
  });

  const boutiqueMarcory = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerCisse.id,
      reference: 'B-0005',
      name: 'Boutique Marché de Marcory',
      type: 'BOUTIQUE',
      address: 'Avenue du Marché, Marcory',
      district: 'Marcory',
      status: 'LIBRE',
      description: 'Local commercial de 30 m² avec rideau métallique.',
      rentAmount: 150000,
      chargesAmount: 10000,
      depositAmount: 450000,
      areaSqm: 30,
    },
  });

  const chambreYopougon = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerOuattara.id,
      reference: 'B-0006',
      name: 'Cour commune Niangon',
      type: 'CHAMBRE',
      address: 'Niangon Sud, rue des Palmiers',
      district: 'Yopougon',
      status: 'OCCUPE',
      rentAmount: 60000,
      chargesAmount: 5000,
      depositAmount: 120000,
      bedrooms: 2,
      bathrooms: 1,
      areaSqm: 55,
    },
  });

  const bureauPlateau = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerSociete.id,
      reference: 'B-0007',
      name: 'Plateau — Bureau 2e étage',
      type: 'BUREAU',
      address: 'Immeuble Nour Al Hayat, Plateau',
      district: 'Plateau',
      status: 'OCCUPE',
      rentAmount: 450000,
      chargesAmount: 50000,
      depositAmount: 900000,
      areaSqm: 120,
    },
  });

  const villaYopougon = await prisma.property.create({
    data: {
      organizationId: org.id,
      ownerId: ownerOuattara.id,
      reference: 'B-0008',
      name: 'Villa Toits Rouges',
      type: 'VILLA',
      address: 'Toits Rouges, rue 12',
      district: 'Yopougon',
      status: 'EN_TRAVAUX',
      description: 'Rénovation de la toiture et de la cuisine en cours.',
      rentAmount: 300000,
      chargesAmount: 25000,
      depositAmount: 600000,
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 150,
    },
  });

  // Logements de l'immeuble
  const unitData = [
    { name: 'Appartement 1A', floor: 0, rentAmount: 300000, chargesAmount: 20000, depositAmount: 600000, bedrooms: 2, bathrooms: 1 },
    { name: 'Appartement 1B', floor: 0, rentAmount: 320000, chargesAmount: 20000, depositAmount: 640000, bedrooms: 2, bathrooms: 1 },
    { name: 'Appartement 2A', floor: 1, rentAmount: 350000, chargesAmount: 25000, depositAmount: 700000, bedrooms: 3, bathrooms: 2 },
    { name: 'Appartement 2B', floor: 1, rentAmount: 350000, chargesAmount: 25000, depositAmount: 700000, bedrooms: 3, bathrooms: 2 },
    { name: 'Appartement 3A', floor: 2, rentAmount: 380000, chargesAmount: 25000, depositAmount: 760000, bedrooms: 3, bathrooms: 2 },
    { name: 'Appartement 3B', floor: 2, rentAmount: 380000, chargesAmount: 25000, depositAmount: 760000, bedrooms: 3, bathrooms: 2 },
  ];

  const units = [];
  for (const [index, unit] of unitData.entries()) {
    units.push(
      await prisma.unit.create({
        data: {
          organizationId: org.id,
          propertyId: immeubleAlpha.id,
          reference: `B-0001-L${index + 1}`,
          status: index < 4 ? 'OCCUPE' : 'LIBRE',
          ...unit,
        },
      }),
    );
  }

  // -------------------------------- LOCATAIRES -----------------------------
  const tenantSeeds = [
    { firstName: 'Awa', lastName: 'Traoré', phone: '+2250555667788', profession: 'Comptable', employer: 'SIB', guarantor: 'Bakary Traoré', quartier: 'Marcory' },
    { firstName: 'Serge', lastName: 'Nguessan', phone: '+2250566778899', profession: 'Ingénieur réseau', employer: 'Orange CI', guarantor: 'Affoué Nguessan', quartier: 'Cocody' },
    { firstName: 'Djeneba', lastName: 'Sanogo', phone: '+2250577889900', profession: 'Commerçante', employer: 'Indépendante', guarantor: 'Moussa Sanogo', quartier: 'Marcory' },
    { firstName: 'Éric', lastName: 'Zadi', phone: '+2250588990011', profession: 'Chauffeur VTC', employer: 'Yango', guarantor: 'Pauline Zadi', quartier: 'Yopougon' },
    { firstName: 'Nadège', lastName: 'Aka', phone: '+2250599001122', profession: 'Infirmière', employer: 'CHU Treichville', guarantor: 'Léon Aka', quartier: 'Cocody' },
    { firstName: 'Ibrahim', lastName: 'Coulibaly', phone: '+2250500112233', profession: 'Directeur commercial', employer: 'NSIA', guarantor: 'Salif Coulibaly', quartier: 'Plateau' },
    { firstName: 'Chantal', lastName: 'Gnahoré', phone: '+2250511223344', profession: 'Coiffeuse', employer: 'Salon Élégance', guarantor: 'Georges Gnahoré', quartier: 'Marcory' },
    { firstName: 'Koffi', lastName: 'Yao', phone: '+2250522334455', profession: 'Professeur', employer: 'Lycée Classique', guarantor: 'Adjoua Yao', quartier: 'Yopougon' },
    { firstName: 'Salimata', lastName: 'Bakayoko', phone: '+2250533445566', profession: 'Consultante', employer: 'Cabinet Deloitte', guarantor: 'Ousmane Bakayoko', quartier: 'Plateau' },
    { firstName: 'Patrick', lastName: 'Assi', phone: '+2250544556611', profession: 'Informaticien', employer: 'MTN CI', guarantor: 'Béatrice Assi', quartier: 'Cocody' },
  ];

  const tenants = [];
  for (const [index, tenant] of tenantSeeds.entries()) {
    tenants.push(
      await prisma.tenant.create({
        data: {
          organizationId: org.id,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          phone: tenant.phone,
          email: `${tenant.firstName.toLowerCase().replace(/[^a-z]/g, '')}.${tenant.lastName.toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
          idType: 'CNI',
          idNumber: `CI-${1000000 + index * 1327}`,
          profession: tenant.profession,
          employer: tenant.employer,
          emergencyContactName: tenant.guarantor,
          emergencyContactPhone: `+2250${7 - (index % 3)}${10000000 + index * 98765}`,
          guarantorName: tenant.guarantor,
          guarantorPhone: `+2250${5 - (index % 3)}${20000000 + index * 87654}`,
          guarantorIdNumber: `CI-${9000000 + index * 4321}`,
          notes: index === 0 ? 'Locataire de référence, toujours à jour.' : null,
        },
      }),
    );
  }

  // Compte locataire (espace locataire)
  await prisma.user.create({
    data: {
      organizationId: org.id,
      role: 'LOCATAIRE',
      firstName: tenants[0].firstName,
      lastName: tenants[0].lastName,
      email: 'locataire@monloyer.ci',
      phone: '+2250555667700',
      passwordHash,
      tenantProfile: { connect: { id: tenants[0].id } },
    },
  });

  // ----------------------------------- BAILS -------------------------------
  type LeaseSeed = {
    reference: string;
    propertyId: string;
    unitId?: string;
    tenantIndex: number;
    ownerId: string;
    rentAmount: number;
    chargesAmount: number;
    depositAmount: number;
    startOffsetMonths: number;
    endOffsetMonths: number;
    periodicity?: 'MENSUEL' | 'TRIMESTRIEL';
    status?: 'ACTIF' | 'RESILIE';
  };

  const leaseSeeds: LeaseSeed[] = [
    { reference: 'BAIL-2026-0001', propertyId: appartAngre.id, tenantIndex: 0, ownerId: ownerBamba.id, rentAmount: 220000, chargesAmount: 20000, depositAmount: 440000, startOffsetMonths: -7, endOffsetMonths: 5 },
    { reference: 'BAIL-2026-0002', propertyId: immeubleAlpha.id, unitId: units[0].id, tenantIndex: 1, ownerId: ownerSociete.id, rentAmount: 300000, chargesAmount: 20000, depositAmount: 600000, startOffsetMonths: -10, endOffsetMonths: 2 },
    { reference: 'BAIL-2026-0003', propertyId: immeubleAlpha.id, unitId: units[1].id, tenantIndex: 5, ownerId: ownerSociete.id, rentAmount: 320000, chargesAmount: 20000, depositAmount: 640000, startOffsetMonths: -5, endOffsetMonths: 7 },
    { reference: 'BAIL-2026-0004', propertyId: studioMarcory.id, tenantIndex: 2, ownerId: ownerCisse.id, rentAmount: 180000, chargesAmount: 15000, depositAmount: 360000, startOffsetMonths: -4, endOffsetMonths: 8 },
    { reference: 'BAIL-2026-0005', propertyId: villaCocody.id, tenantIndex: 3, ownerId: ownerBamba.id, rentAmount: 650000, chargesAmount: 40000, depositAmount: 1300000, startOffsetMonths: -12, endOffsetMonths: 0 },
    { reference: 'BAIL-2026-0006', propertyId: chambreYopougon.id, tenantIndex: 4, ownerId: ownerOuattara.id, rentAmount: 60000, chargesAmount: 5000, depositAmount: 120000, startOffsetMonths: -3, endOffsetMonths: 9 },
    { reference: 'BAIL-2026-0007', propertyId: bureauPlateau.id, tenantIndex: 6, ownerId: ownerSociete.id, rentAmount: 450000, chargesAmount: 50000, depositAmount: 900000, startOffsetMonths: -9, endOffsetMonths: 3 },
    { reference: 'BAIL-2026-0008', propertyId: immeubleAlpha.id, unitId: units[2].id, tenantIndex: 7, ownerId: ownerSociete.id, rentAmount: 350000, chargesAmount: 25000, depositAmount: 700000, startOffsetMonths: -2, endOffsetMonths: 10 },
    { reference: 'BAIL-2026-0009', propertyId: immeubleAlpha.id, unitId: units[3].id, tenantIndex: 8, ownerId: ownerSociete.id, rentAmount: 350000, chargesAmount: 25000, depositAmount: 700000, startOffsetMonths: -14, endOffsetMonths: -2, status: 'RESILIE' },
  ];

  let receiptCounter = 0;
  const year = now.getFullYear();

  for (const [leaseIndex, seed] of leaseSeeds.entries()) {
    const startDate = addMonths(currentMonth, seed.startOffsetMonths);
    const endDate = addMonths(currentMonth, seed.endOffsetMonths);

    const lease = await prisma.lease.create({
      data: {
        organizationId: org.id,
        propertyId: seed.propertyId,
        unitId: seed.unitId ?? null,
        tenantId: tenants[seed.tenantIndex].id,
        ownerId: seed.ownerId,
        reference: seed.reference,
        startDate,
        endDate,
        rentAmount: seed.rentAmount,
        chargesAmount: seed.chargesAmount,
        depositAmount: seed.depositAmount,
        advanceMonths: 2,
        periodicity: seed.periodicity ?? 'MENSUEL',
        status: seed.status ?? 'ACTIF',
        signedAt: addDays(startDate, -4),
        terminationDate: seed.status === 'RESILIE' ? addDays(endDate, 5) : null,
        terminationReason: seed.status === 'RESILIE' ? 'Départ volontaire du locataire (préavis respecté).' : null,
        noticePeriodDays: 30,
      },
    });

    const periods = buildSchedulePeriods({
      startDate,
      endDate,
      periodicity: seed.periodicity ?? 'MENSUEL',
      rentAmount: seed.rentAmount,
      chargesAmount: seed.chargesAmount,
    });

    for (const [periodIndex, period] of periods.entries()) {
      const due = period.rentDue + period.chargesDue;
      const daysLate = differenceInCalendarDays(now, period.dueDate);

      // Scénarios variés : la plupart des loyers sont payés, certains partiels,
      // quelques impayés récents (réalisme des relances).
      const paymentMethod = pick(['MOBILE_MONEY', 'VIREMENT', 'ESPECES', 'MOBILE_MONEY'] as const);
      // Répartition réaliste : ~75 % payés, ~10 % partiels, ~15 % impayés.
      const marker = (leaseIndex * 3 + periodIndex * 7) % 20;
      let scenario: 'full' | 'partial' | 'late' | 'future' = 'full';
      if (daysLate > 0) {
        if (marker === 0 || marker === 13) scenario = 'partial';
        else if (marker === 5 || marker === 11) scenario = 'late';
        else scenario = 'full';
      } else {
        scenario = daysLate > -6 ? 'future' : 'full';
      }
      let paid = 0;

      const schedule = await prisma.rentSchedule.create({
        data: {
          organizationId: org.id,
          leaseId: lease.id,
          periodStart: period.periodStart,
          dueDate: period.dueDate,
          periodLabel: period.periodLabel,
          rentDue: period.rentDue,
          chargesDue: period.chargesDue,
          amountPaid: 0,
          status: 'A_VENIR',
        },
      });

      if (scenario === 'full') {
        paid = due;
      } else if (scenario === 'partial') {
        paid = Math.round(due * 0.5);
      }

      if (paid > 0) {
        const paidAt = addDays(period.dueDate, Math.floor(random() * 6));
        const payment = await prisma.payment.create({
          data: {
            organizationId: org.id,
            leaseId: lease.id,
            rentScheduleId: schedule.id,
            tenantId: tenants[seed.tenantIndex].id,
            amount: paid,
            method: paymentMethod,
            reference:
              paymentMethod === 'MOBILE_MONEY'
                ? `WAVE-${Math.floor(100000 + random() * 899999)}`
                : paymentMethod === 'VIREMENT'
                  ? `VIR-${year}-${Math.floor(1000 + random() * 8999)}`
                  : null,
            paidAt,
            recordedById: leaseIndex % 3 === 0 ? admin.id : agent.id,
            status: 'VALIDE',
            notes: scenario === 'partial' ? 'Versement partiel, solde à régler.' : null,
          },
        });

        const status = deriveRentStatus(
          { rentDue: period.rentDue, chargesDue: period.chargesDue, penaltyAmount: 0, amountPaid: paid },
          period.dueDate,
          now,
        );

        await prisma.rentSchedule.update({
          where: { id: schedule.id },
          data: { amountPaid: paid, status },
        });

        // Quittance émise pour chaque paiement (partiel compris)
        receiptCounter += 1;
        const number = `QUI-${year}-${String(receiptCounter).padStart(4, '0')}`;
        await prisma.receipt.create({
          data: {
            organizationId: org.id,
            number,
            paymentId: payment.id,
            leaseId: lease.id,
            tenantId: tenants[seed.tenantIndex].id,
            periodLabel: period.periodLabel,
            amountPaid: paid,
            chargesPaid: period.chargesDue,
            balanceDue: Math.max(0, due - paid),
            issuedAt: paidAt,
            issuedById: admin.id,
          },
        });
      } else if (scenario === 'late' || (daysLate > 0 && paid === 0)) {
        await prisma.rentSchedule.update({
          where: { id: schedule.id },
          data: { status: deriveRentStatus({ rentDue: period.rentDue, chargesDue: period.chargesDue, penaltyAmount: 0, amountPaid: 0 }, period.dueDate, now) },
        });

        // Relance déjà envoyée pour les impayés anciens
        if (daysLate > 7) {
          const tenant = tenants[seed.tenantIndex];
          const message = `Bonjour ${tenant.firstName}, votre loyer de ${due.toLocaleString('fr-FR')} FCFA pour ${period.periodLabel} est en retard. Merci de régulariser. — Agence Immo Abidjan`;
          await prisma.reminder.create({
            data: {
              organizationId: org.id,
              rentScheduleId: schedule.id,
              channel: 'WHATSAPP',
              status: 'ENVOYE',
              offsetDays: 7,
              message,
              sentAt: addDays(period.dueDate, 7),
              createdById: agent.id,
            },
          });
        }
      }
    }

    // Le logement passe « occupé » tant que le bail est actif
    if (seed.unitId && seed.status !== 'RESILIE') {
      await prisma.unit.update({ where: { id: seed.unitId }, data: { status: 'OCCUPE' } });
    }
    if ((seed.status ?? 'ACTIF') === 'ACTIF') {
      await prisma.property.update({
        where: { id: seed.propertyId },
        data: { status: 'OCCUPE' },
      });
    }
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { receiptCounter },
  });

  // --------------------------------- DÉPENSES ------------------------------
  const expenseSeeds = [
    { propertyId: villaCocody.id, ownerId: ownerBamba.id, category: 'REPARATION' as const, label: 'Réparation pompe à eau', amount: 85000, dayOffset: -22, supplier: 'Plomberie Cocody' },
    { propertyId: immeubleAlpha.id, ownerId: ownerSociete.id, category: 'ELECTRICITE' as const, label: 'Facture CIE parties communes', amount: 145000, dayOffset: -15, supplier: 'CIE' },
    { propertyId: immeubleAlpha.id, ownerId: ownerSociete.id, category: 'EAU' as const, label: 'Facture SODECI', amount: 78000, dayOffset: -14, supplier: 'SODECI' },
    { propertyId: studioMarcory.id, ownerId: ownerCisse.id, category: 'TRAVAUX' as const, label: 'Peinture et carrelage', amount: 320000, dayOffset: -40, supplier: 'Bâtir Plus' },
    { propertyId: bureauPlateau.id, ownerId: ownerSociete.id, category: 'HONORAIRES' as const, label: 'Honoraires gardiennage', amount: 60000, dayOffset: -8, supplier: 'Sécurité Ivoire' },
    { propertyId: chambreYopougon.id, ownerId: ownerOuattara.id, category: 'REPARATION' as const, label: 'Remplacement robinetterie', amount: 25000, dayOffset: -11, supplier: 'Artisan Niangon' },
  ];

  for (const expense of expenseSeeds) {
    await prisma.expense.create({
      data: {
        organizationId: org.id,
        propertyId: expense.propertyId,
        ownerId: expense.ownerId,
        category: expense.category,
        label: expense.label,
        amount: expense.amount,
        date: addDays(now, expense.dayOffset),
        supplier: expense.supplier,
        createdById: accountant.id,
      },
    });
  }

  // ------------------------------ JOURNAL D'ACTIVITÉ -----------------------
  await prisma.activityLog.createMany({
    data: [
      { organizationId: org.id, actorId: admin.id, actorName: 'Aminata Koné', action: 'organization.seed', entityType: 'Organization', entityId: org.id, description: 'Création du jeu de démonstration' },
      { organizationId: org.id, actorId: agent.id, actorName: 'Yao Kouassi', action: 'lease.create', entityType: 'Lease', description: 'Contrat BAIL-2026-0004 créé pour Nadège Aka' },
      { organizationId: org.id, actorId: accountant.id, actorName: 'Fatou Diallo', action: 'payment.create', entityType: 'Payment', description: 'Paiement Mobile Money enregistré (Studio Zone 4)' },
      { organizationId: org.id, actorId: admin.id, actorName: 'Aminata Koné', action: 'reminder.send', entityType: 'Reminder', description: 'Relance WhatsApp envoyée pour un impayé' },
    ],
  });

  // Invitation de démonstration encore valide
  const invitationToken = 'demo-invitation-agent-2026';
  await prisma.invitation.create({
    data: {
      organizationId: org.id,
      email: 'nouvel.agent@exemple.ci',
      firstName: 'Rokia',
      lastName: 'Toure',
      role: 'AGENT',
      token: invitationToken,
      status: 'EN_ATTENTE',
      invitedById: admin.id,
      expiresAt: addDays(now, 10),
    },
  });

  console.log('\n=== Démonstration prête ===');
  console.log(`Organisation : ${org.name} (${org.id})`);
  console.log(`Connexion     : admin@monloyer.ci / ${PASSWORD}`);
  console.log('Autres comptes: agent@monloyer.ci, comptable@monloyer.ci, proprietaire@monloyer.ci, locataire@monloyer.ci');
  console.log(`Lien d'invitation de démo : /invitation/${invitationToken}`);
  console.log(`Mois courant : ${periodLabelOf(now)}`);
}

main()
  .catch((error) => {
    console.error('[seed] échec', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
