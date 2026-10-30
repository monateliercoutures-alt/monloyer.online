import { z } from 'zod';
import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/server/http';
import { updateMember } from '@/server/services/settings.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

const schema = z.object({
  role: z.enum(['ADMIN_AGENCE', 'AGENT', 'COMPTABLE']).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('team:manage');
    const { id } = await params;
    const input = schema.parse(await request.json());
    const member = await updateMember(user.organizationId, id, input, user.id);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'team.update',
      entityType: 'User',
      entityId: id,
      description: `Collaborateur mis à jour (${JSON.stringify(input)})`,
    });
    return NextResponse.json({ data: member });
  } catch (error) {
    return handleApiError(error);
  }
}
