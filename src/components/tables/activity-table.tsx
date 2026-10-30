'use client';

import { DataTable, type Column } from '@/components/ui/data-table';
import { formatDateTime } from '@/lib/format';

export type LogRow = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  description: string | null;
  createdAt: Date;
};

/** Journal d'activité : rendu client du tableau générique (filtres + recherche). */
export function ActivityTable({ logs }: { logs: LogRow[] }) {
  const columns: Column<LogRow>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortValue: (log) => new Date(log.createdAt).getTime(),
      cell: (log) => <span className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</span>,
    },
    {
      key: 'actor',
      header: 'Auteur',
      sortValue: (log) => log.actorName,
      cell: (log) => <span className="text-sm font-medium">{log.actorName}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      cell: (log) => <span className="font-mono text-xs">{log.action}</span>,
    },
    {
      key: 'description',
      header: 'Détail',
      hideOnMobile: true,
      cell: (log) => <span className="text-sm">{log.description ?? log.entityType}</span>,
    },
  ];

  return (
    <DataTable
      rows={logs}
      columns={columns}
      rowKey={(log) => log.id}
      pageSize={20}
      searchValue={(log) => `${log.actorName} ${log.action} ${log.description ?? ''}`}
      searchPlaceholder="Rechercher dans le journal…"
      filters={[
        {
          key: 'entity',
          label: 'Entité',
          options: [...new Set(logs.map((log) => log.entityType))].map((type) => ({ value: type, label: type })),
          value: (log) => log.entityType,
        },
      ]}
      emptyTitle="Aucun résultat"
    />
  );
}
