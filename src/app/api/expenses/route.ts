import { NextResponse } from 'next/server';
import { expenseSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { createExpense, listExpenses } from '@/server/services/expenses.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('expenses:read');
    return NextResponse.json({ data: await listExpenses(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('expenses:write');
    const input = expenseSchema.parse(await request.json());
    const expense = await createExpense(user.organizationId, input, { createdById: user.id });
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'expense.create',
      entityType: 'Expense',
      entityId: expense.id,
      description: `Dépense enregistrée : ${expense.label}`,
    });
    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
