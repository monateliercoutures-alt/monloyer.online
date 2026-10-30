'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/constants';
import { initials } from '@/lib/utils';
import { apiRequest } from '@/lib/api-client';
import type { Role } from '@prisma/client';

export function UserMenu({
  firstName,
  lastName,
  email,
  role,
  organizationName,
}: {
  firstName: string;
  lastName: string;
  email: string | null;
  role: Role;
  organizationName: string;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  async function handleLogout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      router.push('/connexion');
      router.refresh();
    } catch {
      toast.error('Déconnexion impossible.');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials(firstName, lastName)}
          </span>
          <span className="hidden text-left text-xs leading-tight sm:block">
            <span className="block font-medium">
              {firstName} {lastName}
            </span>
            <span className="block text-muted-foreground">{ROLE_LABELS[role]}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {firstName} {lastName}
          </p>
          <p className="truncate">{email ?? 'Sans e-mail'}</p>
          <p className="truncate">{organizationName}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="pointer-events-none opacity-70">
          <UserIcon className="size-4" /> {ROLE_LABELS[role]}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {resolvedTheme === 'dark' ? 'Thème clair' : 'Thème sombre'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
