import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ProfileRow } from '../../types/myProfile.model';

export function ProfileSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold text-fg sm:text-base">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function ProfileRows({ rows }: { rows: ProfileRow[] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="text-xs font-medium text-fg-muted sm:text-sm">{r.label}</dt>
          <dd className="min-w-0 break-words text-sm font-semibold text-fg sm:text-right">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-fg">
      {children}
    </span>
  );
}
