import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          {APP_NAME}
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Fuseau Africa/Abidjan · Montants en FCFA
      </footer>
    </div>
  );
}
