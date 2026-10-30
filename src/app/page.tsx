import { redirect } from 'next/navigation';
import { getCurrentUser, homePathForRole } from '@/server/session';

/**
 * Pas de page d'accueil publique : la racine du site n'est qu'un point d'entrée.
 * - Utilisateur connecté  -> son espace (tableau de bord ou espace portail)
 * - Visiteur              -> l'écran de connexion
 */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? homePathForRole(user.role) : '/connexion');
}
