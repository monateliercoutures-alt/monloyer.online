import { NextResponse } from 'next/server';
import { leaseSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { createLease, listLeases } from '@/server/services/leases.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('leases:read');
    return NextResponse.json({ data: await listLeases(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('leases:write');
    const input = leaseSchema.parse(await request.json());
    const lease = await createLease(user.organizationId, input, { actorId: user.id });
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'lease.create',
      entityType: 'Lease',
      entityId: lease.id,
      description: `Contrat ${lease.reference} créé`,
    });
    return NextResponse.json({ data: lease }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
