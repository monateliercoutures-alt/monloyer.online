import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { GenerateRemindersButton, SendReminderButton } from '@/components/forms/reminder-actions';
import { getTenantContext } from '@/server/session';
import { listReminders } from '@/server/services/reminders.service';
import { DEFAULT_REMINDER_TEMPLATE, REMINDER_CHANNEL_LABELS, REMINDER_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatFCFA } from '@/lib/format';
import { prisma } from '@/server/db';
import { balanceOf } from '@/lib/rent';

export const metadata: Metadata = { title: 'Relances' };
export const dynamic = 'force-dynamic';

export default async function RemindersPage() {
  const { organizationId, user } = await getTenantContext();
  const [reminders, overdueSchedules] = await Promise.all([
    listReminders(organizationId),
    prisma.rentSchedule.findMany({
      where: { organizationId, status: { in: ['EN_RETARD', 'PARTIEL'] } },
      include: {
        lease: {
          include: {
            tenant: { select: { firstName: true, lastName: true, phone: true } },
            property: { select: { address: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
  ]);

  const pending = reminders.filter((reminder) => reminder.status === 'A_ENVOYER');
  const sent = reminders.filter((reminder) => reminder.status === 'ENVOYE');
  const potentialRecovery = overdueSchedules.reduce((sum, schedule) => sum + balanceOf(schedule), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Relances automatiques"
        description={`Décalages configurés : ${(user.organization?.reminderOffsets ?? []).map((offset) => (offset === 0 ? 'J0' : offset > 0 ? `J+${offset}` : `J${offset}`)).join(', ')} · canaux : ${(user.organization?.reminderChannels ?? []).join(', ')}`}
        actions={<GenerateRemindersButton />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Relances à envoyer" value={String(pending.length)} tone="warning" />
        <StatCard label="Relances envoyées" value={String(sent.length)} tone="success" />
        <StatCard label="Encaissement potentiel" value={formatFCFA(potentialRecovery)} tone="danger" hint="Solde des impayés" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File d&apos;envoi</CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <EmptyState
              title="Aucune relance en file"
              description="Cliquez sur « Générer les relances dues » : les messages sont créés selon vos décalages (J-3, J0, J+3…)."
            />
          ) : (
            <ul className="divide-y divide-border">
              {reminders.slice(0, 60).map((reminder) => {
                const tenant = reminder.rentSchedule.lease.tenant;
                const balance = balanceOf(reminder.rentSchedule);
                return (
                  <li key={reminder.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {tenant.firstName} {tenant.lastName}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {reminder.rentSchedule.lease.property.address}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reminder.rentSchedule.periodLabel} · {formatFCFA(balance)} · décalage{' '}
                          {reminder.offsetDays === 0 ? 'J0' : reminder.offsetDays > 0 ? `J+${reminder.offsetDays}` : `J${reminder.offsetDays}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{REMINDER_CHANNEL_LABELS[reminder.channel]}</Badge>
                        <Badge variant={reminder.status === 'ENVOYE' ? 'success' : reminder.status === 'ECHEC' ? 'danger' : 'warning'}>
                          {REMINDER_STATUS_LABELS[reminder.status]}
                        </Badge>
                        {reminder.status !== 'ENVOYE' ? (
                          <SendReminderButton
                            reminderId={reminder.id}
                            channel={reminder.channel}
                            phone={tenant.phone ?? null}
                            email={tenant.email ?? null}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{formatDate(reminder.sentAt)}</span>
                        )}
                      </div>
                    </div>
                    <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{reminder.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modèle de message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="rounded-lg bg-muted/50 p-3 text-xs">
            {user.organization?.reminderTemplate || DEFAULT_REMINDER_TEMPLATE}
          </p>
          <p className="text-xs text-muted-foreground">
            Variables disponibles : {'{nom}'}, {'{montant}'}, {'{date}'}, {'{periodicite}'}, {'{logement}'}, {'{agence}'}.
            Modifiable dans Paramètres → Relances.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
