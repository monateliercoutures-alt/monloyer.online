import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { ApiError, handleApiError, requireApiUser } from '@/server/http';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

const schema = z.object({ channel: z.enum(['WHATSAPP', 'EMAIL']) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('receipts:read');
    const { id } = await params;
    const input = schema.parse(await request.json());

    const receipt = await prisma.receipt.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, number: true },
    });
    if (!receipt) throw new ApiError(404, 'Quittance introuvable.');

    await prisma.receipt.update({
      where: { id },
      data: { channel: input.channel, sentAt: new Date() },
    });

    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'receipt.send',
      entityType: 'Receipt',
      entityId: id,
      description: `Quittance ${receipt.number} envoyée par ${input.channel.toLowerCase()}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
