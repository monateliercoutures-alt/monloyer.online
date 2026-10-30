import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/register-form';
import { getCurrentUser, homePathForRole } from '@/server/session';

export const metadata: Metadata = { title: 'Créer un compte' };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Créer un espace</CardTitle>
        <CardDescription>
          Votre organisation est créée immédiatement, avec un espace de données totalement isolé.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{' '}
          <Link href="/connexion" className="font-medium text-primary underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
