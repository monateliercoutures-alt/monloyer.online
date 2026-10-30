import { NextResponse } from 'next/server';
import { unitSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { deleteUnit, updateUnit } from '@/server/services/properties.service';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('properties:write');
    const { id } = await params;
    const input = unitSchema.parse(await request.json());
    const { propertyId: _propertyId, ...rest } = input;
    return NextResponse.json({ data: await updateUnit(user.organizationId, id, rest) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('properties:write');
    const { id } = await params;
    await deleteUnit(user.organizationId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
