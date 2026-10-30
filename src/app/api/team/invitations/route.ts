import { NextResponse } from 'next/server';
import { invitationSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { inviteMember } from '@/server/services/settings.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('team:manage');
    const input = invitationSchema.parse(await request.json());
    const { invitation, url } = await inviteMember(user.organizationId, input, { invitedById: user.id });
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'invitation.create',
      entityType: 'Invitation',
      entityId: invitation.id,
      description: `Invitation ${invitation.role} créée`,
    });
    return NextResponse.json(
      { data: { invitation, url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${url}` } },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
