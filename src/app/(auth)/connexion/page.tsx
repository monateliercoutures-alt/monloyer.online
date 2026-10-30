import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser, homePathForRole } from '@/server/session';

export const metadata: Metadata = { title: 'Connexion' };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Connexion</CardTitle>
        <CardDescription>
          Accédez à votre espace de gestion locative par e-mail ou par téléphone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
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
