'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { button, cx, text } from '@/theme/tokens';
import { formatDuration } from '../utils/format';
import type { QuestionState } from '../utils/testStatus';
import { StateTile, countStates } from './QuestionPalette';

interface Props {
  open: boolean;
  states: QuestionState[];
  remaining: number | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onGoTo: (index: number) => void;
  onSubmit: () => void;
}

function QuestionLinks({ title, hint, indexes, states, onGoTo }: { title: string; hint?: string; indexes: number[]; states: QuestionState[]; onGoTo: (i: number) => void }) {
  if (!indexes.length) return null;
  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold text-fg">
        {title} <span className="font-medium text-fg-subtle">({indexes.length})</span>
      </h3>
      {hint && <p className={cx(text.caption, 'mt-0.5')}>{hint}</p>}
      <ul className="mt-2.5 flex flex-wrap gap-2.5">
        {indexes.map((i) => (
          <li key={i} className="w-10">
            <button
              type="button"
              onClick={() => onGoTo(i)}
              aria-label={`Go to question ${i + 1}`}
              className="block w-full rounded-[var(--tt-radius-sm)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)]"
            >
              <StateTile state={states[i]} label={i + 1} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * End test: the exam-portal summary before submitting. Shows answered / not answered /
 * not visited / marked counts, lets the candidate jump back to marked or empty questions,
 * and asks them to confirm that submitting is final.
 */
export function EndTestDialog({ open, states, remaining, submitting, error, onClose, onGoTo, onSubmit }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  const c = countStates(states);
  const marked = states.flatMap((s, i) => (s === 'marked' || s === 'answered_marked' ? [i] : []));
  const empty = states.flatMap((s, i) => (s === 'not_answered' || s === 'not_visited' || s === 'marked' ? [i] : []));
  const answered = c.answered + c.answered_marked;
  const tiles = [
    { label: 'Answered', value: answered },
    { label: 'Not answered', value: c.not_answered + c.marked },
    { label: 'Not visited', value: c.not_visited },
    { label: 'Marked for review', value: marked.length },
  ];

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      title="End test"
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className={cx(button.secondary, '!h-11 !w-auto !px-5')}>
            Back to test
          </button>
          <Button onClick={onSubmit} disabled={!confirmed} loading={submitting} loadingLabel="Submitting…" className="!h-11 !w-auto !px-5">
            Submit test
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className={text.body}>
          {states.length} question{states.length === 1 ? '' : 's'} in this test.
        </p>
        {remaining !== null && (
          <p className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums text-fg">
            <Clock className="h-4 w-4" aria-hidden="true" /> {formatDuration(remaining)} left
          </p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[var(--tt-radius-md)] border border-line px-3 py-2.5">
            <dt className="text-[11px] leading-tight text-fg-muted">{t.label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-fg">{t.value}</dd>
          </div>
        ))}
      </dl>

      <QuestionLinks
        title="Marked for review"
        hint="You marked these to look at again. Answers on them are submitted as they are."
        indexes={marked}
        states={states}
        onGoTo={onGoTo}
      />
      <QuestionLinks title="Questions without an answer" indexes={empty} states={states} onGoTo={onGoTo} />

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[var(--tt-radius-md)] bg-bg-subtle px-4 py-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tt-primary)]"
        />
        <span className="text-sm leading-relaxed text-fg">I understand that I can submit only once and cannot change my answers afterwards.</span>
      </label>
      {error && <p role="alert" className={cx(text.error, 'mt-3 text-sm')}>{error}</p>}
    </Dialog>
  );
}
