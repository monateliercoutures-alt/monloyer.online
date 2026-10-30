import { NextResponse } from 'next/server';
import { acceptInvitationSchema } from '@/lib/validations';
import { acceptInvitation } from '@/server/services/auth.service';
import { createSession, homePathForRole } from '@/server/session';
import { prisma } from '@/server/db';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = acceptInvitationSchema.parse(await request.json());
    const { userId } = await acceptInvitation(payload);
    await createSession(userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return NextResponse.json(
      { ok: true, redirect: homePathForRole(user?.role ?? 'AGENT') },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
