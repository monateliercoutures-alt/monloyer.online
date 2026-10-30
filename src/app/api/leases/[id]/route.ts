import { NextResponse } from 'next/server';
import { leaseSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { getLease, updateLease } from '@/server/services/leases.service';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('leases:read');
    const { id } = await params;
    return NextResponse.json({ data: await getLease(user.organizationId, id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('leases:write');
    const { id } = await params;
    const input = leaseSchema.parse(await request.json());
    return NextResponse.json({ data: await updateLease(user.organizationId, id, input) });
  } catch (error) {
    return handleApiError(error);
  }
}
