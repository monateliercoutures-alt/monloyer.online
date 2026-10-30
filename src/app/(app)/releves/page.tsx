import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { getTenantContext } from '@/server/session';
import { listOwners } from '@/server/services/owners.service';
import { buildOwnerStatement } from '@/server/services/reports.service';
import { formatDate, formatFCFA } from '@/lib/format';
import { ApiError } from '@/server/http';

export const metadata: Metadata = { title: 'Relevés de gérance' };
export const dynamic = 'force-dynamic';

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ ownerId?: string; month?: string }>;
}) {
  const { organizationId } = await getTenantContext();
  const params = await searchParams;
  const owners = await listOwners(organizationId);

  const selectedOwnerId = params.ownerId ?? owners[0]?.id ?? '';
  const monthValue = params.month ?? new Date().toISOString().slice(0, 7);
  const monthDate = new Date(`${monthValue}-01T00:00:00`);

  const statement = selectedOwnerId
    ? await buildOwnerStatement(organizationId, selectedOwnerId, monthDate).catch((error) => {
        if (error instanceof ApiError) return null;
        throw error;
      })
    : null;

  const months = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Relevés de gérance"
        description="Loyers encaissés, commission, charges et net à reverser — exportable en PDF pour chaque propriétaire."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <form className="contents" method="get">
            <Field label="Propriétaire" htmlFor="ownerId">
              <Select id="ownerId" name="ownerId" defaultValue={selectedOwnerId}>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.firstName} {owner.lastName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mois" htmlFor="month">
              <Select id="month" name="month" defaultValue={monthValue}>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="outline" className="w-full">
                Afficher
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!statement ? (
        <EmptyState title="Aucun relevé" description="Sélectionnez un propriétaire disposant de biens en gestion." />
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {statement.owner.firstName} {statement.owner.lastName} — {statement.monthLabel}
              </CardTitle>
              <Button asChild size="sm">
                <a
                  href={`/api/pdf/releve?ownerId=${statement.owner.id}&month=${monthValue}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="size-4" /> Export PDF
                </a>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-xs text-muted-foreground">Loyers encaissés</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {formatFCFA(statement.collected)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-lg font-bold">{formatFCFA(statement.commission)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Charges / dépenses</p>
                  <p className="text-lg font-bold">{formatFCFA(statement.expensesTotal)}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-xs text-muted-foreground">Net à reverser</p>
                  <p className="text-lg font-bold text-primary">{formatFCFA(statement.netToRemit)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Détail des encaissements</p>
                {statement.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun encaissement sur la période.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {statement.payments.map((payment) => (
                      <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <span className="min-w-0">
                          <Link href={`/contrats/${payment.leaseId}`} className="font-medium hover:underline">
                            {payment.tenant?.firstName} {payment.tenant?.lastName}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {payment.lease.property.address} · {payment.rentSchedule?.periodLabel ?? '—'}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{formatDate(payment.paidAt)}</span>
                          <span className="font-semibold">{formatFCFA(payment.amount)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Charges déduites</p>
                {statement.expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune dépense sur la période.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {statement.expenses.map((expense) => (
                      <li key={expense.id} className="flex items-center justify-between py-2 text-sm">
                        <span>{expense.label}</span>
                        <span className="font-semibold">{formatFCFA(expense.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Reversement : {statement.owner.paymentMethod ?? 'non défini'}
                {statement.owner.paymentDetails ? ` — ${statement.owner.paymentDetails}` : ''}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
