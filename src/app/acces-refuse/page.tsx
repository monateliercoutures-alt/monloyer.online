import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Accès refusé' };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mb-2 w-fit rounded-full bg-destructive/10 p-3 text-destructive">
            <ShieldAlert className="size-6" />
          </div>
          <CardTitle>Accès refusé</CardTitle>
          <CardDescription>
            Votre rôle ne vous autorise pas à consulter cette page. Contactez un administrateur de votre
            organisation si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/tableau-de-bord">Retour au tableau de bord</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
