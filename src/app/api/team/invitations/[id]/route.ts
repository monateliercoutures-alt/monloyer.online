import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/server/http';
import { revokeInvitation } from '@/server/services/settings.service';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('team:manage');
    const { id } = await params;
    await revokeInvitation(user.organizationId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
