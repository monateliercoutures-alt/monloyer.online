import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Onboarding guidé à la première connexion :
 * ajouter un bien → un locataire → un contrat.
 */
export function OnboardingChecklist({
  properties,
  tenants,
  leases,
  payments,
}: {
  properties: number;
  tenants: number;
  leases: number;
  payments: number;
}) {
  const steps = [
    {
      label: 'Ajouter un bien',
      description: 'Adresse, type, loyer et propriétaire',
      href: '/biens',
      done: properties > 0,
    },
    {
      label: 'Enregistrer un locataire',
      description: 'Identité, pièce justificative et garant',
      href: '/locataires',
      done: tenants > 0,
    },
    {
      label: 'Créer un contrat de bail',
      description: "L'échéancier est généré automatiquement",
      href: '/contrats/nouveau',
      done: leases > 0,
    },
    {
      label: 'Encaisser un premier loyer',
      description: 'La quittance PDF est émise sur-le-champ',
      href: '/paiements',
      done: payments > 0,
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  if (completed === steps.length) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Démarrage rapide — {completed}/{steps.length} étapes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium">{step.label}</span>
                <span className="block text-xs text-muted-foreground">{step.description}</span>
              </span>
            </Link>
          ))}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/biens">Continuer la configuration</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
