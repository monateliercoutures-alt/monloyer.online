'use client';

import * as React from 'react';
import { Download, Mail, MessageCircle } from 'lucide-react';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatFCFA } from '@/lib/format';
import { apiRequest } from '@/lib/api-client';
import { whatsappLink } from '@/lib/utils';

export type ReceiptRow = {
  id: string;
  number: string;
  periodLabel: string;
  amountPaid: number;
  balanceDue: number;
  issuedAt: Date | string;
  channel: string | null;
  sentAt: Date | string | null;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string | null;
  propertyLabel: string;
};

export function ReceiptsTable({ receipts, organizationName }: { receipts: ReceiptRow[]; organizationName: string }) {
  const [pending, setPending] = React.useState<string | null>(null);

  async function markSent(receipt: ReceiptRow, channel: 'WHATSAPP' | 'EMAIL') {
    setPending(receipt.id);
    try {
      await apiRequest(`/api/receipts/${receipt.id}/send`, {
        method: 'POST',
        body: JSON.stringify({ channel }),
      });
    } catch {
      // l'envoi reste possible même si la trace échoue
    } finally {
      setPending(null);
    }
  }

  function message(receipt: ReceiptRow) {
    return `Bonjour ${receipt.tenantName}, votre quittance ${receipt.number} (${receipt.periodLabel}) d'un montant de ${formatFCFA(receipt.amountPaid)} est disponible. Merci. — ${organizationName}`;
  }

  const columns: Column<ReceiptRow>[] = [
    {
      key: 'number',
      header: 'N° quittance',
      sortValue: (receipt) => receipt.number,
      cell: (receipt) => (
        <a
          href={`/api/pdf/quittance/${receipt.id}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {receipt.number}
        </a>
      ),
    },
    {
      key: 'tenant',
      header: 'Locataire',
      sortValue: (receipt) => receipt.tenantName,
      cell: (receipt) => (
        <div>
          <p className="text-sm font-medium">{receipt.tenantName}</p>
          <p className="truncate text-xs text-muted-foreground">{receipt.propertyLabel}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      hideOnMobile: true,
      cell: (receipt) => <span className="text-xs">{receipt.periodLabel}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      sortValue: (receipt) => receipt.amountPaid,
      cell: (receipt) => (
        <div className="text-sm">
          <p className="font-semibold">{formatFCFA(receipt.amountPaid)}</p>
          {receipt.balanceDue > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Reste {formatFCFA(receipt.balanceDue)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Émise le',
      hideOnMobile: true,
      sortValue: (receipt) => new Date(receipt.issuedAt).getTime(),
      cell: (receipt) => <span className="text-xs">{formatDate(receipt.issuedAt)}</span>,
    },
    {
      key: 'sent',
      header: 'Envoi',
      hideOnMobile: true,
      cell: (receipt) =>
        receipt.sentAt ? (
          <Badge variant="success">{receipt.channel === 'EMAIL' ? 'E-mail' : 'WhatsApp'}</Badge>
        ) : (
          <Badge variant="muted">Non envoyée</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (receipt) => (
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="Télécharger le PDF">
            <a href={`/api/pdf/quittance/${receipt.id}`} target="_blank" rel="noreferrer">
              <Download className="size-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Envoyer par WhatsApp"
            disabled={pending === receipt.id}
            onClick={() => {
              window.open(whatsappLink(receipt.tenantPhone, message(receipt)), '_blank');
              void markSent(receipt, 'WHATSAPP');
            }}
          >
            <MessageCircle className="size-4" />
          </Button>
          {receipt.tenantEmail ? (
            <Button
              variant="ghost"
              size="icon"
              title="Envoyer par e-mail"
              disabled={pending === receipt.id}
              onClick={() => {
                window.location.href = `mailto:${receipt.tenantEmail}?subject=${encodeURIComponent(
                  `Quittance ${receipt.number}`,
                )}&body=${encodeURIComponent(message(receipt))}`;
                void markSent(receipt, 'EMAIL');
              }}
            >
              <Mail className="size-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={receipts}
      columns={columns}
      rowKey={(receipt) => receipt.id}
      pageSize={15}
      searchValue={(receipt) => `${receipt.number} ${receipt.tenantName} ${receipt.propertyLabel} ${receipt.periodLabel}`}
      searchPlaceholder="Rechercher une quittance (numéro, locataire, période…)"
      filters={[
        {
          key: 'sent',
          label: 'Envoi',
          options: [
            { value: 'sent', label: 'Envoyée' },
            { value: 'pending', label: 'Non envoyée' },
          ],
          value: (receipt) => (receipt.sentAt ? 'sent' : 'pending'),
        },
      ]}
      emptyTitle="Aucune quittance"
      emptyDescription="Les quittances sont générées automatiquement à chaque paiement."
    />
  );
}
