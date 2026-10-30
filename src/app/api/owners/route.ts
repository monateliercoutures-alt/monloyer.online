import { NextResponse } from 'next/server';
import { ownerSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { createOwner, listOwners } from '@/server/services/owners.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('owners:read');
    return NextResponse.json({ data: await listOwners(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('owners:write');
    const input = ownerSchema.parse(await request.json());
    const owner = await createOwner(user.organizationId, input);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'owner.create',
      entityType: 'Owner',
      entityId: owner.id,
      description: `Propriétaire ${owner.firstName} ${owner.lastName} créé`,
    });
    return NextResponse.json({ data: owner }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
