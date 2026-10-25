'use client';

import { AlertTriangle, CircleAlert, Info } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Flag } from '../types/bill.model';

export function FlagList({ flags, compact }: { flags: Flag[]; compact?: boolean }) {
  if (!flags.length) return null;
  return (
    <ul className={cx('flex flex-col', compact ? 'gap-1' : 'gap-1.5')}>
      {flags.map((f, i) => {
        const Icon = f.severity === 'error' ? CircleAlert : f.severity === 'warning' ? AlertTriangle : Info;
        return (
          <li
            key={`${f.code}-${i}`}
            className={cx(
              'flex items-start gap-1.5 text-[11px] sm:text-xs',
              f.severity === 'error' ? 'font-medium text-[var(--tt-danger)]' : f.severity === 'warning' ? 'text-fg' : 'text-fg-muted'
            )}
          >
            <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{f.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function FlagCount({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-strong px-1.5 py-0.5 text-[10px] font-semibold text-fg sm:text-[11px]">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {count} {count === 1 ? 'flag' : 'flags'}
    </span>
  );
}
