import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { TenantsTable } from '@/components/tables/tenants-table';
import { TenantFormDialog } from '@/components/forms/tenant-form';
import { getTenantContext } from '@/server/session';
import { listTenants } from '@/server/services/tenants.service';

export const metadata: Metadata = { title: 'Locataires' };
export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  const { organizationId } = await getTenantContext();
  const tenants = await listTenants(organizationId);
  const withLease = tenants.filter((tenant) => tenant.leases.length > 0).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Locataires"
        description={`${tenants.length} locataire(s) · ${withLease} avec un bail actif`}
        actions={<TenantFormDialog />}
      />
      <TenantsTable tenants={tenants} />
    </div>
  );
}
