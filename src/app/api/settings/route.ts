import { NextResponse } from 'next/server';
import { settingsSchema } from '@/lib/validations';
import { handleApiError, requireApiUser } from '@/server/http';
import { getOrganizationSettings, updateOrganizationSettings } from '@/server/services/settings.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('org:manage');
    return NextResponse.json({ data: await getOrganizationSettings(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser('org:manage');
    const input = settingsSchema.parse(await request.json());
    const organization = await updateOrganizationSettings(user.organizationId, input);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'settings.update',
      entityType: 'Organization',
      entityId: organization.id,
      description: 'Paramètres de l’organisation mis à jour',
    });
    return NextResponse.json({ data: organization });
  } catch (error) {
    return handleApiError(error);
  }
}
