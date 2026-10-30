import type { Metadata } from 'next';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { PropertiesTable } from '@/components/tables/properties-table';
import { PropertyFormDialog } from '@/components/forms/property-form';
import { getTenantContext } from '@/server/session';
import { listProperties } from '@/server/services/properties.service';
import { listOwners } from '@/server/services/owners.service';
import { formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Biens & logements' };
export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const { organizationId } = await getTenantContext();
  const [properties, owners] = await Promise.all([
    listProperties(organizationId),
    listOwners(organizationId),
  ]);

  const occupied = properties.filter((property) => property.status === 'OCCUPE').length;
  const potentialRent = properties.reduce((sum, property) => sum + property.rentAmount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Biens & logements"
        description={`${properties.length} bien(s) · ${occupied} occupé(s) · ${formatFCFA(potentialRent)} de loyers potentiels`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/biens/importer">
                <Upload className="size-4" /> Importer
              </Link>
            </Button>
            <PropertyFormDialog
              owners={owners.map((owner) => ({
                id: owner.id,
                firstName: owner.firstName,
                lastName: owner.lastName,
              }))}
            />
          </>
        }
      />
      <PropertiesTable properties={properties} />
    </div>
  );
}
