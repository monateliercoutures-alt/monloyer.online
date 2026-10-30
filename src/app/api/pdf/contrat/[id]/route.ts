import { prisma } from '@/server/db';
import { ApiError, handleApiError, requireApiUser } from '@/server/http';
import { createPdf, drawHeader, footer, keyValues, paragraph, pdfResponse, sectionTitle, stamp, text } from '@/server/pdf';
import { formatDate, formatFCFA, safeFileName } from '@/lib/format';
import { PERIODICITY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/constants';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser('leases:read');
    const { id } = await params;

    const lease = await prisma.lease.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { organization: true, property: true, unit: true, tenant: true, owner: true },
    });
    if (!lease) throw new ApiError(404, 'Contrat introuvable.');

    const ctx = await createPdf();
    await drawHeader(ctx, {
      organizationName: lease.organization.name,
      address: lease.organization.address,
      phone: lease.organization.phone,
      email: lease.organization.email,
      logoUrl: lease.organization.logoUrl,
      documentTitle: 'Contrat de bail',
      documentNumber: `Réf. ${lease.reference}`,
      issuedAt: lease.signedAt ?? lease.createdAt,
    });

    text(ctx, "Contrat de bail à usage d'habitation / professionnel", { size: 12.5, bold: true });
    ctx.y -= 4;

    sectionTitle(ctx, 'Entre les parties');
    keyValues(ctx, [
      {
        label: 'Bailleur (propriétaire)',
        value: `${lease.owner.firstName} ${lease.owner.lastName}`,
      },
      { label: 'Représenté par', value: lease.organization.name },
      {
        label: 'Preneur (locataire)',
        value: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
      },
      { label: 'Téléphone du locataire', value: lease.tenant.phone },
    ]);

    sectionTitle(ctx, 'Désignation du bien');
    keyValues(ctx, [
      { label: 'Référence', value: lease.property.reference },
      { label: 'Type', value: PROPERTY_TYPE_LABELS[lease.property.type] },
      {
        label: 'Adresse',
        value: `${lease.property.address}, ${lease.property.district}, ${lease.property.city}`,
      },
      { label: 'Logement', value: lease.unit?.name ?? 'Bien entier' },
    ]);

    sectionTitle(ctx, 'Conditions financières');
    keyValues(ctx, [
      { label: 'Loyer mensuel', value: formatFCFA(lease.rentAmount) },
      { label: 'Charges', value: formatFCFA(lease.chargesAmount) },
      { label: 'Caution', value: formatFCFA(lease.depositAmount) },
      { label: 'Avance', value: `${lease.advanceMonths} mois` },
      { label: 'Périodicité', value: PERIODICITY_LABELS[lease.periodicity] },
      { label: 'Préavis de résiliation', value: `${lease.noticePeriodDays} jours` },
    ]);

    sectionTitle(ctx, 'Durée');
    keyValues(ctx, [
      { label: 'Date de prise d’effet', value: formatDate(lease.startDate) },
      { label: 'Date d’échéance', value: formatDate(lease.endDate) },
    ]);

    sectionTitle(ctx, 'Clauses essentielles');
    paragraph(
      ctx,
      `1. Le preneur s'acquitte du loyer et des charges au plus tard le jour de l'échéance de chaque période (${PERIODICITY_LABELS[lease.periodicity].toLowerCase()}).`,
    );
    paragraph(
      ctx,
      "2. Le locataire est responsable des dégradations causées au logement pendant la durée du bail, à l'exception de l'usure normale.",
    );
    paragraph(
      ctx,
      `3. Toute résiliation doit être notifiée avec un préavis de ${lease.noticePeriodDays} jours, conformément aux dispositions applicables.`,
    );
    paragraph(
      ctx,
      `4. La caution de ${formatFCFA(lease.depositAmount)} est restituée après état des lieux de sortie et apurement des sommes dues.`,
    );
    paragraph(
      ctx,
      "5. Les parties reconnaissent que la gestion locative est assurée par l'agence désignée ci-dessus, qui perçoit les loyers pour le compte du bailleur.",
    );

    ctx.y -= 20;
    const signatureY = Math.max(ctx.y, 170);
    ctx.page.drawText('Signature du preneur', { x: ctx.margin, y: signatureY, size: 8, font: ctx.font, color: undefined });
    ctx.page.drawLine({
      start: { x: ctx.margin, y: signatureY - 34 },
      end: { x: ctx.margin + 150, y: signatureY - 34 },
      thickness: 0.6,
      color: undefined,
    });
    stamp(ctx, lease.organization.name, 'Pour le bailleur');

    footer(ctx, lease.organization.name, `Contrat ${lease.reference}`);
    return await pdfResponse(ctx, safeFileName(`contrat-${lease.reference}`));
  } catch (error) {
    return handleApiError(error);
  }
}
