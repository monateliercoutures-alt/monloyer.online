import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { getTenantContext, requireUser } from '@/server/session';
import { getTenantPortal } from '@/server/services/reports.service';
import { formatDate, formatFCFA } from '@/lib/format';

export const metadata: Metadata = { title: 'Mes quittances' };
export const dynamic = 'force-dynamic';

export default async function TenantReceiptsPage() {
  const user = await requireUser();
  const { organizationId } = await getTenantContext();
  const { tenant } = await getTenantPortal(organizationId, user.id);

  return (
    <div className="space-y-4">
      <PageHeader title="Mes quittances" description="Téléchargez vos quittances de loyer à tout moment." />
      <Card>
        <CardHeader>
          <CardTitle>{tenant.receipts.length} quittance(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.receipts.length === 0 ? (
            <EmptyState title="Aucune quittance" description="Vos quittances apparaîtront après chaque paiement." />
          ) : (
            <ul className="divide-y divide-border">
              {tenant.receipts.map((receipt) => (
                <li key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{receipt.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.periodLabel} · {formatDate(receipt.issuedAt)} · {formatFCFA(receipt.amountPaid)}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/pdf/quittance/${receipt.id}`} target="_blank" rel="noreferrer">
                      <Download className="size-4" /> PDF
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
