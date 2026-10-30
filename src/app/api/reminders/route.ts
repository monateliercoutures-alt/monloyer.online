import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/server/http';
import { generateReminders, listReminders } from '@/server/services/reminders.service';
import { logActivity } from '@/server/activity';
import { reminderGenerateSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser('reminders:manage');
    return NextResponse.json({ data: await listReminders(user.organizationId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser('reminders:manage');
    const body = await request.json().catch(() => ({}));
    const input = reminderGenerateSchema.parse(body);
    const result = await generateReminders(user.organizationId, {
      leaseId: input.leaseId || undefined,
      createdById: user.id,
    });
    await logActivity({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      action: 'reminder.generate',
      entityType: 'Reminder',
      description: `${result.created} relance(s) générée(s)`,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
