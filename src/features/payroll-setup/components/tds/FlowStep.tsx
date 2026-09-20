'use client';

import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { StatusPill } from '@/components/ui/StatusPill';

export type StepStatus = 'done' | 'attention' | 'pending';

const STATUS_META: Record<StepStatus, { label: string; tone: 'active' | 'inactive' | 'neutral' }> = {
  done: { label: 'Done', tone: 'active' },
  attention: { label: 'Needs attention', tone: 'inactive' },
  pending: { label: 'Not started', tone: 'neutral' },
};

interface FlowStepProps {
  index: number;
  title: string;
  /** One or two plain-English lines: what this step is and why it matters. */
  intent: string;
  status: StepStatus;
  /** Short state summary shown on the collapsed header, e.g. "12 of 14 employees". */
  summary?: string;
  children: React.ReactNode;
}

/**
 * One numbered step in the TDS setup sequence.
 *
 * Steps that still need work open by default and completed ones collapse, so the page
 * shortens as the org works through it and what remains is what is left to do.
 */
export function FlowStep({ index, title, intent, status, summary, children }: FlowStepProps) {
  const [openOverride, setOpenOverride] = React.useState<boolean | null>(null);
  const isOpen = openOverride ?? status !== 'done';
  const meta = STATUS_META[status];
  const bodyId = `tds-step-${index}`;

  return (
    <section
      className={cx(
        'rounded-xl border bg-surface shadow-xs transition-colors',
        status === 'attention' ? 'border-[var(--tt-danger)]/40' : 'border-line'
      )}
    >
      <button
        type="button"
        onClick={() => setOpenOverride(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        className="flex w-full items-start gap-3 p-3.5 text-left sm:p-4"
      >
        <span
          className={cx(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
            status === 'done'
              ? 'border-[var(--tt-success)] bg-[var(--tt-success)] text-[var(--tt-on-primary)]'
              : 'border-line-strong bg-bg-subtle text-fg-muted'
          )}
        >
          {status === 'done' ? <Check className="h-3.5 w-3.5" /> : index}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-fg">{title}</span>
            <StatusPill label={meta.label} tone={meta.tone} />
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-fg-muted sm:text-xs">{intent}</span>
          {summary && !isOpen && (
            <span className="mt-1 block text-[11px] font-medium text-fg">{summary}</span>
          )}
        </span>

        <ChevronDown
          className={cx(
            'mt-1 h-4 w-4 shrink-0 text-fg-subtle transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div id={bodyId} className="border-t border-line px-3.5 pb-4 pt-3.5 sm:px-4">
          {children}
        </div>
      )}
    </section>
  );
}
