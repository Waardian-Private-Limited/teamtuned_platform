'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { PayLine } from '../../types/payrollRuns.model';
import { money } from '../../utils/format';
import { SectionCard } from './controls';

function Line({ line }: { line: PayLine }) {
  const [open, setOpen] = React.useState(false);
  const expandable = line.steps.length > 0;
  return (
    <li>
      <button
        type="button"
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cx('flex w-full items-center gap-2 px-4 py-2.5 text-left', expandable ? 'transition-colors hover:bg-bg-subtle/60' : 'cursor-default')}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm text-fg">{line.label}</span>
          {line.badge && (
            <span className="shrink-0 rounded border border-line px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{line.badge}</span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{money(line.amount, true)}</span>
        <ChevronDown aria-hidden className={cx('h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform duration-150', open && 'rotate-180', !expandable && 'invisible')} />
      </button>
      {expandable && open && (
        <div className="tt-fade-in mx-4 mb-2.5 rounded-lg border border-line bg-bg-subtle/60 px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">How it was calculated</p>
          <dl className="space-y-0.5">
            {line.steps.map((s, i) => (
              <div key={`${s.step}-${i}`} className="flex justify-between gap-4 text-xs">
                <dt className="text-fg-muted">{s.step}</dt>
                <dd className="font-semibold tabular-nums text-fg">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </li>
  );
}

export function LinesTable({ title, lines, total, empty }: { title: string; lines: PayLine[]; total: number; empty: string }) {
  return (
    <SectionCard title={title} aside={<span className="text-sm font-bold tabular-nums text-fg">{money(total, true)}</span>}>
      {lines.length === 0 ? (
        <p className="px-4 py-5 text-center text-xs text-fg-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {lines.map((l) => (
            <Line key={l.key} line={l} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
