import { prisma } from '@/server/db';
import { ApiError } from '@/server/http';
import type { z } from 'zod';
import type { expenseSchema } from '@/lib/validations';

export type ExpenseInputZ = z.infer<typeof expenseSchema>;

export async function listExpenses(organizationId: string) {
  return prisma.expense.findMany({
    where: { organizationId },
    orderBy: { date: 'desc' },
    include: {
      property: { select: { id: true, reference: true, address: true, district: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
    take: 500,
  });
}

export async function createExpense(
  organizationId: string,
  input: ExpenseInputZ,
  options: { createdById?: string } = {},
) {
  if (input.propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, organizationId },
      select: { id: true, ownerId: true },
    });
    if (!property) throw new ApiError(400, 'Bien invalide.');
  }

  return prisma.expense.create({
    data: {
      organizationId,
      propertyId: input.propertyId || null,
      ownerId: input.ownerId || null,
      category: input.category,
      label: input.label,
      amount: input.amount,
      date: input.date,
      supplier: input.supplier || null,
      receiptUrl: input.receiptUrl || null,
      notes: input.notes || null,
      createdById: options.createdById ?? null,
    },
  });
}

export async function deleteExpense(organizationId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId },
    select: { id: true },
  });
  if (!expense) throw new ApiError(404, 'Dépense introuvable.');
  await prisma.expense.delete({ where: { id: expenseId } });
}
