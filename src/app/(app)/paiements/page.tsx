import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { PaymentsTable } from '@/components/tables/payments-table';
import { PaymentFormDialog } from '@/components/forms/payment-form';
import { getTenantContext } from '@/server/session';
import { listPayments } from '@/server/services/payments.service';
import { prisma } from '@/server/db';
import { formatFCFA } from '@/lib/format';
import { can } from '@/lib/permissions';
import { startOfMonth } from 'date-fns';

export const metadata: Metadata = { title: 'Paiements' };
export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const { user, organizationId } = await getTenantContext();

  const [payments, leaseRows] = await Promise.all([
    listPayments(organizationId),
    prisma.lease.findMany({
      where: { organizationId, status: 'ACTIF' },
      include: {
        tenant: { select: { firstName: true, lastName: true } },
        property: { select: { address: true, district: true } },
        unit: { select: { name: true } },
      },
      orderBy: { reference: 'asc' },
    }),
  ]);

  const monthStart = startOfMonth(new Date());
  const monthTotal = payments
    .filter((payment) => payment.status === 'VALIDE' && new Date(payment.paidAt) >= monthStart)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const total = payments
    .filter((payment) => payment.status === 'VALIDE')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Paiements"
        description="Encaissements manuels, justificatifs et quittances. Aucun paiement n'est supprimé : il est annulé avec motif."
        actions={
          can(user.role, 'payments:write') ? (
            <PaymentFormDialog
              leases={leaseRows.map((lease) => ({
                id: lease.id,
                reference: lease.reference,
                tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
                propertyLabel: `${lease.property.address}${lease.unit ? ` — ${lease.unit.name}` : ''}`,
                rentAmount: lease.rentAmount,
                chargesAmount: lease.chargesAmount,
              }))}
            />
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Encaissé ce mois" value={formatFCFA(monthTotal)} tone="success" />
        <StatCard label="Total encaissé (historique)" value={formatFCFA(total)} />
        <StatCard
          label="Paiements annulés"
          value={String(payments.filter((payment) => payment.status === 'ANNULE').length)}
          tone="danger"
          hint="Tracés au journal d'activité"
        />
      </div>

      <PaymentsTable
        canCancel={can(user.role, 'payments:cancel')}
        payments={payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference,
          paidAt: payment.paidAt,
          status: payment.status,
          cancelReason: payment.cancelReason,
          tenantName: `${payment.tenant?.firstName ?? ''} ${payment.tenant?.lastName ?? ''}`.trim() || '—',
          propertyLabel: `${payment.lease.property.address}${payment.lease.unit ? ` — ${payment.lease.unit.name}` : ''}`,
          periodLabel: payment.rentSchedule?.periodLabel ?? null,
          receiptId: payment.receipt?.id ?? null,
          receiptNumber: payment.receipt?.number ?? null,
          recordedBy: payment.recordedBy
            ? `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}`
            : null,
        }))}
      />
    </div>
  );
}
