import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/server/http';
import { markReminderSent } from '@/server/services/reminders.service';
import { logActivity } from '@/server/activity';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('reminders:manage');
    const { id } = await params;
    const result = await markReminderSent(user.organizationId, id);
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'reminder.send',
      entityType: 'Reminder',
      entityId: id,
      description: `Relance ${result.channel} envoyée`,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
