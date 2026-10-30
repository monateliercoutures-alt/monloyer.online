import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Download, FileText, ReceiptText, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PropertyStatusBadge, RentStatusBadge } from '@/components/ui/status-badge';
import { getTenantContext, requireUser } from '@/server/session';
import { getOwnerPortal, getTenantPortal } from '@/server/services/reports.service';
import { formatDate, formatFCFA } from '@/lib/format';
import { balanceOf } from '@/lib/rent';

export const metadata: Metadata = { title: 'Mon espace' };
export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const user = await requireUser();
  const { organizationId } = await getTenantContext();

  if (user.role === 'LOCATAIRE') {
    const { tenant, activeLease, balance } = await getTenantPortal(organizationId, user.id);

    return (
      <div className="space-y-4">
        <PageHeader
          title={`Bonjour ${tenant.firstName}`}
          description="Votre contrat, vos quittances et votre solde en temps réel."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/mon-espace/quittances">
                <ReceiptText className="size-4" /> Mes quittances
              </Link>
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Solde restant dû"
            value={formatFCFA(balance)}
            tone={balance > 0 ? 'danger' : 'success'}
            icon={Wallet}
          />
          <StatCard
            label="Loyer mensuel"
            value={activeLease ? formatFCFA(activeLease.rentAmount + activeLease.chargesAmount) : '—'}
            hint={activeLease ? `Charges incluses : ${formatFCFA(activeLease.chargesAmount)}` : undefined}
          />
          <StatCard
            label="Quittances reçues"
            value={String(tenant.receipts.length)}
            icon={ReceiptText}
          />
        </div>

        {activeLease ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Logement loué</CardTitle>
              <Badge variant="success">Bail actif</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                {activeLease.property.address}, {activeLease.property.district}
                {activeLease.unit ? ` — ${activeLease.unit.name}` : ''}
              </p>
              <p className="text-muted-foreground">
                Contrat {activeLease.reference} · du {formatDate(activeLease.startDate)} au{' '}
                {formatDate(activeLease.endDate)}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/mon-espace/contrat">
                    <FileText className="size-4" /> Voir mon contrat
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/pdf/contrat/${activeLease.id}`} target="_blank" rel="noreferrer">
                    <Download className="size-4" /> Télécharger le PDF
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="Aucun bail actif" description="Contactez votre agence pour plus d'informations." />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Prochaines échéances</CardTitle>
          </CardHeader>
          <CardContent>
            {activeLease && activeLease.rentSchedules.length > 0 ? (
              <ul className="divide-y divide-border">
                {activeLease.rentSchedules
                  .filter((schedule) => schedule.status !== 'PAYE')
                  .slice(0, 5)
                  .map((schedule) => (
                    <li key={schedule.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                      <span>
                        {schedule.periodLabel} · {formatDate(schedule.dueDate)}
                      </span>
                      <span className="flex items-center gap-2">
                        <RentStatusBadge status={schedule.status} />
                        <span className="font-semibold">{formatFCFA(balanceOf(schedule))}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tout est à jour.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== 'PROPRIETAIRE') {
    return (
      <div className="space-y-4">
        <PageHeader title="Mon espace" description="Cet espace est réservé aux comptes propriétaire et locataire." />
        <EmptyState
          title="Espace personnel"
          description="Votre compte est un compte collaborateur : utilisez le tableau de bord de l'agence."
          action={
            <Button asChild>
              <Link href="/tableau-de-bord">Aller au tableau de bord</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Espace propriétaire
  const { owner, statement } = await getOwnerPortal(organizationId, user.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Bonjour ${owner.firstName}`}
        description="Vos biens en gestion, les loyers encaissés et vos relevés mensuels."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/mon-espace/releves">
              <FileText className="size-4" /> Mes relevés
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Biens en gestion" value={String(owner.properties.length)} icon={Building2} />
        <StatCard
          label="Loyers encaissés (mois)"
          value={formatFCFA(statement?.collected ?? 0)}
          tone="success"
        />
        <StatCard label="Net à recevoir" value={formatFCFA(statement?.netToRemit ?? 0)} tone="info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes biens</CardTitle>
        </CardHeader>
        <CardContent>
          {owner.properties.length === 0 ? (
            <EmptyState title="Aucun bien" description="Vos biens gérés par l'agence apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-border">
              {owner.properties.map((property) => (
                <li key={property.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {property.reference} · {property.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {property.district} · {formatFCFA(property.rentAmount)} · {property.units.length} logement(s)
                    </p>
                  </div>
                  <PropertyStatusBadge status={property.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
