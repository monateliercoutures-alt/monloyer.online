import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/server/http';
import { deleteExpense } from '@/server/services/expenses.service';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('expenses:write');
    const { id } = await params;
    await deleteExpense(user.organizationId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
