import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { requireUser } from '@/server/session';
import { prisma } from '@/server/db';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.organization) {
    // Compte sans organisation (super admin technique) : pas d'espace agence.
    redirect('/acces-refuse');
  }

  const overdueCount = await prisma.rentSchedule.count({
    where: { organizationId: user.organization.id, status: 'EN_RETARD' },
  });

  return (
    <AppShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }}
      organizationName={user.organization.name}
      logoUrl={user.organization.logoUrl}
      overdueCount={overdueCount}
    >
      {children}
    </AppShell>
  );
}
