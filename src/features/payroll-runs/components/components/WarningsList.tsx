import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Warning } from '../../types/payrollRuns.model';

const ORDER = { error: 0, warning: 1, info: 2 } as const;

export function WarningsList({ warnings }: { warnings: Warning[] }) {
  if (!warnings.length) return null;
  const sorted = [...warnings].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  return (
    <section aria-label="Checks" className="rounded-xl border border-line bg-surface">
      <ul className="divide-y divide-line">
        {sorted.map((w, i) => {
          const Icon = w.level === 'error' ? AlertCircle : w.level === 'warning' ? AlertTriangle : Info;
          return (
            <li key={`${w.code}-${i}`} className="flex items-start gap-2.5 px-4 py-2.5">
              <Icon
                aria-hidden
                className={cx('mt-0.5 h-4 w-4 shrink-0', w.level === 'error' ? 'text-[var(--tt-danger)]' : w.level === 'warning' ? 'text-fg' : 'text-fg-subtle')}
              />
              <div className="min-w-0">
                <p className={cx('text-sm', w.level === 'error' ? 'font-semibold text-[var(--tt-danger)]' : w.level === 'warning' ? 'font-medium text-fg' : 'text-fg-muted')}>{w.message}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">{w.level}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
