import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { SchedulesTable } from '@/components/tables/schedules-table';
import { getTenantContext } from '@/server/session';
import { prisma } from '@/server/db';
import { formatFCFA } from '@/lib/format';
import { balanceOf } from '@/lib/rent';

export const metadata: Metadata = { title: 'Échéancier des loyers' };
export const dynamic = 'force-dynamic';

export default async function RentsPage() {
  const { organizationId } = await getTenantContext();

  const schedules = await prisma.rentSchedule.findMany({
    where: { organizationId },
    orderBy: { dueDate: 'asc' },
    include: {
      lease: {
        include: {
          tenant: { select: { firstName: true, lastName: true } },
          property: { select: { address: true, district: true } },
          unit: { select: { name: true } },
        },
      },
    },
  });

  const rows = schedules.map((schedule) => ({
    id: schedule.id,
    periodLabel: schedule.periodLabel,
    dueDate: schedule.dueDate,
    status: schedule.status,
    rentDue: schedule.rentDue,
    chargesDue: schedule.chargesDue,
    penaltyAmount: schedule.penaltyAmount,
    amountPaid: schedule.amountPaid,
    leaseId: schedule.leaseId,
    tenantName: `${schedule.lease.tenant.firstName} ${schedule.lease.tenant.lastName}`,
    propertyLabel: `${schedule.lease.property.address}${schedule.lease.unit ? ` — ${schedule.lease.unit.name}` : ''}`,
    district: schedule.lease.property.district,
    leaseReference: schedule.lease.reference,
  }));

  const overdue = rows.filter((row) => row.status === 'EN_RETARD');
  const partial = rows.filter((row) => row.status === 'PARTIEL');
  const totalUnpaid = rows.reduce((sum, row) => sum + balanceOf({ ...row, rentDue: row.rentDue, chargesDue: row.chargesDue, penaltyAmount: row.penaltyAmount, amountPaid: row.amountPaid }), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Échéancier des loyers"
        description="Toutes les échéances générées à partir des contrats, avec pénalités de retard."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/relances">
                <RefreshCw className="size-4" /> Recalculer & relancer
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/paiements">Encaisser</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Échéances en retard" value={String(overdue.length)} tone="danger" hint={`${partial.length} partiellement réglées`} />
        <StatCard
          label="Encours impayé"
          value={formatFCFA(totalUnpaid)}
          tone="warning"
          hint="Pénalités incluses"
        />
        <StatCard
          label="Échéances totales"
          value={String(rows.length)}
          hint={`${rows.filter((row) => row.status === 'PAYE').length} soldées`}
        />
      </div>

      <SchedulesTable schedules={rows} />
    </div>
  );
}
