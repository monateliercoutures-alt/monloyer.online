import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { RentStatusBadge } from '@/components/ui/status-badge';
import { getTenantContext, requireUser } from '@/server/session';
import { getTenantPortal } from '@/server/services/reports.service';
import { formatDate, formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Mon contrat' };
export const dynamic = 'force-dynamic';

export default async function TenantLeasePage() {
  const user = await requireUser();
  const { organizationId } = await getTenantContext();
  const { activeLease } = await getTenantPortal(organizationId, user.id);

  return (
    <div className="space-y-4">
      <PageHeader title="Mon contrat de bail" description="Conditions, échéancier et document PDF." />
      {!activeLease ? (
        <EmptyState title="Aucun contrat actif" description="Contactez votre agence." />
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{activeLease.reference}</CardTitle>
              <Button asChild size="sm">
                <a href={`/api/pdf/contrat/${activeLease.id}`} target="_blank" rel="noreferrer">
                  <Download className="size-4" /> PDF
                </a>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Logement</p>
                <p className="font-medium">
                  {activeLease.property.address}
                  {activeLease.unit ? ` — ${activeLease.unit.name}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loyer + charges</p>
                <p className="font-medium">
                  {formatFCFA(activeLease.rentAmount)} + {formatFCFA(activeLease.chargesAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Caution</p>
                <p className="font-medium">{formatFCFA(activeLease.depositAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Du</p>
                <p className="font-medium">{formatDate(activeLease.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Au</p>
                <p className="font-medium">{formatDate(activeLease.endDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Préavis</p>
                <p className="font-medium">{activeLease.noticePeriodDays} jours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Échéancier</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {activeLease.rentSchedules.map((schedule) => (
                  <li key={schedule.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      {schedule.periodLabel} · {formatDate(schedule.dueDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <RentStatusBadge status={schedule.status} />
                      <span className="font-medium">
                        {formatFCFA(schedule.rentDue + schedule.chargesDue + schedule.penaltyAmount)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            <Link href="/mon-espace" className="text-primary hover:underline">
              Retour à mon espace
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
