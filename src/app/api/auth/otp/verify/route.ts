import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { otpVerifySchema } from '@/lib/validations';
import { verifyPhoneOtp } from '@/server/services/auth.service';
import { createSession, homePathForRole } from '@/server/session';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = otpVerifySchema.parse(await request.json());
    const userId = await verifyPhoneOtp(payload.phone, payload.code);
    await createSession(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return NextResponse.json({
      ok: true,
      redirect: homePathForRole(user?.role ?? 'AGENT'),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
