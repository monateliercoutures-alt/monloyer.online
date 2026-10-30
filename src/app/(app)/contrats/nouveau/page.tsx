import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LeaseWizard } from '@/components/forms/lease-wizard';
import { requirePermission, getTenantContext } from '@/server/session';
import { listProperties } from '@/server/services/properties.service';
import { listTenants } from '@/server/services/tenants.service';
import { prisma } from '@/server/db';

export const metadata: Metadata = { title: 'Nouveau contrat' };
export const dynamic = 'force-dynamic';

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  await requirePermission('leases:write');
  const { organizationId } = await getTenantContext();
  const { propertyId } = await searchParams;

  const [properties, tenants, leaseCount] = await Promise.all([
    listProperties(organizationId),
    listTenants(organizationId),
    prisma.lease.count({ where: { organizationId } }),
  ]);

  const reference = `BAIL-${new Date().getFullYear()}-${String(leaseCount + 1).padStart(4, '0')}`;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/contrats">
          <ArrowLeft className="size-4" /> Contrats
        </Link>
      </Button>
      <PageHeader
        title="Nouveau contrat de bail"
        description="Trois étapes : le bien, les conditions, puis la validation. L'échéancier est généré automatiquement."
      />

      {properties.length === 0 || tenants.length === 0 ? (
        <EmptyState
          title="Prérequis manquants"
          description="Ajoutez au moins un bien et un locataire avant de créer un contrat de bail."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/biens">Ajouter un bien</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/locataires">Ajouter un locataire</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <LeaseWizard
          defaultPropertyId={propertyId}
          nextReference={reference}
          properties={properties.map((property) => ({
            id: property.id,
            reference: property.reference,
            name: property.name,
            type: property.type,
            address: property.address,
            district: property.district,
            rentAmount: property.rentAmount,
            chargesAmount: property.chargesAmount,
            depositAmount: property.depositAmount,
            units: property.units.map((unit) => ({
              id: unit.id,
              name: unit.name,
              rentAmount: unit.rentAmount,
              chargesAmount: unit.chargesAmount,
              depositAmount: unit.depositAmount,
            })),
          }))}
          tenants={tenants.map((tenant) => ({
            id: tenant.id,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            phone: tenant.phone,
          }))}
        />
      )}
    </div>
  );
}
