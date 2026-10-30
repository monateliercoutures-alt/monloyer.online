import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, IdCard, Phone, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { LeaseStatusBadge, RentStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TenantFormDialog } from '@/components/forms/tenant-form';
import { getTenantContext } from '@/server/session';
import { getTenant } from '@/server/services/tenants.service';
import { ApiError } from '@/server/http';
import { formatDate, formatFCFA } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { balanceOf } from '@/lib/rent';

export const metadata: Metadata = { title: 'Dossier locataire' };
export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await getTenantContext();
  const { id } = await params;

  const tenant = await getTenant(organizationId, id).catch((error) => {
    if (error instanceof ApiError) return null;
    throw error;
  });
  if (!tenant) notFound();

  const activeLease = tenant.leases.find((lease) => lease.status === 'ACTIF') ?? null;
  const totalPaid = tenant.payments
    .filter((payment) => payment.status === 'VALIDE')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const balance = activeLease
    ? activeLease.rentSchedules.reduce((sum, schedule) => sum + balanceOf(schedule), 0)
    : 0;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/locataires">
          <ArrowLeft className="size-4" /> Locataires
        </Link>
      </Button>

      <PageHeader
        title={`${tenant.firstName} ${tenant.lastName}`}
        description={`${tenant.profession ?? 'Profession non renseignée'} · ${tenant.phone}`}
        actions={
          <>
            {activeLease ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/contrats/${activeLease.id}`}>Voir le contrat</Link>
              </Button>
            ) : null}
            <TenantFormDialog tenant={tenant} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="size-4" /> Identité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" /> {tenant.phone}
            </p>
            <p className="text-muted-foreground">{tenant.email ?? 'Pas d’e-mail'}</p>
            <p className="text-muted-foreground">
              {tenant.idType ?? 'Pièce'} : {tenant.idNumber ?? '—'}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <BriefcaseBusiness className="size-4" /> {tenant.employer ?? 'Employeur non renseigné'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Garant & urgence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Garant</p>
              <p className="font-medium">{tenant.guarantorName ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{tenant.guarantorPhone ?? ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contact d&apos;urgence</p>
              <p className="font-medium">{tenant.emergencyContactName ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{tenant.emergencyContactPhone ?? ''}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Situation locative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total encaissé</span>
              <span className="font-medium">{formatFCFA(totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Solde dû</span>
              <span className="font-medium text-red-600 dark:text-red-400">{formatFCFA(balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contrats</span>
              <span className="font-medium">{tenant.leases.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quittances</span>
              <span className="font-medium">{tenant.receipts.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeLease ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Bail en cours — {activeLease.reference}</CardTitle>
            <LeaseStatusBadge status={activeLease.status} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Logement</p>
                <p className="text-sm font-medium">
                  {activeLease.property.address}
                  {activeLease.unit ? ` — ${activeLease.unit.name}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loyer</p>
                <p className="text-sm font-medium">{formatFCFA(activeLease.rentAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Période</p>
                <p className="text-sm font-medium">
                  {formatDate(activeLease.startDate)} → {formatDate(activeLease.endDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Caution</p>
                <p className="text-sm font-medium">{formatFCFA(activeLease.depositAmount)}</p>
              </div>
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
              {activeLease.rentSchedules.slice(0, 12).map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{schedule.periodLabel}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(schedule.dueDate)}</span>
                  <RentStatusBadge status={schedule.status} />
                  <span className="font-medium">{formatFCFA(schedule.amountPaid)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.payments.length === 0 ? (
            <EmptyState title="Aucun paiement" description="Les encaissements apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-border">
              {tenant.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{formatFCFA(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.paidAt)} · {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.receipt ? ` · ${payment.receipt.number}` : ''}
                    </p>
                  </div>
                  {payment.status === 'ANNULE' ? (
                    <span className="text-xs font-medium text-destructive">Annulé</span>
                  ) : payment.receipt ? (
                    <a
                      href={`/api/pdf/quittance/${payment.receipt.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Quittance PDF
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
