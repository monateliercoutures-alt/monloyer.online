'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PropertyStatusBadge } from '@/components/ui/status-badge';
import { formatFCFA } from '@/lib/format';
import { PROPERTY_TYPE_LABELS } from '@/lib/constants';

export type PropertyRow = {
  id: string;
  reference: string;
  name: string | null;
  type: keyof typeof PROPERTY_TYPE_LABELS;
  address: string;
  district: string;
  status: 'LIBRE' | 'OCCUPE' | 'EN_TRAVAUX';
  rentAmount: number;
  chargesAmount: number;
  owner: { firstName: string; lastName: string };
  units: { id: string; name: string; status: string }[];
  leases: { id: string; tenant: { firstName: string; lastName: string } }[];
};

export function PropertiesTable({ properties }: { properties: PropertyRow[] }) {
  const router = useRouter();

  const columns: Column<PropertyRow>[] = [
    {
      key: 'reference',
      header: 'Bien',
      sortValue: (property) => property.reference,
      cell: (property) => (
        <div>
          <p className="font-medium">
            {property.reference}
            {property.name ? ` · ${property.name}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {PROPERTY_TYPE_LABELS[property.type]} · {property.address}, {property.district}
          </p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Propriétaire',
      hideOnMobile: true,
      sortValue: (property) => `${property.owner.lastName} ${property.owner.firstName}`,
      cell: (property) => (
        <span className="text-sm">
          {property.owner.firstName} {property.owner.lastName}
        </span>
      ),
    },
    {
      key: 'units',
      header: 'Logements',
      hideOnMobile: true,
      cell: (property) =>
        property.units.length === 0 ? (
          <span className="text-xs text-muted-foreground">Bien entier</span>
        ) : (
          <span className="text-sm">
            {property.units.filter((unit) => unit.status === 'OCCUPE').length}/{property.units.length} occupés
          </span>
        ),
    },
    {
      key: 'tenant',
      header: 'Locataire',
      hideOnMobile: true,
      cell: (property) =>
        property.leases.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <span className="text-sm">
            {property.leases[0].tenant.firstName} {property.leases[0].tenant.lastName}
          </span>
        ),
    },
    {
      key: 'rent',
      header: 'Loyer',
      sortValue: (property) => property.rentAmount,
      cell: (property) => (
        <div className="text-sm">
          <p className="font-medium">{formatFCFA(property.rentAmount)}</p>
          {property.chargesAmount > 0 ? (
            <p className="text-xs text-muted-foreground">+ {formatFCFA(property.chargesAmount)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (property) => <PropertyStatusBadge status={property.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (property) => (
        <Link href={`/biens/${property.id}`} className="text-sm font-medium text-primary hover:underline">
          Ouvrir
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      rows={properties}
      columns={columns}
      rowKey={(property) => property.id}
      searchValue={(property) =>
        `${property.reference} ${property.name ?? ''} ${property.address} ${property.district} ${property.owner.firstName} ${property.owner.lastName}`
      }
      searchPlaceholder="Rechercher un bien (référence, quartier, propriétaire…)"
      filters={[
        {
          key: 'status',
          label: 'Statut',
          options: [
            { value: 'LIBRE', label: 'Libre' },
            { value: 'OCCUPE', label: 'Occupé' },
            { value: 'EN_TRAVAUX', label: 'En travaux' },
          ],
          value: (property) => property.status,
        },
        {
          key: 'type',
          label: 'Type',
          options: Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
          value: (property) => property.type,
        },
        {
          key: 'district',
          label: 'Quartier',
          options: [...new Set(properties.map((property) => property.district))]
            .sort()
            .map((district) => ({ value: district, label: district })),
          value: (property) => property.district,
        },
      ]}
      onRowClick={(property) => router.push(`/biens/${property.id}`)}
      emptyTitle="Aucun bien"
      emptyDescription="Créez un bien ou importez votre portefeuille depuis un fichier Excel/CSV."
    />
  );
}
