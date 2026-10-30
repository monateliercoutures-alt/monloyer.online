import { NextResponse } from 'next/server';
import { otpVerifySchema } from '@/lib/validations';
import { verifyPhoneOtp } from '@/server/services/auth.service';
import { createSession } from '@/server/session';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = otpVerifySchema.parse(await request.json());
    const userId = await verifyPhoneOtp(payload.phone, payload.code);
    await createSession(userId);
    return NextResponse.json({ ok: true, redirect: '/tableau-de-bord' });
  } catch (error) {
    return handleApiError(error);
  }
}
