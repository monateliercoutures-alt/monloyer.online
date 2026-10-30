import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import type { z } from 'zod';
import type { tenantSchema } from '@/lib/validations';

export type TenantInputZ = z.infer<typeof tenantSchema>;

export async function listTenants(organizationId: string) {
  return prisma.tenant.findMany({
    where: { organizationId },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      leases: {
        where: { status: 'ACTIF' },
        select: { id: true, reference: true, property: { select: { address: true, district: true } } },
      },
      _count: { select: { leases: true } },
    },
  });
}

export async function getTenant(organizationId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    include: {
      leases: {
        orderBy: { startDate: 'desc' },
        include: { property: true, unit: true, rentSchedules: { orderBy: { dueDate: 'desc' } } },
      },
      payments: { orderBy: { paidAt: 'desc' }, take: 20, include: { receipt: true } },
      receipts: { orderBy: { issuedAt: 'desc' }, take: 20 },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!tenant) throw new ApiError(404, 'Locataire introuvable.');
  return tenant;
}

export async function createTenant(organizationId: string, input: TenantInputZ) {
  return prisma.tenant.create({
    data: {
      organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email || null,
      idType: input.idType || null,
      idNumber: input.idNumber || null,
      idDocumentUrl: input.idDocumentUrl || null,
      profession: input.profession || null,
      employer: input.employer || null,
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      guarantorName: input.guarantorName || null,
      guarantorPhone: input.guarantorPhone || null,
      guarantorIdNumber: input.guarantorIdNumber || null,
      notes: input.notes || null,
      isActive: input.isActive,
    },
  });
}

export async function updateTenant(organizationId: string, tenantId: string, input: TenantInputZ) {
  const existing = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, 'Locataire introuvable.');

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email || null,
      idType: input.idType || null,
      idNumber: input.idNumber || null,
      idDocumentUrl: input.idDocumentUrl || null,
      profession: input.profession || null,
      employer: input.employer || null,
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      guarantorName: input.guarantorName || null,
      guarantorPhone: input.guarantorPhone || null,
      guarantorIdNumber: input.guarantorIdNumber || null,
      notes: input.notes || null,
      isActive: input.isActive,
    },
  });
}

export async function deleteTenant(organizationId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    include: { _count: { select: { leases: true } } },
  });
  if (!tenant) throw new ApiError(404, 'Locataire introuvable.');
  if (tenant._count.leases > 0) {
    throw new ApiError(409, 'Ce locataire possède un historique de contrats : désactivez-le plutôt.');
  }
  await prisma.tenant.delete({ where: { id: tenantId } });
}
