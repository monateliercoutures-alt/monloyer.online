import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ExpensesTable } from '@/components/tables/expenses-table';
import { ExpenseFormDialog } from '@/components/forms/expense-form';
import { getTenantContext } from '@/server/session';
import { listExpenses } from '@/server/services/expenses.service';
import { listProperties } from '@/server/services/properties.service';
import { listOwners } from '@/server/services/owners.service';
import { formatFCFA } from '@/lib/format';
import { startOfMonth } from 'date-fns';

export const metadata: Metadata = { title: 'Dépenses' };
export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const { organizationId } = await getTenantContext();
  const [expenses, properties, owners] = await Promise.all([
    listExpenses(organizationId),
    listProperties(organizationId),
    listOwners(organizationId),
  ]);

  const monthStart = startOfMonth(new Date());
  const monthTotal = expenses
    .filter((expense) => new Date(expense.date) >= monthStart)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dépenses & charges"
        description="Travaux, réparations, eau, électricité, honoraires : déduits du net à reverser au propriétaire."
        actions={
          <ExpenseFormDialog
            properties={properties.map((property) => ({
              id: property.id,
              label: `${property.reference} — ${property.address}`,
              ownerId: property.owner.id,
            }))}
            owners={owners.map((owner) => ({
              id: owner.id,
              label: `${owner.firstName} ${owner.lastName}`,
            }))}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Dépenses du mois" value={formatFCFA(monthTotal)} tone="warning" />
        <StatCard label="Total historique" value={formatFCFA(total)} />
        <StatCard label="Nombre de lignes" value={String(expenses.length)} />
      </div>

      <ExpensesTable
        expenses={expenses.map((expense) => ({
          id: expense.id,
          category: expense.category,
          label: expense.label,
          amount: expense.amount,
          date: expense.date,
          supplier: expense.supplier,
          propertyLabel: expense.property ? `${expense.property.reference} — ${expense.property.address}` : null,
          ownerName: expense.owner ? `${expense.owner.firstName} ${expense.owner.lastName}` : null,
        }))}
      />
    </div>
  );
}
