'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

export type TenantRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  profession: string | null;
  isActive: boolean;
  leases: { id: string; reference: string; property: { address: string; district: string } }[];
};

export function TenantsTable({ tenants }: { tenants: TenantRow[] }) {
  const router = useRouter();

  const columns: Column<TenantRow>[] = [
    {
      key: 'name',
      header: 'Locataire',
      sortValue: (tenant) => `${tenant.lastName} ${tenant.firstName}`,
      cell: (tenant) => (
        <div>
          <p className="font-medium">
            {tenant.firstName} {tenant.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{tenant.profession ?? tenant.email ?? tenant.phone}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Téléphone',
      hideOnMobile: true,
      cell: (tenant) => <span className="text-sm">{tenant.phone}</span>,
    },
    {
      key: 'property',
      header: 'Logement actuel',
      cell: (tenant) =>
        tenant.leases.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sans bail actif</span>
        ) : (
          <div className="text-sm">
            <p className="font-medium">{tenant.leases[0].property.district}</p>
            <p className="truncate text-xs text-muted-foreground">{tenant.leases[0].property.address}</p>
          </div>
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (tenant) => (
        <Badge variant={tenant.isActive ? 'success' : 'muted'}>{tenant.isActive ? 'Actif' : 'Archivé'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (tenant) => (
        <Link href={`/locataires/${tenant.id}`} className="text-sm font-medium text-primary hover:underline">
          Dossier
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      rows={tenants}
      columns={columns}
      rowKey={(tenant) => tenant.id}
      searchValue={(tenant) =>
        `${tenant.firstName} ${tenant.lastName} ${tenant.phone} ${tenant.email ?? ''} ${tenant.profession ?? ''}`
      }
      searchPlaceholder="Rechercher un locataire (nom, téléphone, profession…)"
      filters={[
        {
          key: 'status',
          label: 'Statut',
          options: [
            { value: 'actif', label: 'Actif' },
            { value: 'archive', label: 'Archivé' },
          ],
          value: (tenant) => (tenant.isActive ? 'actif' : 'archive'),
        },
        {
          key: 'lease',
          label: 'Bail',
          options: [
            { value: 'with', label: 'Avec bail actif' },
            { value: 'without', label: 'Sans bail' },
          ],
          value: (tenant) => (tenant.leases.length > 0 ? 'with' : 'without'),
        },
      ]}
      onRowClick={(tenant) => router.push(`/locataires/${tenant.id}`)}
      emptyTitle="Aucun locataire"
      emptyDescription="Enregistrez un locataire pour pouvoir créer un contrat de bail."
    />
  );
}
