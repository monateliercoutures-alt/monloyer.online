'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/data-table';
import { LeaseStatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatFCFA } from '@/lib/format';
import { balanceOf } from '@/lib/rent';

export type LeaseRow = {
  id: string;
  reference: string;
  status: 'BROUILLON' | 'ACTIF' | 'RESILIE' | 'EXPIRE';
  startDate: Date | string;
  endDate: Date | string;
  rentAmount: number;
  chargesAmount: number;
  property: { id: string; reference: string; address: string; district: string };
  unit: { id: string; name: string } | null;
  tenant: { id: string; firstName: string; lastName: string; phone: string };
  owner: { firstName: string; lastName: string };
  rentSchedules: { status: string; amountPaid: number; rentDue: number; chargesDue: number }[];
};

export function LeasesTable({ leases }: { leases: LeaseRow[] }) {
  const router = useRouter();

  const columns: Column<LeaseRow>[] = [
    {
      key: 'reference',
      header: 'Contrat',
      sortValue: (lease) => lease.reference,
      cell: (lease) => (
        <div>
          <p className="font-medium">{lease.reference}</p>
          <p className="text-xs text-muted-foreground">
            {lease.property.reference}
            {lease.unit ? ` · ${lease.unit.name}` : ''} · {lease.property.district}
          </p>
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Locataire',
      sortValue: (lease) => `${lease.tenant.lastName} ${lease.tenant.firstName}`,
      cell: (lease) => (
        <div>
          <p className="text-sm font-medium">
            {lease.tenant.firstName} {lease.tenant.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{lease.tenant.phone}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      hideOnMobile: true,
      sortValue: (lease) => new Date(lease.startDate).getTime(),
      cell: (lease) => (
        <span className="text-xs">
          {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
        </span>
      ),
    },
    {
      key: 'rent',
      header: 'Loyer',
      sortValue: (lease) => lease.rentAmount,
      cell: (lease) => (
        <div className="text-sm">
          <p className="font-medium">{formatFCFA(lease.rentAmount)}</p>
          {lease.chargesAmount > 0 ? (
            <p className="text-xs text-muted-foreground">+ {formatFCFA(lease.chargesAmount)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'unpaid',
      header: 'Solde dû',
      hideOnMobile: true,
      sortValue: (lease) => lease.rentSchedules.reduce((sum, schedule) => sum + balanceOf({ ...schedule, penaltyAmount: 0 }), 0),
      cell: (lease) => {
        const balance = lease.rentSchedules.reduce(
          (sum, schedule) => sum + balanceOf({ ...schedule, penaltyAmount: 0 }),
          0,
        );
        return (
          <span className={balance > 0 ? 'text-sm font-medium text-red-600 dark:text-red-400' : 'text-sm'}>
            {formatFCFA(balance)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (lease) => <LeaseStatusBadge status={lease.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (lease) => (
        <Link href={`/contrats/${lease.id}`} className="text-sm font-medium text-primary hover:underline">
          Ouvrir
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      rows={leases}
      columns={columns}
      rowKey={(lease) => lease.id}
      searchValue={(lease) =>
        `${lease.reference} ${lease.tenant.firstName} ${lease.tenant.lastName} ${lease.property.address} ${lease.property.district}`
      }
      searchPlaceholder="Rechercher un contrat (référence, locataire, quartier…)"
      filters={[
        {
          key: 'status',
          label: 'Statut',
          options: [
            { value: 'ACTIF', label: 'Actif' },
            { value: 'RESILIE', label: 'Résilié' },
            { value: 'EXPIRE', label: 'Expiré' },
            { value: 'BROUILLON', label: 'Brouillon' },
          ],
          value: (lease) => lease.status,
        },
      ]}
      onRowClick={(lease) => router.push(`/contrats/${lease.id}`)}
      emptyTitle="Aucun contrat"
      emptyDescription="Créez un bail : l'échéancier et les échéances seront générés automatiquement."
    />
  );
}
