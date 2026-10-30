import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileText, MessageCircle, ReceiptText, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { LeaseStatusBadge, RentStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TerminateLeaseDialog } from '@/components/forms/action-dialogs';
import { getTenantContext } from '@/server/session';
import { getLease } from '@/server/services/leases.service';
import { ApiError } from '@/server/http';
import { formatDate, formatFCFA, safeFileName } from '@/lib/format';
import { PERIODICITY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/constants';
import { balanceOf } from '@/lib/rent';
import { whatsappLink } from '@/lib/utils';

export const metadata: Metadata = { title: 'Contrat de bail' };
export const dynamic = 'force-dynamic';

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await getTenantContext();
  const { id } = await params;

  const lease = await getLease(organizationId, id).catch((error) => {
    if (error instanceof ApiError) return null;
    throw error;
  });
  if (!lease) notFound();

  const balance = lease.rentSchedules.reduce((sum, schedule) => sum + balanceOf(schedule), 0);
  const paid = lease.payments.filter((payment) => payment.status === 'VALIDE').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/contrats">
          <ArrowLeft className="size-4" /> Contrats
        </Link>
      </Button>

      <PageHeader
        title={`Contrat ${lease.reference}`}
        description={`${lease.property.address}, ${lease.property.district}${lease.unit ? ` — ${lease.unit.name}` : ''}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/pdf/contrat/${lease.id}`} target="_blank" rel="noreferrer">
                <Download className="size-4" /> Contrat PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={whatsappLink(
                  lease.tenant.phone,
                  `Bonjour ${lease.tenant.firstName}, voici votre contrat de bail ${lease.reference} pour le logement situé ${lease.property.address}, ${lease.property.district}. Loyer : ${formatFCFA(lease.rentAmount)} par mois.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
            {lease.status === 'ACTIF' ? (
              <TerminateLeaseDialog leaseId={lease.id} leaseReference={lease.reference} />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Conditions du bail</CardTitle>
            <LeaseStatusBadge status={lease.status} />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Loyer</p>
              <p className="font-semibold">{formatFCFA(lease.rentAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Charges</p>
              <p className="font-semibold">{formatFCFA(lease.chargesAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Caution</p>
              <p className="font-semibold">{formatFCFA(lease.depositAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Période</p>
              <p className="text-sm font-medium">
                {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Périodicité</p>
              <p className="text-sm font-medium">{PERIODICITY_LABELS[lease.periodicity]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Préavis</p>
              <p className="text-sm font-medium">{lease.noticePeriodDays} jours</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total encaissé</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatFCFA(paid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solde dû</p>
              <p className="font-semibold text-red-600 dark:text-red-400">{formatFCFA(balance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type de bien</p>
              <p className="text-sm font-medium">{PROPERTY_TYPE_LABELS[lease.property.type]}</p>
            </div>
            {lease.terminationDate ? (
              <div className="sm:col-span-3 rounded-lg bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">Résilié le {formatDate(lease.terminationDate)}</p>
                <p className="text-xs text-muted-foreground">{lease.terminationReason}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4" /> Locataire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link href={`/locataires/${lease.tenant.id}`} className="font-medium text-primary hover:underline">
                {lease.tenant.firstName} {lease.tenant.lastName}
              </Link>
              <p className="text-muted-foreground">{lease.tenant.phone}</p>
              <p className="text-muted-foreground">{lease.tenant.email ?? 'Pas d’e-mail'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" /> Propriétaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link href={`/proprietaires/${lease.owner.id}`} className="font-medium text-primary hover:underline">
                {lease.owner.firstName} {lease.owner.lastName}
              </Link>
              <p className="text-muted-foreground">{lease.owner.phone}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Échéancier ({lease.rentSchedules.length} échéances)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {lease.rentSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{schedule.periodLabel}</p>
                  <p className="text-xs text-muted-foreground">Échéance : {formatDate(schedule.dueDate)}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Dû {formatFCFA(schedule.rentDue + schedule.chargesDue + schedule.penaltyAmount)}
                  </span>
                  <span className="font-medium">Payé {formatFCFA(schedule.amountPaid)}</span>
                  <RentStatusBadge status={schedule.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-4" /> Paiements & quittances
          </CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/paiements">Encaisser</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {lease.payments.length === 0 ? (
            <EmptyState title="Aucun paiement" description="Les encaissements de ce contrat apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-border">
              {lease.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{formatFCFA(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(payment.paidAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.status === 'ANNULE' ? (
                      <Badge variant="danger">Annulé</Badge>
                    ) : payment.receipt ? (
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/api/pdf/quittance/${payment.receipt.id}`} target="_blank" rel="noreferrer">
                          {payment.receipt.number}
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="muted">Sans quittance</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Fichier PDF : {safeFileName(`contrat-${lease.reference}`)}.pdf
      </p>
    </div>
  );
}
