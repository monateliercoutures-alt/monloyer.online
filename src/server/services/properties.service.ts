import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import type { z } from 'zod';
import type { propertySchema, unitSchema, propertyImportSchema } from '@/lib/validations';

export type PropertyInputZ = z.infer<typeof propertySchema>;
export type UnitInputZ = z.infer<typeof unitSchema>;
export type PropertyImportZ = z.infer<typeof propertyImportSchema>;

export async function listProperties(organizationId: string) {
  return prisma.property.findMany({
    where: { organizationId },
    orderBy: { reference: 'asc' },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      units: { select: { id: true, name: true, status: true, rentAmount: true, chargesAmount: true, depositAmount: true } },
      leases: {
        where: { status: 'ACTIF' },
        select: { id: true, tenant: { select: { firstName: true, lastName: true } } },
      },
    },
  });
}

export async function getProperty(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    include: {
      owner: true,
      units: {
        orderBy: { name: 'asc' },
        include: {
          leases: {
            where: { status: 'ACTIF' },
            select: { id: true, reference: true, tenant: { select: { firstName: true, lastName: true } } },
          },
        },
      },
      leases: {
        orderBy: { startDate: 'desc' },
        include: { tenant: true, unit: true },
      },
      expenses: { orderBy: { date: 'desc' }, take: 10 },
    },
  });
  if (!property) throw new ApiError(404, 'Bien introuvable.');
  return property;
}

async function assertOwner(organizationId: string, ownerId: string) {
  const owner = await prisma.owner.findFirst({
    where: { id: ownerId, organizationId },
    select: { id: true },
  });
  if (!owner) throw new ApiError(400, 'Propriétaire invalide pour cette organisation.');
}

export async function createProperty(organizationId: string, input: PropertyInputZ) {
  await assertOwner(organizationId, input.ownerId);
  return prisma.property.create({
    data: {
      organizationId,
      ownerId: input.ownerId,
      reference: input.reference,
      name: input.name || null,
      type: input.type,
      address: input.address,
      district: input.district,
      city: input.city || 'Abidjan',
      status: input.status,
      description: input.description || null,
      photos: input.photos ?? [],
      rentAmount: input.rentAmount,
      chargesAmount: input.chargesAmount,
      depositAmount: input.depositAmount,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      areaSqm: input.areaSqm ?? null,
    },
  });
}

export async function updateProperty(organizationId: string, propertyId: string, input: PropertyInputZ) {
  const existing = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, 'Bien introuvable.');
  await assertOwner(organizationId, input.ownerId);

  return prisma.property.update({
    where: { id: propertyId },
    data: {
      ownerId: input.ownerId,
      reference: input.reference,
      name: input.name || null,
      type: input.type,
      address: input.address,
      district: input.district,
      city: input.city || 'Abidjan',
      status: input.status,
      description: input.description || null,
      photos: input.photos ?? [],
      rentAmount: input.rentAmount,
      chargesAmount: input.chargesAmount,
      depositAmount: input.depositAmount,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      areaSqm: input.areaSqm ?? null,
    },
  });
}

export async function deleteProperty(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    include: { _count: { select: { leases: true } } },
  });
  if (!property) throw new ApiError(404, 'Bien introuvable.');
  if (property._count.leases > 0) {
    throw new ApiError(409, 'Ce bien possède un historique de contrats : il ne peut pas être supprimé.');
  }
  await prisma.property.delete({ where: { id: propertyId } });
}

export async function createUnit(organizationId: string, input: UnitInputZ) {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId },
    select: { id: true },
  });
  if (!property) throw new ApiError(400, 'Bien invalide.');

  return prisma.unit.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      name: input.name,
      reference: input.reference || null,
      floor: input.floor ?? null,
      rentAmount: input.rentAmount ?? null,
      chargesAmount: input.chargesAmount ?? null,
      depositAmount: input.depositAmount ?? null,
      status: input.status,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
    },
  });
}

export async function updateUnit(organizationId: string, unitId: string, input: Omit<UnitInputZ, 'propertyId'>) {
  const unit = await prisma.unit.findFirst({ where: { id: unitId, organizationId }, select: { id: true } });
  if (!unit) throw new ApiError(404, 'Logement introuvable.');

  return prisma.unit.update({
    where: { id: unitId },
    data: {
      name: input.name,
      reference: input.reference || null,
      floor: input.floor ?? null,
      rentAmount: input.rentAmount ?? null,
      chargesAmount: input.chargesAmount ?? null,
      depositAmount: input.depositAmount ?? null,
      status: input.status,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
    },
  });
}

export async function deleteUnit(organizationId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, organizationId },
    include: { _count: { select: { leases: true } } },
  });
  if (!unit) throw new ApiError(404, 'Logement introuvable.');
  if (unit._count.leases > 0) throw new ApiError(409, 'Ce logement possède un contrat : suppression impossible.');
  await prisma.unit.delete({ where: { id: unitId } });
}

/** Import CSV/Excel : les propriétaires sont créés à la volée s'ils n'existent pas. */
export async function importProperties(
  organizationId: string,
  rows: PropertyImportZ['rows'],
): Promise<{ created: number; ownersCreated: number; errors: string[] }> {
  const typeMap: Record<string, 'APPARTEMENT' | 'VILLA' | 'STUDIO' | 'CHAMBRE' | 'BOUTIQUE' | 'BUREAU' | 'IMMEUBLE'> = {
    appartement: 'APPARTEMENT',
    villa: 'VILLA',
    studio: 'STUDIO',
    chambre: 'CHAMBRE',
    boutique: 'BOUTIQUE',
    bureau: 'BUREAU',
    immeuble: 'IMMEUBLE',
  };

  let created = 0;
  let ownersCreated = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    try {
      const type = typeMap[row.type.toLowerCase().trim()];
      if (!type) throw new Error(`Type « ${row.type} » inconnu`);

      const [firstName, ...rest] = row.ownerName.trim().split(' ');
      const lastName = rest.join(' ') || firstName;

      let owner = await prisma.owner.findFirst({
        where: { organizationId, firstName, lastName },
        select: { id: true },
      });
      if (!owner) {
        owner = await prisma.owner.create({
          data: {
            organizationId,
            firstName,
            lastName,
            phone: '+2250000000000',
            notes: 'Créé automatiquement lors de l’import de biens',
          },
          select: { id: true },
        });
        ownersCreated += 1;
      }

      const reference =
        row.reference ||
        `IMP-${String(index + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

      await prisma.property.create({
        data: {
          organizationId,
          ownerId: owner.id,
          reference,
          type,
          address: row.address,
          district: row.district,
          city: 'Abidjan',
          status: 'LIBRE',
          rentAmount: row.rentAmount,
          chargesAmount: row.chargesAmount ?? 0,
          depositAmount: row.depositAmount ?? row.rentAmount,
          bedrooms: row.bedrooms ?? null,
        },
      });
      created += 1;
    } catch (error) {
      errors.push(
        `Ligne ${index + 1} (${row.reference}) : ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      );
    }
  }

  return { created, ownersCreated, errors };
}
