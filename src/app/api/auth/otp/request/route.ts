import { NextResponse } from 'next/server';
import { otpRequestSchema } from '@/lib/validations';
import { requestPhoneOtp } from '@/server/services/auth.service';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = otpRequestSchema.parse(await request.json());
    const result = await requestPhoneOtp(payload.phone);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
