import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  HandCoins,
  MessageCircle,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { RentStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { getDashboard } from '@/server/services/reports.service';
import { getTenantContext, requireUser } from '@/server/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';
import { formatDate, formatFCFA, formatMonthYear, formatPercent } from '@/lib/format';
import { requirePermission } from '@/server/session';

export const metadata: Metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await requireUser();
  if (currentUser.role === 'LOCATAIRE' || currentUser.role === 'PROPRIETAIRE') {
    redirect('/mon-espace');
  }
  const user = await requirePermission('properties:read');
  const { organizationId } = await getTenantContext();
  const data = await getDashboard(organizationId);

  const [propertiesCount, tenantsCount, leasesCount, paymentsCount] = await Promise.all([
    prisma.property.count({ where: { organizationId } }),
    prisma.tenant.count({ where: { organizationId } }),
    prisma.lease.count({ where: { organizationId } }),
    prisma.payment.count({ where: { organizationId, status: 'VALIDE' } }),
  ]);

  const maxTrend = Math.max(...data.monthTrend.map((item) => Math.max(item.expected, item.collected)), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Bonjour ${user.firstName} 👋`}
        description={`${formatMonthYear(data.generatedAt)} · ${user.organization?.name ?? ''}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/relances">
                <MessageCircle className="size-4" /> Relances ({data.remindersPending})
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/paiements">
                <HandCoins className="size-4" /> Encaisser
              </Link>
            </Button>
          </>
        }
      />

      <OnboardingChecklist
        properties={propertiesCount}
        tenants={tenantsCount}
        leases={leasesCount}
        payments={paymentsCount}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Loyers attendus (mois)"
          value={formatFCFA(data.expectedThisMonth)}
          hint={`${data.totalProperties} biens · ${data.totalUnits} logements`}
          icon={Wallet}
        />
        <StatCard
          label="Encaissé ce mois"
          value={formatFCFA(data.collectedThisMonth)}
          hint={`Taux de recouvrement : ${formatPercent(data.collectionRate)}`}
          icon={HandCoins}
          tone="success"
        />
        <StatCard
          label="Impayés"
          value={formatFCFA(data.totalUnpaid)}
          hint={`${data.overdueCount} échéance(s) en retard ou partielle`}
          icon={AlertTriangle}
          tone="danger"
        />
        <StatCard
          label="Taux d'occupation"
          value={formatPercent(data.occupancyRate)}
          hint={`${data.vacantCount} bien(s) vacant(s)`}
          icon={Building2}
          tone="info"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Attendu vs encaissé (6 derniers mois)</CardTitle>
            <Badge variant="secondary">
              <TrendingUp className="size-3" /> Suivi mensuel
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-3 sm:gap-4">
              {data.monthTrend.map((month) => (
                <div key={month.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <div
                      className="w-1/3 rounded-t bg-muted"
                      style={{ height: `${Math.max(4, (month.expected / maxTrend) * 100)}%` }}
                      title={`Attendu : ${formatFCFA(month.expected)}`}
                    />
                    <div
                      className="w-1/3 rounded-t bg-primary"
                      style={{ height: `${Math.max(4, (month.collected / maxTrend) * 100)}%` }}
                      title={`Encaissé : ${formatFCFA(month.collected)}`}
                    />
                  </div>
                  <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                    {month.label.split(' ')[0].slice(0, 4)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-muted" /> Attendu
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary" /> Encaissé
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>À surveiller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="size-4" /> Baux expirant sous 60 j
              </span>
              <span className="font-semibold">{data.expiringLeases.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4" /> Biens vacants
              </span>
              <span className="font-semibold">{data.vacantCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="size-4" /> Relances à envoyer
              </span>
              <span className="font-semibold">{data.remindersPending}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-muted-foreground">Propriétaires / locataires</span>
              <span className="font-semibold">
                {data.ownersCount} / {data.tenantsCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Impayés à relancer</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/loyers">
              Voir l&apos;échéancier <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.overdueSchedules.length === 0 ? (
            <EmptyState
              title="Aucun impayé"
              description="Tous les loyers dus ont été encaissés. Bravo !"
              icon={HandCoins}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.overdueSchedules.map((schedule) => {
                const balance =
                  schedule.rentDue + schedule.chargesDue + schedule.penaltyAmount - schedule.amountPaid;
                return (
                  <li key={schedule.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {schedule.lease.tenant.firstName} {schedule.lease.tenant.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {schedule.lease.property.district} · {schedule.periodLabel} · échéance{' '}
                        {formatDate(schedule.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RentStatusBadge status={schedule.status} />
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatFCFA(balance)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Derniers paiements</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <EmptyState title="Aucun paiement" description="Enregistrez votre premier encaissement." />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {payment.tenant?.firstName} {payment.tenant?.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {payment.lease.property.address}
                        {payment.lease.unit ? ` — ${payment.lease.unit.name}` : ''} ·{' '}
                        {formatDate(payment.paidAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatFCFA(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrats arrivant à échéance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiringLeases.length === 0 ? (
              <EmptyState title="Aucun contrat à renouveler" description="Rien à signaler sous 60 jours." />
            ) : (
              <ul className="divide-y divide-border">
                {data.expiringLeases.map((lease) => (
                  <li key={lease.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {lease.tenant.firstName} {lease.tenant.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lease.property.district} · fin le {formatDate(lease.endDate)}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/contrats/${lease.id}`}>Ouvrir</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
