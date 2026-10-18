'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Eye, Flag, LayoutGrid, Maximize, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { button, cx, heading, text } from '@/theme/tokens';
import type { useAssessment } from '../hooks/useAssessment';
import { fullscreenSupported, requestFullscreen } from '../hooks/useTestMonitor';
import { formatDuration } from '../utils/format';
import { questionState } from '../utils/testStatus';
import { EndTestDialog } from './EndTestDialog';
import { CompanyMark } from './PublicShell';
import { PaletteLegend, QuestionGrid, countStates } from './QuestionPalette';
import { QuestionView } from './QuestionView';

type Vm = ReturnType<typeof useAssessment>;

/**
 * The running test, laid out like an exam portal: a top bar with the timer and End test,
 * one question at a time with Previous / Mark for review & next / Save & next, and a
 * question palette (answered, not answered, not visited, marked) beside it — in a sheet
 * on small screens. End test opens a summary before the final submit.
 */
export function TestPortal({ vm }: { vm: Vm }) {
  const [current, setCurrent] = useState(0);
  const [endOpen, setEndOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const { questions, answers, flags, visit, toggleMark, clearAnswer, setAnswer } = vm;
  const { setActiveQuestion, notice, dismissNotice, isFullscreen, textHandlers } = vm.monitor;
  const total = questions.length;
  const q = questions[current];
  const company = vm.info?.company ?? null;
  const submitting = vm.phase === 'submitting';

  const states = useMemo(
    () => questions.map((qq) => questionState(answers[qq.id], flags.visited.includes(qq.id), flags.marked.includes(qq.id))),
    [questions, answers, flags]
  );
  const counts = countStates(states);

  // Opening a question marks it visited and tells the monitor which question is on screen.
  const qid = q?.id ?? null;
  useEffect(() => {
    if (qid) visit(qid);
    setActiveQuestion(vm.phase === 'running' ? qid : null);
  }, [qid, vm.phase, visit, setActiveQuestion]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(dismissNotice, 6000);
    return () => window.clearTimeout(id);
  }, [notice, dismissNotice]);

  // A failed submit comes back as "running" with an error: keep the summary open to show it.
  useEffect(() => {
    if (vm.phase !== 'running' && vm.phase !== 'submitting') setEndOpen(false);
  }, [vm.phase]);

  const goTo = (i: number) => {
    setCurrent(Math.min(Math.max(0, i), total - 1));
    setPaletteOpen(false);
    scroller.current?.scrollTo({ top: 0 });
  };
  const isLast = current >= total - 1;
  const next = () => (isLast ? setEndOpen(true) : goTo(current + 1));
  const markAndNext = () => {
    if (q && !flags.marked.includes(q.id)) toggleMark(q.id);
    next();
  };

  const remaining = vm.remaining;
  const low = remaining !== null && remaining <= 60;
  const warn = remaining !== null && remaining <= 300;
  const answered = counts.answered + counts.answered_marked;
  const needFullscreen = vm.phase === 'running' && vm.proctoring.requireFullscreen && fullscreenSupported() && !isFullscreen;

  const palette = (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-4">
        <p className={text.overline}>Question palette</p>
        <div className="mt-3">
          <PaletteLegend counts={counts} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <QuestionGrid states={states} current={current} onSelect={goTo} />
      </div>
      <div className="border-t border-line p-4">
        <button type="button" onClick={() => { setPaletteOpen(false); setEndOpen(true); }} className={cx(button.primary, '!h-11')}>
          End test
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      {/* Printing the test shows nothing. */}
      <style>{'@media print { body { visibility: hidden !important; } }'}</style>

      <header className="shrink-0 border-b border-line bg-surface">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
          {company && <CompanyMark company={company} size={32} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-fg">{vm.info?.testName}</p>
            <p className="truncate text-xs text-fg-muted">
              {vm.info?.positionTitle ? `${vm.info.positionTitle} · ` : ''}
              {answered} of {total} answered
            </p>
          </div>
          {remaining !== null && (
            <div
              role="timer"
              aria-live={low ? 'assertive' : 'off'}
              aria-label={`Time left ${formatDuration(remaining)}`}
              className={cx(
                'flex shrink-0 items-center gap-1.5 rounded-[var(--tt-radius-sm)] px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums sm:px-3',
                low ? 'bg-[var(--tt-danger)] text-white' : warn ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border border-line-strong text-fg'
              )}
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatDuration(remaining)}
            </div>
          )}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Question palette"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tt-radius-sm)] border border-line-strong text-fg hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)] lg:hidden"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setEndOpen(true)}
            className="hidden h-9 shrink-0 items-center rounded-[var(--tt-radius-sm)] border border-line-strong px-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)] sm:inline-flex"
          >
            End test
          </button>
        </div>
        <div className="h-1 bg-bg-subtle" aria-hidden="true">
          <div className="h-full bg-[var(--tt-primary)] transition-all" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
              {q && (
                <QuestionView
                  key={q.id}
                  q={q}
                  index={current}
                  total={total}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                  marked={flags.marked.includes(q.id)}
                  onToggleMark={() => toggleMark(q.id)}
                  onClear={() => clearAnswer(q.id)}
                  protect={vm.proctoring.blockCopyPaste}
                  textHandlers={textHandlers(q.id)}
                />
              )}
              {vm.error && !endOpen && <p role="alert" className={cx(text.error, 'mt-4 text-sm')}>{vm.error}</p>}
            </div>
          </div>

          <footer className="shrink-0 border-t border-line bg-surface px-3 py-3 sm:px-5">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
              <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} aria-label="Previous question" className={cx(button.secondary, '!h-11 !w-auto !px-3 sm:!px-4')}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Previous</span>
              </button>
              <div className="flex-1" />
              <button type="button" onClick={markAndNext} className={cx(button.secondary, '!h-11 !w-auto !px-3 sm:!px-4')}>
                <Flag className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Mark for review &amp; {isLast ? 'finish' : 'next'}</span>
                <span className="sm:hidden">Mark</span>
              </button>
              <button type="button" onClick={next} className={cx(button.primary, '!h-11 !w-auto !px-4 sm:!px-5')}>
                {isLast ? 'Save & finish' : 'Save & next'} <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </footer>
        </main>

        <aside aria-label="Question palette" className="hidden w-[300px] shrink-0 border-l border-line bg-surface lg:block">
          {palette}
        </aside>
      </div>

      <Dialog open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Questions" maxWidthClassName="max-w-sm">
        <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-5">{palette}</div>
      </Dialog>

      <EndTestDialog
        open={endOpen}
        states={states}
        remaining={remaining}
        submitting={submitting}
        error={vm.error}
        onClose={() => setEndOpen(false)}
        onGoTo={(i) => {
          setEndOpen(false);
          goTo(i);
        }}
        onSubmit={vm.submit}
      />

      {/* Notices: tab switch recorded, copy/paste blocked. */}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
        {notice && (
          <div key={notice.id} className="pointer-events-auto flex max-w-md items-start gap-3 rounded-[var(--tt-radius-md)] border border-line bg-surface px-4 py-3 text-sm text-fg shadow-lg">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
            <p className="min-w-0 flex-1 leading-relaxed">{notice.text}</p>
            <button type="button" onClick={dismissNotice} aria-label="Dismiss" className="-mr-1 rounded p-0.5 text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-ring)]">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {needFullscreen && <FullscreenGate remaining={remaining} />}
    </div>
  );
}

/** Blocks the test while it is not in full screen (when the test requires it). */
function FullscreenGate({ remaining }: { remaining: number | null }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus();
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="fs-gate-title" aria-describedby="fs-gate-desc" className="fixed inset-0 z-[70] flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line">
          <Maximize className="h-5 w-5 text-fg" aria-hidden="true" />
        </span>
        <h2 id="fs-gate-title" className={cx(heading.sm, 'mt-5')}>Return to full screen</h2>
        <p id="fs-gate-desc" className={cx(text.body, 'mt-2')}>
          This test must be taken in full screen. Leaving full screen has been recorded. The timer keeps running.
        </p>
        {remaining !== null && (
          <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums text-fg">
            <Clock className="h-4 w-4" aria-hidden="true" /> {formatDuration(remaining)} left
          </p>
        )}
        <div className="mt-6">
          <button ref={btnRef} type="button" onClick={requestFullscreen} className={cx(button.primary, '!h-11 !w-full')}>
            <Maximize className="h-4 w-4" aria-hidden="true" /> Return to full screen
          </button>
        </div>
      </div>
    </div>
  );
}
