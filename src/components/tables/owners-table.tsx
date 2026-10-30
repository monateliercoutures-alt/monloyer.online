'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatFCFA } from '@/lib/format';
import { COMMISSION_TYPE_LABELS } from '@/lib/constants';

export type OwnerRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  commissionType: 'POURCENTAGE' | 'MONTANT_FIXE';
  commissionValue: number | null;
  properties: { id: string; status: string; rentAmount: number }[];
};

export function OwnersTable({ owners }: { owners: OwnerRow[] }) {
  const router = useRouter();

  const columns: Column<OwnerRow>[] = [
    {
      key: 'name',
      header: 'Propriétaire',
      sortValue: (owner) => `${owner.lastName} ${owner.firstName}`,
      cell: (owner) => (
        <div>
          <p className="font-medium">
            {owner.firstName} {owner.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{owner.email ?? owner.phone}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Téléphone',
      hideOnMobile: true,
      cell: (owner) => <span className="text-sm">{owner.phone}</span>,
    },
    {
      key: 'properties',
      header: 'Biens',
      sortValue: (owner) => owner.properties.length,
      cell: (owner) => <span className="text-sm">{owner.properties.length}</span>,
    },
    {
      key: 'commission',
      header: 'Commission',
      hideOnMobile: true,
      cell: (owner) => (
        <span className="text-sm">
          {owner.commissionValue != null
            ? owner.commissionType === 'POURCENTAGE'
              ? `${owner.commissionValue} %`
              : formatFCFA(owner.commissionValue)
            : 'Barème agence'}
          <span className="ml-1 text-xs text-muted-foreground">
            · {COMMISSION_TYPE_LABELS[owner.commissionType].split(' ')[0].toLowerCase()}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (owner) => (
        <Badge variant={owner.isActive ? 'success' : 'muted'}>{owner.isActive ? 'Actif' : 'Archivé'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (owner) => (
        <Link href={`/proprietaires/${owner.id}`} className="text-sm font-medium text-primary hover:underline">
          Fiche
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      rows={owners}
      columns={columns}
      rowKey={(owner) => owner.id}
      searchValue={(owner) => `${owner.firstName} ${owner.lastName} ${owner.phone} ${owner.email ?? ''}`}
      searchPlaceholder="Rechercher un propriétaire (nom, téléphone…)"
      filters={[
        {
          key: 'status',
          label: 'Statut',
          options: [
            { value: 'actif', label: 'Actif' },
            { value: 'archive', label: 'Archivé' },
          ],
          value: (owner) => (owner.isActive ? 'actif' : 'archive'),
        },
      ]}
      onRowClick={(owner) => router.push(`/proprietaires/${owner.id}`)}
      emptyTitle="Aucun propriétaire"
      emptyDescription="Ajoutez votre premier propriétaire pour commencer à gérer ses biens."
    />
  );
}
