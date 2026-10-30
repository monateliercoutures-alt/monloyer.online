import { NextResponse } from 'next/server';
import { propertySchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { deleteProperty, getProperty, updateProperty } from '@/server/services/properties.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('properties:read');
    const { id } = await params;
    return NextResponse.json({ data: await getProperty(user.organizationId, id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('properties:write');
    const { id } = await params;
    const input = propertySchema.parse(await request.json());
    const property = await updateProperty(user.organizationId, id, input);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'property.update',
      entityType: 'Property',
      entityId: id,
      description: `Bien ${property.reference} mis à jour`,
    });
    return NextResponse.json({ data: property });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('properties:write');
    const { id } = await params;
    await deleteProperty(user.organizationId, id);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'property.delete',
      entityType: 'Property',
      entityId: id,
      description: 'Bien supprimé',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
