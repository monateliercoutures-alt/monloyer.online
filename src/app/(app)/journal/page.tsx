import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ActivityTable } from '@/components/tables/activity-table';
import { requirePermission, getTenantContext } from '@/server/session';
import { prisma } from '@/server/db';

export const metadata: Metadata = { title: "Journal d'activité" };
export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  await requirePermission('activity:read');
  const { organizationId } = await getTenantContext();

  const logs = await prisma.activityLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journal d'activité"
        description="Qui a fait quoi, quand : création de biens, contrats, paiements, annulations, envois de relances…"
      />
      <Card>
        <CardContent className="p-4">
          {logs.length === 0 ? (
            <EmptyState title="Aucune activité" description="Les actions de votre équipe apparaîtront ici." />
          ) : (
            <ActivityTable
              logs={logs.map((log) => ({
                id: log.id,
                actorName: log.actorName,
                action: log.action,
                entityType: log.entityType,
                description: log.description,
                createdAt: log.createdAt,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
