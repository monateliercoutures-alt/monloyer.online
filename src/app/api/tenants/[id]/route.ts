import { NextResponse } from 'next/server';
import { tenantSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { deleteTenant, getTenant, updateTenant } from '@/server/services/tenants.service';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('tenants:read');
    const { id } = await params;
    return NextResponse.json({ data: await getTenant(user.organizationId, id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('tenants:write');
    const { id } = await params;
    const input = tenantSchema.parse(await request.json());
    return NextResponse.json({ data: await updateTenant(user.organizationId, id, input) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('tenants:write');
    const { id } = await params;
    await deleteTenant(user.organizationId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
