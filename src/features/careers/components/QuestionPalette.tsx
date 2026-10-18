'use client';

import { Flag } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { QUESTION_STATE_LABEL, type QuestionState } from '../utils/testStatus';

const LEGEND_ORDER: QuestionState[] = ['answered', 'not_answered', 'not_visited', 'marked', 'answered_marked'];

const tile: Record<QuestionState, string> = {
  answered: 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]',
  answered_marked: 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]',
  not_answered: 'border-[var(--tt-danger)] bg-surface text-[var(--tt-danger)]',
  marked: 'border-dashed border-[var(--tt-primary)] bg-surface text-fg',
  not_visited: 'border-line bg-surface text-fg-muted',
};

function FlagBadge({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full border border-line bg-surface text-fg',
        small ? 'h-3.5 w-3.5' : 'h-4 w-4'
      )}
    >
      <Flag className={small ? 'h-2 w-2' : 'h-2.5 w-2.5'} fill="currentColor" />
    </span>
  );
}

/** A palette tile; also used in the legend and the end-test summary. */
export function StateTile({ state, label, size = 'md' }: { state: QuestionState; label: React.ReactNode; size?: 'sm' | 'md' }) {
  const marked = state === 'marked' || state === 'answered_marked';
  return (
    <span
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center rounded-[var(--tt-radius-sm)] border font-semibold tabular-nums',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-10 w-full text-sm',
        tile[state]
      )}
    >
      {label}
      {marked && <FlagBadge small={size === 'sm'} />}
    </span>
  );
}

export function PaletteLegend({ counts }: { counts: Record<QuestionState, number> }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
      {LEGEND_ORDER.map((s) => (
        <li key={s} className="flex items-center gap-2.5">
          <StateTile state={s} label={counts[s]} size="sm" />
          <span className="text-xs leading-tight text-fg-muted">{QUESTION_STATE_LABEL[s]}</span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  states: QuestionState[];
  current: number;
  onSelect: (index: number) => void;
}

/** Numbered question grid. The current question has a ring; colour and flag show its state. */
export function QuestionGrid({ states, current, onSelect }: Props) {
  return (
    <nav aria-label="Questions">
      <ol className="grid grid-cols-5 gap-2.5">
        {states.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={i === current ? 'step' : undefined}
              aria-label={`Question ${i + 1}, ${QUESTION_STATE_LABEL[s].toLowerCase()}`}
              className={cx(
                'block w-full rounded-[var(--tt-radius-sm)] transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)] active:scale-95',
                i === current && 'ring-2 ring-[var(--tt-primary)] ring-offset-2 ring-offset-surface'
              )}
            >
              <StateTile state={s} label={i + 1} />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function countStates(states: QuestionState[]): Record<QuestionState, number> {
  const c: Record<QuestionState, number> = { answered: 0, not_answered: 0, not_visited: 0, marked: 0, answered_marked: 0 };
  states.forEach((s) => (c[s] += 1));
  return c;
}

export function PaletteHint() {
  return <p className={cx(text.caption, 'leading-relaxed')}>Answers on marked questions are still submitted.</p>;
}
