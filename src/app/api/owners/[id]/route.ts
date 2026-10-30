import { NextResponse } from 'next/server';
import { ownerSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { deleteOwner, getOwner, updateOwner } from '@/server/services/owners.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('owners:read');
    const { id } = await params;
    return NextResponse.json({ data: await getOwner(user.organizationId, id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('owners:write');
    const { id } = await params;
    const input = ownerSchema.parse(await request.json());
    const owner = await updateOwner(user.organizationId, id, input);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'owner.update',
      entityType: 'Owner',
      entityId: id,
      description: `Fiche propriétaire mise à jour (${owner.firstName} ${owner.lastName})`,
    });
    return NextResponse.json({ data: owner });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireApiUser('owners:write');
    const { id } = await params;
    await deleteOwner(user.organizationId, id);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'owner.delete',
      entityType: 'Owner',
      entityId: id,
      description: 'Propriétaire supprimé',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
