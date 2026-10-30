'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, X } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { UserMenu } from '@/components/layout/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { navForRole } from '@/components/layout/nav-config';
import { can } from '@/lib/permissions';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';

type ShellUser = {
  firstName: string;
  lastName: string;
  email: string | null;
  role: Role;
};

export function AppShell({
  user,
  organizationName,
  logoUrl,
  overdueCount,
  children,
}: {
  user: ShellUser;
  organizationName: string;
  logoUrl?: string | null;
  overdueCount: number;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const groups = navForRole(user.role);

  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <Sidebar role={user.role} organizationName={organizationName} overdueCount={overdueCount} logoUrl={logoUrl} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <Link href="/tableau-de-bord" className="flex items-center gap-2 lg:hidden">
            <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Building2 className="size-4" />
            </span>
            <span className="text-sm font-semibold">{APP_NAME}</span>
          </Link>
          <div className="hidden lg:block">
            <p className="text-sm font-medium">{organizationName}</p>
            <p className="text-xs text-muted-foreground">
              {overdueCount > 0
                ? `${overdueCount} échéance${overdueCount > 1 ? 's' : ''} en retard`
                : 'Aucun impayé en retard'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu
              firstName={user.firstName}
              lastName={user.lastName}
              email={user.email}
              role={user.role}
              organizationName={organizationName}
            />
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-10 sm:pt-6">{children}</main>
      </div>

      <MobileNav role={user.role} onOpenMenu={() => setMenuOpen(true)} />

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85%] overflow-y-auto bg-card p-4 shadow-xl scrollbar-thin">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            {groups.map((group) => {
              const items = group.items.filter((item) => !item.permission || can(user.role, item.permission));
              if (!items.length) return null;
              return (
                <div key={group.title} className="mb-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium',
                            pathname === item.href
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-muted',
                          )}
                        >
                          <item.icon className="size-4" />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
