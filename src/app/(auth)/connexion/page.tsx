import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser, homePathForRole } from '@/server/session';

export const metadata: Metadata = { title: 'Connexion' };

const SESSION_HINTS: Record<string, string> = {
  session:
    'Votre session a expiré ou n\'a pas pu être enregistrée. Reconnectez-vous ; si vous venez de le faire, ouvrez l\'application dans un onglet dédié (les cookies sont parfois bloqués dans un aperçu intégré).',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));

  const { erreur } = await searchParams;
  // Message affiché côté serveur : visible même si le JavaScript ne s'exécute pas.
  const initialError = erreur ? SESSION_HINTS[erreur] ?? decodeURIComponent(erreur) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Connexion</CardTitle>
        <CardDescription>
          Accédez à votre espace de gestion locative par e-mail ou par téléphone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm initialError={initialError} />
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="font-medium text-primary underline-offset-4 hover:underline">
            Créer mon agence
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
