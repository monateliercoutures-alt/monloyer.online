import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations';
import { registerOrganization } from '@/server/services/auth.service';
import { createSession } from '@/server/session';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const { userId } = await registerOrganization(payload);
    await createSession(userId);
    return NextResponse.json({ ok: true, redirect: '/tableau-de-bord' }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
