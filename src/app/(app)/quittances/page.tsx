import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ReceiptsTable } from '@/components/tables/receipts-table';
import { getTenantContext } from '@/server/session';
import { listReceipts } from '@/server/services/payments.service';
import { formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Quittances' };
export const dynamic = 'force-dynamic';

export default async function ReceiptsPage() {
  const { organizationId, user } = await getTenantContext();
  const receipts = await listReceipts(organizationId);

  const total = receipts.reduce((sum, receipt) => sum + receipt.amountPaid, 0);
  const partials = receipts.filter((receipt) => receipt.balanceDue > 0).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quittances"
        description={`Numérotation séquentielle ${user.organization?.receiptPrefix ?? 'QUI'}-${new Date().getFullYear()}-0001 · téléchargement PDF et envoi WhatsApp/e-mail`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Quittances émises" value={String(receipts.length)} />
        <StatCard label="Montant quittancé" value={formatFCFA(total)} tone="success" />
        <StatCard
          label="Quittances partielles"
          value={String(partials)}
          tone="warning"
          hint="Mentionnent le solde restant dû"
        />
      </div>

      <ReceiptsTable
        organizationName={user.organization?.name ?? ''}
        receipts={receipts.map((receipt) => ({
          id: receipt.id,
          number: receipt.number,
          periodLabel: receipt.periodLabel,
          amountPaid: receipt.amountPaid,
          balanceDue: receipt.balanceDue,
          issuedAt: receipt.issuedAt,
          channel: receipt.channel,
          sentAt: receipt.sentAt,
          tenantName: `${receipt.tenant.firstName} ${receipt.tenant.lastName}`,
          tenantPhone: receipt.tenant.phone,
          tenantEmail: receipt.tenant.email,
          propertyLabel: `${receipt.lease.property.address}${receipt.lease.unit ? ` — ${receipt.lease.unit.name}` : ''}`,
        }))}
      />
    </div>
  );
}
