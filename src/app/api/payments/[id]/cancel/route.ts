import { NextResponse } from 'next/server';
import { cancelPaymentSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { cancelPayment } from '@/server/services/payments.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('payments:cancel');
    const { id } = await params;
    const input = cancelPaymentSchema.parse(await request.json());
    const payment = await cancelPayment(user.organizationId, id, input.reason);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'payment.cancel',
      entityType: 'Payment',
      entityId: id,
      description: `Paiement annulé — motif : ${input.reason}`,
    });
    return NextResponse.json({ data: payment });
  } catch (error) {
    return handleApiError(error);
  }
}
