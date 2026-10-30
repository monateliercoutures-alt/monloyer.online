'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import { navForRole } from '@/components/layout/nav-config';
import { can } from '@/lib/permissions';
import type { Role } from '@prisma/client';

export function Sidebar({
  role,
  organizationName,
  overdueCount,
  logoUrl,
}: {
  role: Role;
  organizationName: string;
  overdueCount: number;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const groups = navForRole(role);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-4 rounded object-cover" />
          ) : (
            <Building2 className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{organizationName}</p>
          <p className="text-[11px] text-muted-foreground">{APP_NAME}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {groups.map((group) => {
          const items = group.items.filter((item) => !item.permission || can(role, item.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== '/mon-espace' && pathname.startsWith(`${item.href}/`));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge === 'overdue' && overdueCount > 0 ? (
                          <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                            {overdueCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-muted-foreground">
        FCFA · Africa/Abidjan
      </div>
    </aside>
  );
}
