import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { getTenantContext, requireUser } from '@/server/session';
import { buildOwnerStatement } from '@/server/services/reports.service';
import { prisma } from '@/server/db';
import { formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Mes relevés' };
export const dynamic = 'force-dynamic';

export default async function OwnerStatementsPage() {
  const user = await requireUser();
  const { organizationId } = await getTenantContext();

  const owner = await prisma.owner.findFirst({
    where: { userId: user.id, organizationId },
    select: { id: true },
  });

  const months = Array.from({ length: 3 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    date.setDate(1);
    return date;
  });

  const statements = owner
    ? (await Promise.all(
        months.map((month) => buildOwnerStatement(organizationId, owner.id, month).catch(() => null)),
      )).filter((statement): statement is NonNullable<typeof statement> => statement !== null)
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mes relevés de gérance"
        description="Loyers encaissés, commission d'agence, charges et net à recevoir."
      />

      {statements.length === 0 ? (
        <EmptyState
          title="Aucun relevé disponible"
          description="Les relevés sont générés dès le premier encaissement de loyer."
        />
      ) : (
        statements.map((statement) => (
          <Card key={statement.month.toISOString()}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{statement.monthLabel}</CardTitle>
              <Button asChild size="sm">
                <a
                  href={`/api/pdf/releve?ownerId=${statement.owner.id}&month=${statement.month
                    .toISOString()
                    .slice(0, 7)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="size-4" /> PDF
                </a>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Encaissé</p>
                <p className="font-semibold">{formatFCFA(statement.collected)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="font-semibold">{formatFCFA(statement.commission)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Charges</p>
                <p className="font-semibold">{formatFCFA(statement.expensesTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net à recevoir</p>
                <p className="font-semibold text-primary">{formatFCFA(statement.netToRemit)}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
