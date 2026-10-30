import { NextResponse } from 'next/server';
import { paymentSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { createPayment, listPayments } from '@/server/services/payments.service';
import { logActivity } from '@/server/activity';
import { formatFCFA } from '@/lib/format';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser('payments:read');
    const leaseId = new URL(request.url).searchParams.get('leaseId') ?? undefined;
    return NextResponse.json({ data: await listPayments(user.organizationId, { leaseId }) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('payments:write');
    const input = paymentSchema.parse(await request.json());
    const { payment, receipt } = await createPayment(user.organizationId, input, { recordedById: user.id });
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'payment.create',
      entityType: 'Payment',
      entityId: payment.id,
      description: `Paiement de ${formatFCFA(payment.amount)} enregistré${receipt ? ` — quittance ${receipt.number}` : ''}`,
    });
    return NextResponse.json({ data: { payment, receipt } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
