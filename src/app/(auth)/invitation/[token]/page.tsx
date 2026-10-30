import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvitationForm } from '@/components/auth/invitation-form';
import { getInvitationByToken } from '@/server/services/settings.service';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: "Acceptation d'invitation" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation || invitation.status !== 'EN_ATTENTE' || invitation.expiresAt < new Date()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation invalide</CardTitle>
          <CardDescription>
            Ce lien a expiré ou a déjà été utilisé. Demandez une nouvelle invitation à votre agence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/connexion" className="text-sm font-medium text-primary hover:underline">
            Aller à la page de connexion
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Badge variant="secondary" className="mb-2 w-fit">
          {ROLE_LABELS[invitation.role]}
        </Badge>
        <CardTitle>Rejoindre {invitation.organization.name}</CardTitle>
        <CardDescription>
          Invitation valable jusqu&apos;au {formatDate(invitation.expiresAt)}. Créez votre accès pour consulter
          vos biens, contrats et quittances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InvitationForm
          token={token}
          defaultFirstName={invitation.firstName}
          defaultLastName={invitation.lastName}
          defaultEmail={invitation.email}
          defaultPhone={invitation.phone}
        />
      </CardContent>
    </Card>
  );
}
