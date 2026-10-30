import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold tracking-tight sm:text-xl">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn('rounded-lg p-2', tones[tone])}>
            <Icon className="size-4" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
