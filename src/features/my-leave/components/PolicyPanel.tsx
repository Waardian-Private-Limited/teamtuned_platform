'use client';

import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { LeaveType } from '../types/leave.model';
import { policySections } from '../utils/policyText';
import { ScrollArea, SectionCard, TypeDot } from './LeaveParts';

/** The rules of each leave type in plain words, one row per type; every row starts closed. */
export function PolicyPanel({ types }: { types: LeaveType[] }) {
  const [open, setOpen] = React.useState<Set<number>>(() => new Set());
  if (!types.length) return null;
  const toggle = (id: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <SectionCard title="Leave policy">
      <ScrollArea>
        <ul className="divide-y divide-line">
          {types.map((t) => {
            const expanded = open.has(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`leave-policy-${t.id}`}
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-bg-subtle/60"
                >
                  <TypeDot color={t.color} className="h-2.5 w-2.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{t.name}</span>
                  {!t.isPaid && <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted">Unpaid</span>}
                  <ChevronDown aria-hidden className={cx('h-4 w-4 shrink-0 text-fg-muted transition-transform', expanded && 'rotate-180')} />
                </button>
                {expanded && (
                  <div id={`leave-policy-${t.id}`} className="grid gap-x-6 gap-y-4 px-4 pb-4 sm:grid-cols-2">
                    {policySections(t.policy).map((s) => (
                      <div key={s.title} className="min-w-0">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{s.title}</h3>
                        <ul className="mt-1.5 space-y-1">
                          {s.lines.map((l) => (
                            <li key={l} className="flex gap-2 text-sm text-fg">
                              <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-primary)]" />
                              <span className="min-w-0">{l}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </SectionCard>
  );
}
