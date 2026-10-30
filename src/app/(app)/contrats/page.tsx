import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { LeasesTable } from '@/components/tables/leases-table';
import { getTenantContext } from '@/server/session';
import { listLeases } from '@/server/services/leases.service';
import { formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Contrats de bail' };
export const dynamic = 'force-dynamic';

export default async function LeasesPage() {
  const { organizationId } = await getTenantContext();
  const leases = await listLeases(organizationId);
  const active = leases.filter((lease) => lease.status === 'ACTIF');
  const monthlyRent = active.reduce((sum, lease) => sum + lease.rentAmount + lease.chargesAmount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contrats de bail"
        description={`${active.length} bail(aux) actif(s) · ${formatFCFA(monthlyRent)} de loyers mensuels`}
        actions={
          <Button asChild>
            <Link href="/contrats/nouveau">
              <Plus className="size-4" /> Nouveau contrat
            </Link>
          </Button>
        }
      />
      <LeasesTable leases={leases} />
    </div>
  );
}
