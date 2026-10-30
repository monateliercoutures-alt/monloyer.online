import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, FileText, Mail, MapPin, Phone, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { PropertyStatusBadge, LeaseStatusBadge } from '@/components/ui/status-badge';
import { OwnerFormDialog } from '@/components/forms/owner-form';
import { getTenantContext } from '@/server/session';
import { getOwner } from '@/server/services/owners.service';
import { ApiError } from '@/server/http';
import { formatDate, formatFCFA, formatMonthYear } from '@/lib/format';
import { COMMISSION_TYPE_LABELS, EXPENSE_CATEGORY_LABELS, MANDATE_TYPE_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/constants';
import { balanceOf } from '@/lib/rent';

export const metadata: Metadata = { title: 'Fiche propriétaire' };
export const dynamic = 'force-dynamic';

export default async function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await getTenantContext();
  const { id } = await params;

  const owner = await getOwner(organizationId, id).catch((error) => {
    if (error instanceof ApiError) return null;
    throw error;
  });
  if (!owner) notFound();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalRent = owner.properties.reduce((sum, property) => sum + property.rentAmount, 0);
  const openBalances = owner.leases.reduce(
    (sum, lease) =>
      sum +
      lease.rentSchedules.reduce((inner, schedule) => inner + balanceOf(schedule), 0),
    0,
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/proprietaires">
          <ArrowLeft className="size-4" /> Propriétaires
        </Link>
      </Button>

      <PageHeader
        title={`${owner.firstName} ${owner.lastName}`}
        description={`${MANDATE_TYPE_LABELS[owner.mandateType]} · commission ${
          owner.commissionValue != null
            ? owner.commissionType === 'POURCENTAGE'
              ? `${owner.commissionValue} %`
              : formatFCFA(owner.commissionValue)
            : 'barème agence'
        }`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/releves?ownerId=${owner.id}&month=${currentMonth}`}>
                <FileText className="size-4" /> Relevé de gérance
              </Link>
            </Button>
            <OwnerFormDialog
              owner={{
                ...owner,
                commissionValue: owner.commissionValue ?? null,
                mandateStart: owner.mandateStart,
                mandateEnd: owner.mandateEnd,
              }}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Phone className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Téléphone</p>
              <p className="text-sm font-medium">{owner.phone}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="truncate text-sm font-medium">{owner.email ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Wallet className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Loyers potentiels</p>
              <p className="text-sm font-medium">{formatFCFA(totalRent)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Impayés en cours</p>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{formatFCFA(openBalances)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mandat de gestion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type de mandat</span>
              <span className="font-medium">{MANDATE_TYPE_LABELS[owner.mandateType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type de commission</span>
              <span className="font-medium">{COMMISSION_TYPE_LABELS[owner.commissionType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Début du mandat</span>
              <span className="font-medium">{formatDate(owner.mandateStart)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fin du mandat</span>
              <span className="font-medium">{formatDate(owner.mandateEnd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reversement</span>
              <span className="text-right font-medium">
                {owner.paymentMethod ?? '—'}
                {owner.paymentDetails ? ` · ${owner.paymentDetails}` : ''}
              </span>
            </div>
            {owner.notes ? <p className="rounded-lg bg-muted/60 p-2 text-xs">{owner.notes}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Biens en gestion ({owner.properties.length})</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/biens">Gérer</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {owner.properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun bien rattaché pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-border">
                {owner.properties.map((property) => (
                  <li key={property.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/biens/${property.id}`} className="truncate text-sm font-medium hover:underline">
                        {property.reference} · {property.name ?? PROPERTY_TYPE_LABELS[property.type]}
                      </Link>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {property.district}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PropertyStatusBadge status={property.status} />
                      <span className="text-sm font-medium">{formatFCFA(property.rentAmount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contrats ({owner.leases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {owner.leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contrat pour ce propriétaire.</p>
          ) : (
            <ul className="divide-y divide-border">
              {owner.leases.map((lease) => (
                <li key={lease.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <Link href={`/contrats/${lease.id}`} className="text-sm font-medium hover:underline">
                      {lease.reference} · {lease.tenant.firstName} {lease.tenant.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {lease.property.address} · {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formatFCFA(lease.rentAmount)}</Badge>
                    <LeaseStatusBadge status={lease.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dernières dépenses imputées</CardTitle>
        </CardHeader>
        <CardContent>
          {owner.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dépense enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border">
              {owner.expenses.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{expense.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {EXPENSE_CATEGORY_LABELS[expense.category]} · {formatDate(expense.date)}
                    </p>
                  </div>
                  <span className="font-medium">{formatFCFA(expense.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Relevé disponible pour {formatMonthYear(new Date())} ·{' '}
        <Link href={`/releves?ownerId=${owner.id}&month=${currentMonth}`} className="text-primary hover:underline">
          ouvrir le relevé de gérance
        </Link>
      </p>
    </div>
  );
}
