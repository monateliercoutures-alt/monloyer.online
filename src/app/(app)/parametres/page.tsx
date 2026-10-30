import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { SettingsForm } from '@/components/forms/settings-form';
import { InvitationDialog } from '@/components/forms/action-dialogs';
import { requirePermission, getTenantContext } from '@/server/session';
import { getOrganizationSettings, listTeam } from '@/server/services/settings.service';
import { listOwners } from '@/server/services/owners.service';
import { listTenants } from '@/server/services/tenants.service';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Paramètres' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requirePermission('org:manage');
  const { organizationId } = await getTenantContext();

  const [organization, team, owners, tenants] = await Promise.all([
    getOrganizationSettings(organizationId),
    listTeam(organizationId),
    listOwners(organizationId),
    listTenants(organizationId),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Paramètres"
        description="Identité, commissions, pénalités, relances, numérotation des quittances et équipe."
      />

      <SettingsForm
        organization={{
          name: organization.name,
          email: organization.email,
          phone: organization.phone,
          address: organization.address,
          city: organization.city,
          logoUrl: organization.logoUrl,
          primaryColor: organization.primaryColor,
          commissionRate: organization.commissionRate,
          penaltyRatePercent: organization.penaltyRatePercent,
          penaltyGraceDays: organization.penaltyGraceDays,
          reminderOffsets: organization.reminderOffsets,
          reminderChannels: organization.reminderChannels,
          reminderTemplate: organization.reminderTemplate,
          receiptPrefix: organization.receiptPrefix,
          receiptCounter: organization.receiptCounter,
        }}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Équipe ({team.members.length})</CardTitle>
          <InvitationDialog
            owners={owners.map((owner) => ({
              id: owner.id,
              label: `${owner.firstName} ${owner.lastName}`,
            }))}
            tenants={tenants.map((tenant) => ({
              id: tenant.id,
              label: `${tenant.firstName} ${tenant.lastName} — ${tenant.phone}`,
            }))}
          />
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {team.members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email ?? member.phone ?? '—'} ·{' '}
                    {member.lastLoginAt ? `dernière connexion ${formatDateTime(member.lastLoginAt)}` : 'jamais connecté'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                  <Badge variant={member.isActive ? 'success' : 'muted'}>
                    {member.isActive ? 'Actif' : 'Désactivé'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations ({team.invitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {team.invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune invitation en cours.</p>
          ) : (
            <ul className="divide-y divide-border">
              {team.invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {invitation.firstName ?? invitation.email ?? invitation.phone ?? 'Invitation'}
                      {invitation.lastName ? ` ${invitation.lastName}` : ''}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[invitation.role]} · expire le {formatDate(invitation.expiresAt)} · lien{' '}
                      <span className="font-mono">/invitation/{invitation.token.slice(0, 12)}…</span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      invitation.status === 'ACCEPTEE'
                        ? 'success'
                        : invitation.status === 'EN_ATTENTE'
                          ? 'warning'
                          : 'muted'
                    }
                  >
                    {invitation.status === 'EN_ATTENTE' ? 'En attente' : invitation.status.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
