import { prisma } from '@/server/db';
import { ApiError, handleApiError, requireApiUser } from '@/server/http';
import { createPdf, drawHeader, footer, keyValues, pdfResponse, sectionTitle, stamp, table, text, totalRow } from '@/server/pdf';
import { formatDate, formatFCFA, safeFileName } from '@/lib/format';
import { buildOwnerStatement } from '@/server/services/reports.service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser('reports:read');
    const url = new URL(request.url);
    const ownerId = url.searchParams.get('ownerId');
    const monthParam = url.searchParams.get('month'); // format YYYY-MM
    if (!ownerId) throw new ApiError(400, 'Propriétaire manquant.');

    const month = monthParam ? new Date(`${monthParam}-01T00:00:00Z`) : new Date();
    if (Number.isNaN(month.getTime())) throw new ApiError(400, 'Mois invalide.');

    const statement = await buildOwnerStatement(user.organizationId, ownerId, month);
    const { organization, owner, payments, expenses } = statement;

    const ctx = await createPdf();
    await drawHeader(ctx, {
      organizationName: organization.name,
      address: organization.address,
      phone: organization.phone,
      email: organization.email,
      logoUrl: organization.logoUrl,
      documentTitle: 'Relevé de gérance',
      documentNumber: statement.monthLabel,
      issuedAt: new Date(),
    });

    text(ctx, `Relevé de gérance — ${statement.monthLabel}`, { size: 13, bold: true });
    ctx.y -= 4;

    sectionTitle(ctx, 'Propriétaire');
    keyValues(ctx, [
      { label: 'Nom', value: `${owner.firstName} ${owner.lastName}` },
      { label: 'Téléphone', value: owner.phone },
      {
        label: 'Biens en gestion',
        value: `${owner.properties.length} (${owner.properties.map((p) => p.reference).join(', ') || '—'})`,
      },
      {
        label: 'Commission',
        value:
          owner.commissionValue != null
            ? owner.commissionType === 'POURCENTAGE'
              ? `${owner.commissionValue} % des loyers encaissés`
              : `${formatFCFA(owner.commissionValue)} par échéance`
            : `${organization.commissionRate} % (barème agence)`,
      },
    ]);

    sectionTitle(ctx, 'Loyers encaissés');
    table(
      ctx,
      [
        { header: 'Date', width: 16 },
        { header: 'Locataire', width: 28 },
        { header: 'Bien', width: 32 },
        { header: 'Période', width: 22 },
        { header: 'Montant', width: 20, align: 'right' },
      ],
      payments.map((payment) => [
        formatDate(payment.paidAt),
        `${payment.tenant?.firstName ?? ''} ${payment.tenant?.lastName ?? ''}`.trim() || '—',
        `${payment.lease.property.address}${payment.lease.unit ? ` — ${payment.lease.unit.name}` : ''}`,
        payment.rentSchedule?.periodLabel ?? '—',
        formatFCFA(payment.amount),
      ]),
      { emptyLabel: 'Aucun encaissement sur la période' },
    );

    sectionTitle(ctx, 'Charges et dépenses');
    table(
      ctx,
      [
        { header: 'Date', width: 16 },
        { header: 'Libellé', width: 50 },
        { header: 'Fournisseur', width: 24 },
        { header: 'Montant', width: 20, align: 'right' },
      ],
      expenses.map((expense) => [
        formatDate(expense.date),
        expense.label,
        expense.supplier ?? '—',
        formatFCFA(expense.amount),
      ]),
      { emptyLabel: 'Aucune dépense sur la période' },
    );

    sectionTitle(ctx, 'Synthèse');
    totalRow(ctx, 'Total des loyers encaissés', statement.collected);
    totalRow(ctx, 'Commission d’agence', -statement.commission);
    totalRow(ctx, 'Charges et dépenses', -statement.expensesTotal);
    totalRow(ctx, 'Net à reverser au propriétaire', statement.netToRemit, { emphasis: true });

    text(
      ctx,
      owner.paymentDetails
        ? `Règlement : ${owner.paymentMethod ?? 'virement'} — ${owner.paymentDetails}`
        : 'Règlement selon les modalités convenues avec l’agence.',
      { size: 9, color: undefined },
    );

    stamp(ctx, organization.name, 'Service gérance');
    footer(ctx, organization.name, `Relevé ${statement.monthLabel}`);

    return await pdfResponse(
      ctx,
      safeFileName(`releve-${owner.lastName}-${statement.monthLabel}`),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
