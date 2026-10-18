'use client';

import { Eraser, Flag } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import type { TestAnswers, TestQuestion } from '../types/careers.types';
import { isAnswered } from '../utils/testStatus';

export type TextHandlers = {
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
};

interface Props {
  q: TestQuestion;
  index: number;
  total: number;
  value: TestAnswers[string] | undefined;
  onChange: (v: number[] | string) => void;
  marked: boolean;
  onToggleMark: () => void;
  onClear: () => void;
  /** Copy & paste blocked: question text cannot be selected. */
  protect: boolean;
  textHandlers: TextHandlers;
}

const typeLabel = { multiple: 'Select all that apply', single: 'Select one', text: 'Written answer' } as const;

/** One question on the test portal: number, type, marks, mark-for-review, clear, then the answer. */
export function QuestionView({ q, index, total, value, onChange, marked, onToggleMark, onClear, protect, textHandlers }: Props) {
  const selected = Array.isArray(value) ? value : [];
  const headingId = `q-${q.id}-title`;
  const answered = isAnswered(value);

  return (
    <section aria-labelledby={headingId} className={cx(protect && 'select-none')}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line pb-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-fg">
            Question {index + 1} <span className="font-medium text-fg-subtle">of {total}</span>
          </p>
          <p className={cx(text.caption, 'mt-0.5')}>
            {typeLabel[q.type]}
            {q.marks ? ` · ${q.marks} mark${q.marks === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClear}
            disabled={!answered}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--tt-radius-sm)] px-2.5 text-xs font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)] disabled:pointer-events-none disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" aria-hidden="true" /> Clear response
          </button>
          <button
            type="button"
            onClick={onToggleMark}
            aria-pressed={marked}
            className={cx(
              'inline-flex h-9 items-center gap-1.5 rounded-[var(--tt-radius-sm)] border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)]',
              marked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong text-fg hover:bg-bg-subtle'
            )}
          >
            <Flag className="h-4 w-4" aria-hidden="true" fill={marked ? 'currentColor' : 'none'} />
            {marked ? 'Marked for review' : 'Mark for review'}
          </button>
        </div>
      </div>

      <h2 id={headingId} className="mt-6 whitespace-pre-wrap break-words text-lg font-semibold leading-relaxed text-fg sm:text-xl">
        {q.prompt}
      </h2>

      {q.type === 'text' ? (
        <div className="mt-6">
          <label htmlFor={`q-${q.id}-text`} className="sr-only">Your answer</label>
          <textarea
            id={`q-${q.id}-text`}
            rows={10}
            maxLength={10000}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={textHandlers.onKeyDown}
            onPaste={textHandlers.onPaste}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Type your answer"
            className="w-full select-text resize-y rounded-[var(--tt-radius-control)] border border-line bg-surface px-4 py-3 text-base leading-relaxed text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-[var(--tt-primary)] focus:ring-4 focus:ring-[var(--tt-ring)]"
          />
          <p className={cx(text.caption, 'mt-1.5 text-right tabular-nums')}>{typeof value === 'string' ? value.length : 0} / 10000</p>
        </div>
      ) : (
        <fieldset className="mt-6">
          <legend className="sr-only">{q.type === 'multiple' ? 'Choose all that apply' : 'Choose one answer'}</legend>
          <div className="grid gap-2.5">
            {q.options.map((opt, i) => {
              const checked = selected.includes(i);
              return (
                <label
                  key={i}
                  className={cx(
                    'flex cursor-pointer items-start gap-3 rounded-[var(--tt-radius-control)] border px-4 py-3.5 text-[15px] leading-relaxed transition-colors',
                    'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--tt-ring)]',
                    checked ? 'border-[var(--tt-primary)] bg-bg-subtle text-fg' : 'border-line text-fg hover:border-line-strong'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--tt-radius-sm)] border text-xs font-bold',
                      checked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong text-fg-muted'
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                    name={`q-${q.id}`}
                    checked={checked}
                    onChange={() => {
                      if (q.type === 'multiple') onChange(checked ? selected.filter((x) => x !== i) : [...selected, i].sort((a, b) => a - b));
                      else onChange([i]);
                    }}
                    className="sr-only"
                  />
                  <span className="min-w-0 whitespace-pre-wrap break-words pt-0.5">{opt}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </section>
  );
}
