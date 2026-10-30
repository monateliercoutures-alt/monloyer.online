import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  FileCheck2,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const FEATURES = [
  {
    icon: Building2,
    title: 'Biens & logements',
    description: 'Appartements, villas, boutiques, immeubles multi-lots : chaque lot suit son propre statut.',
  },
  {
    icon: FileCheck2,
    title: 'Baux & échéanciers',
    description: 'Génération automatique des échéances, alertes avant expiration, résiliation avec préavis.',
  },
  {
    icon: ReceiptText,
    title: 'Quittances PDF',
    description: 'Numérotation séquentielle par agence, envoi par WhatsApp ou e-mail en un clic.',
  },
  {
    icon: MessageCircle,
    title: 'Relances automatiques',
    description: 'J-3, J0, J+3, J+7, J+15 : messages personnalisés avec {nom}, {montant}, {date}.',
  },
  {
    icon: BarChart3,
    title: 'Relevés de gérance',
    description: 'Loyers encaissés, commission, charges et net à reverser pour chaque propriétaire.',
  },
  {
    icon: ShieldCheck,
    title: 'Données isolées',
    description: 'Multi-tenant strict : chaque agence ne voit que ses propres données, côté serveur.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/connexion">Connexion</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/inscription">Créer un espace</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-14 pt-8 sm:pt-16">
          <Badge variant="secondary" className="mb-4">
            <Smartphone className="size-3" /> Pensé pour le mobile · FCFA · Africa/Abidjan
          </Badge>
          <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Gérez vos loyers sans cahier ni tableur.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {APP_TAGLINE}. Baux, échéanciers, paiements Mobile Money, quittances PDF, relances WhatsApp et
            relevés de gérance — dans un seul outil.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/inscription">
                Démarrer gratuitement <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/connexion">Voir la démonstration</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Compte de démonstration : <strong>admin@monloyer.ci</strong> / <strong>Demo1234!</strong>
          </p>
        </section>

        <section className="border-y border-border bg-muted/40 py-12">
          <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 w-fit rounded-lg bg-primary/10 p-2 text-primary">
                  <feature.icon className="size-5" aria-hidden />
                </div>
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">Un espace pour chaque acteur</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                L&apos;agence pilote l&apos;ensemble, le propriétaire suit ses biens et ses reversements, le
                locataire retrouve son contrat, ses quittances et son solde.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                'Tableau de bord agence : attendu vs encaissé, impayés, taux d’occupation',
                'Espace propriétaire : biens, loyers et relevés mensuels en PDF',
                'Espace locataire : contrat, quittances, solde restant',
                'Journal d’activité : qui a fait quoi, quand',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 rounded-full bg-emerald-500/15 p-1 text-emerald-600">
                    <ShieldCheck className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {APP_NAME} — Côte d&apos;Ivoire · Montants en FCFA
      </footer>
    </div>
  );
}
