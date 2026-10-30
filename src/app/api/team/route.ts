import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/server/http';
import { listTeam } from '@/server/services/settings.service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('team:manage');
    return NextResponse.json({ data: await listTeam(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}
