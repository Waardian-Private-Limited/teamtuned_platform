'use client';

import React from 'react';
import { Repeat } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/myLeave.api';
import { EARNED_REASON, EARNED_STATE } from '../constants/leave.constants';
import type { Earned } from '../types/leave.model';
import { daysBetween, daysText, minutesText, shortDate } from '../utils/format';
import { ScrollArea, SectionCard } from './LeaveParts';

/**
 * Comp-off and pay earned by working overtime, a holiday or a week off in the last year: how much,
 * where it stands and when unused comp-off expires. Where the policy lets the employee choose, they
 * can take one as comp-off or as pay instead.
 */
export function EarnedCard({ earned, today, onChanged }: { earned: Earned[]; today: string; onChanged: () => void }) {
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const choose = async (g: Earned) => {
    const as = g.kind === 'comp_off' ? 'paid' : 'comp_off';
    setBusyId(g.id);
    try {
      await api.chooseEarned(g.id, as);
      showSuccess(as === 'paid' ? 'Will be paid instead' : 'Taken as comp-off instead');
      onChanged();
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SectionCard title="Comp-off & overtime" action={<span className="text-xs text-fg-muted">Last 12 months</span>}>
      {earned.length === 0 ? (
        <p className="px-4 py-6 text-sm text-fg-muted">Extra work on overtime, holidays or week offs shows up here.</p>
      ) : (
        <ScrollArea>
          <ul className="divide-y divide-line">
            {earned.map((g) => {
              const state = EARNED_STATE[g.state] ?? EARNED_STATE.pending;
              const left = g.expiresOn ? daysBetween(today, g.expiresOn) : null;
              const amount = g.kind === 'paid' && g.minutes ? minutesText(g.minutes) : g.units ? daysText(g.units) : g.minutes ? minutesText(g.minutes) : '–';
              return (
                <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{EARNED_REASON[g.reason] ?? 'Extra work'}</p>
                    <p className="text-xs text-fg-muted">
                      {shortDate(g.date)} · {g.kind === 'paid' ? 'Paid' : 'Comp-off'}
                      {g.kind === 'comp_off' && g.expiresOn && (
                        <span className={cx(left !== null && left <= 14 && left >= 0 && 'font-semibold text-amber-700 dark:text-amber-400')}>
                          {' · '}
                          {left !== null && left < 0 ? `expired ${shortDate(g.expiresOn)}` : `expires ${shortDate(g.expiresOn)}${left !== null && left <= 30 ? ` (${left} days)` : ''}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-fg">{amount}</span>
                  <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', state.className)}>{state.label}</span>
                  {g.canChoose && (
                    <button
                      type="button"
                      onClick={() => choose(g)}
                      disabled={busyId === g.id}
                      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-50"
                    >
                      <Repeat className="h-3 w-3" /> {g.kind === 'comp_off' ? 'Take as pay' : 'Take as comp-off'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </SectionCard>
  );
}
