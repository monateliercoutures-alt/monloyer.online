import { NextResponse } from 'next/server';
import { acceptInvitationSchema } from '@/lib/validations';
import { acceptInvitation } from '@/server/services/auth.service';
import { createSession } from '@/server/session';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = acceptInvitationSchema.parse(await request.json());
    const { userId } = await acceptInvitation(payload);
    await createSession(userId);
    return NextResponse.json({ ok: true, redirect: '/tableau-de-bord' }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
