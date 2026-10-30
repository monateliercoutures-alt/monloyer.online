import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PropertyStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getTenantContext, requireUser } from '@/server/session';
import { getOwnerPortal } from '@/server/services/reports.service';
import { formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Mes biens' };
export const dynamic = 'force-dynamic';

export default async function OwnerPropertiesPage() {
  const user = await requireUser();
  const { organizationId } = await getTenantContext();
  const { owner } = await getOwnerPortal(organizationId, user.id);

  return (
    <div className="space-y-4">
      <PageHeader title="Mes biens" description="Biens et logements gérés par l'agence." />
      {owner.properties.length === 0 ? (
        <EmptyState title="Aucun bien" description="Vos biens apparaîtront ici." />
      ) : (
        owner.properties.map((property) => (
          <Card key={property.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {property.reference} · {property.address}
              </CardTitle>
              <PropertyStatusBadge status={property.status} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {property.district}, {property.city} · Loyer {formatFCFA(property.rentAmount)} · Charges{' '}
                {formatFCFA(property.chargesAmount)}
              </p>
              {property.units.length > 0 ? (
                <ul className="divide-y divide-border">
                  {property.units.map((unit) => (
                    <li key={unit.id} className="flex items-center justify-between py-1.5 text-xs">
                      <span>{unit.name}</span>
                      <span className="text-muted-foreground">
                        {unit.rentAmount ? formatFCFA(unit.rentAmount) : '—'} · {unit.status.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
