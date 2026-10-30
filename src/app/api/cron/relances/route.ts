import { NextResponse } from 'next/server';
import { runDailyReminders } from '@/server/services/reminders.service';
import { handleApiError } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Tâche planifiée quotidienne (Vercel Cron).
 * Protégée par CRON_SECRET : Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'CRON_SECRET non configuré.' }, { status: 503 });
    }
    const authorization = request.headers.get('authorization');
    const querySecret = new URL(request.url).searchParams.get('secret');
    if (authorization !== `Bearer ${secret}` && querySecret !== secret) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const result = await runDailyReminders();
    return NextResponse.json({ ok: true, ...result, runAt: new Date().toISOString() });
  } catch (error) {
    return handleApiError(error);
  }
}
