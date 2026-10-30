'use client';

import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { CancelPaymentDialog } from '@/components/forms/action-dialogs';
import { formatDate, formatFCFA } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';

export type PaymentRow = {
  id: string;
  amount: number;
  method: keyof typeof PAYMENT_METHOD_LABELS;
  reference: string | null;
  paidAt: Date | string;
  status: 'VALIDE' | 'ANNULE';
  cancelReason: string | null;
  tenantName: string;
  propertyLabel: string;
  periodLabel: string | null;
  receiptId: string | null;
  receiptNumber: string | null;
  recordedBy: string | null;
};

export function PaymentsTable({ payments, canCancel }: { payments: PaymentRow[]; canCancel: boolean }) {
  const columns: Column<PaymentRow>[] = [
    {
      key: 'tenant',
      header: 'Locataire',
      sortValue: (payment) => payment.tenantName,
      cell: (payment) => (
        <div>
          <p className="font-medium">{payment.tenantName}</p>
          <p className="truncate text-xs text-muted-foreground">{payment.propertyLabel}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (payment) => new Date(payment.paidAt).getTime(),
      cell: (payment) => <span className="text-sm">{formatDate(payment.paidAt)}</span>,
    },
    {
      key: 'period',
      header: 'Période',
      hideOnMobile: true,
      cell: (payment) => <span className="text-xs">{payment.periodLabel ?? '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      sortValue: (payment) => payment.amount,
      cell: (payment) => (
        <div className="text-sm">
          <p className="font-semibold">{formatFCFA(payment.amount)}</p>
          <p className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[payment.method]}</p>
        </div>
      ),
    },
    {
      key: 'reference',
      header: 'Référence',
      hideOnMobile: true,
      cell: (payment) => <span className="text-xs text-muted-foreground">{payment.reference ?? '—'}</span>,
    },
    {
      key: 'receipt',
      header: 'Quittance',
      cell: (payment) =>
        payment.receiptId ? (
          <a
            href={`/api/pdf/quittance/${payment.receiptId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            {payment.receiptNumber}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (payment) =>
        payment.status === 'VALIDE' ? (
          <Badge variant="success">Validé</Badge>
        ) : (
          <Badge variant="danger">Annulé</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (payment) =>
        canCancel && payment.status === 'VALIDE' ? (
          <CancelPaymentDialog paymentId={payment.id} amountLabel={formatFCFA(payment.amount)} />
        ) : null,
    },
  ];

  return (
    <DataTable
      rows={payments}
      columns={columns}
      rowKey={(payment) => payment.id}
      pageSize={15}
      searchValue={(payment) => `${payment.tenantName} ${payment.propertyLabel} ${payment.reference ?? ''}`}
      searchPlaceholder="Rechercher un paiement (locataire, référence…)"
      filters={[
        {
          key: 'status',
          label: 'Statut',
          options: [
            { value: 'VALIDE', label: 'Validé' },
            { value: 'ANNULE', label: 'Annulé' },
          ],
          value: (payment) => payment.status,
        },
        {
          key: 'method',
          label: 'Mode',
          options: Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
          value: (payment) => payment.method,
        },
      ]}
      emptyTitle="Aucun paiement"
      emptyDescription="Enregistrez un encaissement pour générer la quittance automatiquement."
    />
  );
}
