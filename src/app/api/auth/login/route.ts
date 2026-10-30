import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations';
import { authenticateWithPassword } from '@/server/services/auth.service';
import { createSession } from '@/server/session';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const userId = await authenticateWithPassword(payload.email, payload.password);
    await createSession(userId);
    return NextResponse.json({ ok: true, redirect: '/tableau-de-bord' });
  } catch (error) {
    return handleApiError(error);
  }
}
