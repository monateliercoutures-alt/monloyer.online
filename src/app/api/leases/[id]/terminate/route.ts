import { NextResponse } from 'next/server';
import { terminateLeaseSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { terminateLease } from '@/server/services/leases.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('leases:write');
    const { id } = await params;
    const input = terminateLeaseSchema.parse(await request.json());
    const lease = await terminateLease(user.organizationId, id, input);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'lease.terminate',
      entityType: 'Lease',
      entityId: lease.id,
      description: `Contrat ${lease.reference} résilié (${input.reason})`,
      metadata: { terminationDate: input.terminationDate.toISOString() },
    });
    return NextResponse.json({ data: lease });
  } catch (error) {
    return handleApiError(error);
  }
}
