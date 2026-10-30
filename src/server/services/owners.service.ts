import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import type { z } from 'zod';
import type { ownerSchema } from '@/lib/validations';

export type OwnerInputZ = z.infer<typeof ownerSchema>;

export async function listOwners(organizationId: string) {
  return prisma.owner.findMany({
    where: { organizationId },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      _count: { select: { properties: true } },
      properties: { select: { id: true, status: true, rentAmount: true } },
    },
  });
}

export async function getOwner(organizationId: string, ownerId: string) {
  const owner = await prisma.owner.findFirst({
    where: { id: ownerId, organizationId },
    include: {
      properties: {
        orderBy: { reference: 'asc' },
        include: { units: { orderBy: { name: 'asc' } } },
      },
      leases: {
        orderBy: { startDate: 'desc' },
        include: {
          tenant: true,
          property: true,
          rentSchedules: { orderBy: { dueDate: 'desc' }, take: 6 },
        },
      },
      expenses: { orderBy: { date: 'desc' }, take: 10 },
      _count: { select: { properties: true, leases: true } },
    },
  });
  if (!owner) throw new ApiError(404, 'Propriétaire introuvable.');
  return owner;
}

export async function createOwner(organizationId: string, input: OwnerInputZ) {
  return prisma.owner.create({
    data: {
      organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      idNumber: input.idNumber || null,
      mandateType: input.mandateType,
      mandateStart: input.mandateStart ?? new Date(),
      mandateEnd: input.mandateEnd ?? null,
      commissionType: input.commissionType,
      commissionValue: input.commissionValue ?? null,
      paymentMethod: input.paymentMethod || null,
      paymentDetails: input.paymentDetails || null,
      notes: input.notes || null,
      isActive: input.isActive,
    },
  });
}

export async function updateOwner(organizationId: string, ownerId: string, input: OwnerInputZ) {
  const existing = await prisma.owner.findFirst({ where: { id: ownerId, organizationId }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'Propriétaire introuvable.');

  return prisma.owner.update({
    where: { id: ownerId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      idNumber: input.idNumber || null,
      mandateType: input.mandateType,
      mandateStart: input.mandateStart ?? null,
      mandateEnd: input.mandateEnd ?? null,
      commissionType: input.commissionType,
      commissionValue: input.commissionValue ?? null,
      paymentMethod: input.paymentMethod || null,
      paymentDetails: input.paymentDetails || null,
      notes: input.notes || null,
      isActive: input.isActive,
    },
  });
}

export async function deleteOwner(organizationId: string, ownerId: string) {
  const owner = await prisma.owner.findFirst({
    where: { id: ownerId, organizationId },
    include: { _count: { select: { properties: true } } },
  });
  if (!owner) throw new ApiError(404, 'Propriétaire introuvable.');
  if (owner._count.properties > 0) {
    throw new ApiError(
      409,
      'Ce propriétaire possède encore des biens. Transférez-les ou archivez-les avant suppression.',
    );
  }
  await prisma.owner.delete({ where: { id: ownerId } });
}
