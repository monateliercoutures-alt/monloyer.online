'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navForRole } from '@/components/layout/nav-config';
import { can } from '@/lib/permissions';
import type { Role } from '@prisma/client';

/** Barre de navigation basse (mobile) + accès au menu complet. */
export function MobileNav({
  role,
  onOpenMenu,
}: {
  role: Role;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const items = navForRole(role)
    .flatMap((group) => group.items)
    .filter((item) => item.mobile && (!item.permission || can(role, item.permission)))
    .slice(0, 4);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/mon-espace' && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="size-5" />
                <span className="truncate px-1">{item.label.split(' ')[0]}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="size-5" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
