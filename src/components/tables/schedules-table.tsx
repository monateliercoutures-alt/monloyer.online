'use client';

import Link from 'next/link';
import { DataTable, type Column } from '@/components/ui/data-table';
import { RentStatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatFCFA } from '@/lib/format';
import { balanceOf } from '@/lib/rent';

export type ScheduleRow = {
  id: string;
  periodLabel: string;
  dueDate: Date | string;
  status: 'A_VENIR' | 'PARTIEL' | 'PAYE' | 'EN_RETARD';
  rentDue: number;
  chargesDue: number;
  penaltyAmount: number;
  amountPaid: number;
  leaseId: string;
  tenantName: string;
  propertyLabel: string;
  district: string;
  leaseReference: string;
};

export function SchedulesTable({ schedules }: { schedules: ScheduleRow[] }) {
  const columns: Column<ScheduleRow>[] = [
    {
      key: 'tenant',
      header: 'Locataire',
      sortValue: (schedule) => schedule.tenantName,
      cell: (schedule) => (
        <div>
          <p className="font-medium">{schedule.tenantName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {schedule.propertyLabel} · {schedule.district}
          </p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      sortValue: (schedule) => new Date(schedule.dueDate).getTime(),
      cell: (schedule) => (
        <div>
          <p className="text-sm">{schedule.periodLabel}</p>
          <p className="text-xs text-muted-foreground">{formatDate(schedule.dueDate)}</p>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Montant dû',
      hideOnMobile: true,
      sortValue: (schedule) => schedule.rentDue + schedule.chargesDue + schedule.penaltyAmount,
      cell: (schedule) => (
        <div className="text-sm">
          <p className="font-medium">{formatFCFA(schedule.rentDue + schedule.chargesDue)}</p>
          {schedule.penaltyAmount > 0 ? (
            <p className="text-xs text-red-600 dark:text-red-400">+ pénalité {formatFCFA(schedule.penaltyAmount)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'paid',
      header: 'Payé',
      hideOnMobile: true,
      sortValue: (schedule) => schedule.amountPaid,
      cell: (schedule) => <span className="text-sm">{formatFCFA(schedule.amountPaid)}</span>,
    },
    {
      key: 'balance',
      header: 'Solde',
      sortValue: (schedule) => balanceOf(schedule),
      cell: (schedule) => {
        const balance = balanceOf(schedule);
        return (
          <span className={balance > 0 ? 'text-sm font-semibold text-red-600 dark:text-red-400' : 'text-sm'}>
            {formatFCFA(balance)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (schedule) => <RentStatusBadge status={schedule.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (schedule) => (
        <Link href={`/contrats/${schedule.leaseId}`} className="text-xs font-medium text-primary hover:underline">
          Contrat
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      rows={schedules}
      columns={columns}
      rowKey={(schedule) => schedule.id}
      pageSize={15}
      searchValue={(schedule) =>
        `${schedule.tenantName} ${schedule.propertyLabel} ${schedule.district} ${schedule.periodLabel} ${schedule.leaseReference}`
      }
      searchPlaceholder="Rechercher une échéance (locataire, quartier, période…)"
      filters={[
        {
          key: 'status',
          label: 'Statut',
          options: [
            { value: 'EN_RETARD', label: 'En retard' },
            { value: 'PARTIEL', label: 'Partiel' },
            { value: 'A_VENIR', label: 'À venir' },
            { value: 'PAYE', label: 'Payé' },
          ],
          value: (schedule) => schedule.status,
        },
        {
          key: 'period',
          label: 'Période',
          options: [...new Set(schedules.map((schedule) => schedule.periodLabel))].map((label) => ({
            value: label,
            label,
          })),
          value: (schedule) => schedule.periodLabel,
        },
      ]}
      emptyTitle="Aucune échéance"
      emptyDescription="Créez un contrat de bail pour générer automatiquement l'échéancier."
    />
  );
}
