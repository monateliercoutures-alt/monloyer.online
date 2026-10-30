import { prisma } from '@/server/db';
import { handleApiError, requireApiUser, ApiError } from '@/server/http';
import { createPdf, drawHeader, footer, keyValues, paragraph, pdfResponse, sectionTitle, stamp, table, text, totalRow } from '@/server/pdf';
import { formatDate, formatFCFA, safeFileName } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('receipts:read');
    const { id } = await params;

    const receipt = await prisma.receipt.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        organization: true,
        tenant: true,
        lease: { include: { property: true, unit: true, owner: true } },
        payment: true,
      },
    });
    if (!receipt) throw new ApiError(404, 'Quittance introuvable.');

    const ctx = await createPdf();
    await drawHeader(ctx, {
      organizationName: receipt.organization.name,
      address: receipt.organization.address,
      phone: receipt.organization.phone,
      email: receipt.organization.email,
      logoUrl: receipt.organization.logoUrl,
      documentTitle: 'Quittance de loyer',
      documentNumber: `N° ${receipt.number}`,
      issuedAt: receipt.issuedAt,
    });

    text(ctx, `Quittance de loyer — ${receipt.periodLabel}`, { size: 13, bold: true });
    ctx.y -= 6;

    sectionTitle(ctx, 'Locataire');
    keyValues(ctx, [
      { label: 'Nom et prénoms', value: `${receipt.tenant.firstName} ${receipt.tenant.lastName}` },
      { label: 'Téléphone', value: receipt.tenant.phone },
      { label: 'Bien loué', value: `${receipt.lease.property.address}, ${receipt.lease.property.district}` },
      { label: 'Logement', value: receipt.lease.unit?.name ?? `${receipt.lease.property.reference} (bien entier)` },
    ]);

    sectionTitle(ctx, 'Détail du règlement');
    const rentPart = Math.max(0, receipt.amountPaid - receipt.chargesPaid);
    table(
      ctx,
      [
        { header: 'Désignation', width: 55 },
        { header: 'Période', width: 25 },
        { header: 'Montant', width: 20, align: 'right' },
      ],
      [
        ['Loyer principal', receipt.periodLabel, formatFCFA(rentPart)],
        ['Charges locatives', receipt.periodLabel, formatFCFA(receipt.chargesPaid)],
      ],
    );

    totalRow(ctx, 'Montant total réglé', receipt.amountPaid, { emphasis: true });

    if (receipt.balanceDue > 0) {
      text(ctx, `Solde restant dû sur cette échéance : ${formatFCFA(receipt.balanceDue)}`, {
        size: 9.5,
        bold: true,
        color: undefined,
      });
      paragraph(
        ctx,
        "Cette quittance est délivrée pour le montant réellement encaissé. Le solde indiqué ci-dessus reste exigible conformément au contrat de bail.",
        { size: 8.5 },
      );
    } else {
      paragraph(
        ctx,
        "Le locataire est à jour du règlement de la période mentionnée. Cette quittance vaut décharge pour les sommes indiquées.",
        { size: 8.5 },
      );
    }

    sectionTitle(ctx, 'Informations de paiement');
    keyValues(ctx, [
      {
        label: 'Mode de règlement',
        value: PAYMENT_METHOD_LABELS[receipt.payment?.method ?? 'ESPECES'],
      },
      { label: 'Référence', value: receipt.payment?.reference ?? '—' },
      { label: 'Date du paiement', value: formatDate(receipt.payment?.paidAt ?? receipt.issuedAt) },
      { label: 'Contrat', value: receipt.lease.reference },
    ]);

    stamp(ctx, receipt.organization.name, 'Agence immobilière');
    footer(ctx, receipt.organization.name, `Quittance ${receipt.number}`);

    return await pdfResponse(ctx, safeFileName(`quittance-${receipt.number}`));
  } catch (error) {
    return handleApiError(error);
  }
}
