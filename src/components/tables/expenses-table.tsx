'use client';

import { DataTable, type Column } from '@/components/ui/data-table';
import { formatDate, formatFCFA } from '@/lib/format';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants';

export type ExpenseRow = {
  id: string;
  category: keyof typeof EXPENSE_CATEGORY_LABELS;
  label: string;
  amount: number;
  date: Date | string;
  supplier: string | null;
  propertyLabel: string | null;
  ownerName: string | null;
};

export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const columns: Column<ExpenseRow>[] = [
    {
      key: 'label',
      header: 'Dépense',
      sortValue: (expense) => expense.label,
      cell: (expense) => (
        <div>
          <p className="font-medium">{expense.label}</p>
          <p className="text-xs text-muted-foreground">
            {EXPENSE_CATEGORY_LABELS[expense.category]}
            {expense.supplier ? ` · ${expense.supplier}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'property',
      header: 'Bien',
      hideOnMobile: true,
      cell: (expense) => <span className="text-xs">{expense.propertyLabel ?? '—'}</span>,
    },
    {
      key: 'owner',
      header: 'Propriétaire',
      hideOnMobile: true,
      cell: (expense) => <span className="text-sm">{expense.ownerName ?? '—'}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (expense) => new Date(expense.date).getTime(),
      cell: (expense) => <span className="text-sm">{formatDate(expense.date)}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      sortValue: (expense) => expense.amount,
      cell: (expense) => <span className="font-semibold">{formatFCFA(expense.amount)}</span>,
    },
  ];

  return (
    <DataTable
      rows={expenses}
      columns={columns}
      rowKey={(expense) => expense.id}
      pageSize={15}
      searchValue={(expense) => `${expense.label} ${expense.supplier ?? ''} ${expense.propertyLabel ?? ''}`}
      searchPlaceholder="Rechercher une dépense…"
      filters={[
        {
          key: 'category',
          label: 'Catégorie',
          options: Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          value: (expense) => expense.category,
        },
      ]}
      emptyTitle="Aucune dépense"
      emptyDescription="Enregistrez les travaux et charges pour les déduire des relevés de gérance."
    />
  );
}
