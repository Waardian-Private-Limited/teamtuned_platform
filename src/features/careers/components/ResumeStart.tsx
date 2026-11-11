'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { TunerIcon } from '@/features/data-collection/components/shared/TunerIcon';
import { RESUME_ACCEPT, type PrefillState } from '../hooks/useApplyForm';

// What Tuner says while it reads, one line at a time.
const STEPS = [
  'Tuner is reading your resume…',
  'Picking out your contact details…',
  'Working out your experience…',
  'Matching it to this role’s questions…',
  'Filling in the form…',
];

function ReadingLines() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-w-0 flex-1">
      <p key={i} className="tt-fade-in text-sm font-semibold text-fg" aria-live="polite">{STEPS[i]}</p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <div className="h-full rounded-full bg-[var(--tt-primary)] transition-[width] duration-1000 ease-out" style={{ width: `${((i + 1) / STEPS.length) * 92}%` }} />
      </div>
    </div>
  );
}

/**
 * Step one of applying: the resume. Choosing it starts Tuner, which reads it and fills the form below; the applicant
 * checks and submits. They can also skip and type everything. When the job does not ask for a resume, the file is
 * only read, never sent.
 */
export function ResumeStart({ file, state, filledCount, mode, error, onFile, onRemove, onSkip }: {
  file: File | null;
  state: PrefillState;
  filledCount: number;
  /** The job's resume setting: off means read-only, used just to fill the form. */
  mode: 'off' | 'optional' | 'required';
  error?: string;
  onFile: (f: File) => void;
  onRemove: () => void;
  onSkip: () => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const pick = () => inputRef.current?.click();

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept={RESUME_ACCEPT}
      className="sr-only"
      aria-invalid={error ? true : undefined}
      aria-describedby={`${id}-msg`}
      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
    />
  );

  // Before a file: one big, friendly drop zone.
  if (!file) {
    return (
      <section aria-labelledby={`${id}-title`}>
        {input}
        <label
          htmlFor={id}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          className={cx(
            'group relative flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-[var(--tt-radius-lg)] border-2 border-dashed px-5 py-9 text-center transition-all sm:py-11',
            'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--tt-ring)]',
            dragging ? 'scale-[1.01] border-fg bg-bg-subtle' : error ? 'border-[var(--tt-danger)]' : 'border-line-strong hover:border-fg/50 hover:bg-bg-subtle/60'
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface shadow-[var(--tt-shadow-md)] transition-transform group-hover:-translate-y-0.5">
            <TunerIcon className="h-9 w-9" />
          </span>
          <span id={`${id}-title`} className="text-lg font-bold tracking-tight text-fg">Start with your resume</span>
          <span className="max-w-sm text-sm text-fg-muted">Upload it and Tuner fills in the form for you. You check everything before you send it.</span>
          <span className="mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-bg">
            <Upload className="h-4 w-4" aria-hidden="true" />Choose your resume
          </span>
          <span className="text-xs text-fg-subtle">PDF or Word, up to 5 MB{mode === 'required' ? ' · required' : ''}</span>
        </label>
        <p id={`${id}-msg`} role={error ? 'alert' : undefined} className={cx('mt-2 text-center', error ? text.error : text.caption)}>
          {error || (
            <button type="button" onClick={onSkip} className="font-semibold text-fg underline-offset-4 hover:underline">
              {mode === 'required' ? 'Fill in the form myself (resume still needed)' : 'Fill in the form myself'}
            </button>
          )}
        </p>
      </section>
    );
  }

  const reading = state === 'reading';
  return (
    <section aria-live="polite" className={cx('relative overflow-hidden rounded-[var(--tt-radius-lg)] border p-4 sm:p-5', reading && 'tt-scan', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
      {input}
      <div className="flex items-start gap-3 sm:gap-4">
        <span className={cx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          reading ? 'animate-pulse border border-line bg-surface' : 'bg-bg-subtle text-fg'
        )}>
          {reading ? <TunerIcon className="h-7 w-7" /> : state === 'filled' ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
        </span>

        {reading ? (
          <ReadingLines />
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">
              {state === 'filled'
                ? `Tuner filled ${filledCount} ${filledCount === 1 ? 'field' : 'fields'} from your resume`
                : state === 'failed'
                  ? 'Tuner could not read it right now'
                  : 'Resume attached'}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {state === 'filled'
                ? 'Check them below and fill in anything missing.'
                : state === 'failed'
                  ? (mode === 'off' ? 'Please fill in the form below.' : 'Please fill in the form below; your resume is still attached.')
                  : state === 'nothing'
                    ? 'Fill in the form below.'
                    : ''}
            </p>
            <div className="mt-3 flex min-w-0 items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-fg">{file.name}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-fg-subtle">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            {mode === 'off' && <p className="mt-2 text-[11px] text-fg-subtle">This role does not ask for a resume, so it was only read to fill the form and is not sent.</p>}
          </div>
        )}

        {!reading && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={pick} className="rounded-full px-3 py-1.5 text-xs font-semibold text-fg hover:bg-bg-subtle">Replace</button>
            <button type="button" onClick={onRemove} aria-label="Remove resume" className="rounded-full p-1.5 text-fg-subtle hover:bg-bg-subtle hover:text-fg"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      {error && <p role="alert" className={cx(text.error, 'mt-3')}>{error}</p>}
      {reading && (
        <button type="button" onClick={onSkip} className="mt-3 text-xs font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline">
          Skip and fill in myself
        </button>
      )}
    </section>
  );
}
