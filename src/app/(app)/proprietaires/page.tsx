import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { OwnersTable } from '@/components/tables/owners-table';
import { OwnerFormDialog } from '@/components/forms/owner-form';
import { getTenantContext } from '@/server/session';
import { listOwners } from '@/server/services/owners.service';
import { formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Propriétaires' };
export const dynamic = 'force-dynamic';

export default async function OwnersPage() {
  const { organizationId } = await getTenantContext();
  const owners = await listOwners(organizationId);

  const totalProperties = owners.reduce((sum, owner) => sum + owner.properties.length, 0);
  const totalRent = owners.reduce(
    (sum, owner) => sum + owner.properties.reduce((inner, property) => inner + property.rentAmount, 0),
    0,
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Propriétaires"
        description={`${owners.length} propriétaire(s) · ${totalProperties} bien(s) en gestion · ${formatFCFA(totalRent)} de loyers potentiels`}
        actions={<OwnerFormDialog />}
      />
      <OwnersTable owners={owners} />
    </div>
  );
}
