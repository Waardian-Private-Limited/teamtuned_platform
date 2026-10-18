'use client';

import { useState } from 'react';
import { Flag, ListChecks, Timer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cx, heading, text } from '@/theme/tokens';
import { useAssessment } from '../hooks/useAssessment';
import { fullscreenSupported, requestFullscreen } from '../hooks/useTestMonitor';
import type { TestProctoring } from '../types/careers.types';
import { CompanyMark, PublicShell, StatusScreen } from './PublicShell';
import { PaletteLegend } from './QuestionPalette';
import { TestPortal } from './TestPortal';

export function AssessmentPage({ token }: { token: string }) {
  const vm = useAssessment(token);
  const [agreed, setAgreed] = useState(false);
  const company = vm.info?.company ?? null;

  // ---- terminal / load states ----
  if (vm.phase === 'loading') {
    return (
      <PublicShell width="narrow">
        <div className="animate-pulse py-10" aria-busy="true" aria-label="Loading assessment">
          <div className="h-12 w-12 rounded-[var(--tt-radius-md)] bg-bg-subtle" />
          <div className="mt-6 h-8 w-2/3 rounded bg-bg-subtle" />
          <div className="mt-4 h-4 w-1/2 rounded bg-bg-subtle" />
          <div className="mt-10 h-40 rounded-[var(--tt-radius-lg)] bg-bg-subtle" />
        </div>
      </PublicShell>
    );
  }

  const terminal: Partial<Record<typeof vm.phase, { title: string; description: string; illustration?: 'teams' | 'review' }>> = {
    invalid: { title: 'This link is not valid', description: 'Check that you opened the full link from your email. If it still does not work, ask the recruiter to send a new one.' },
    expired: { title: 'This assessment has expired', description: 'The time to take this assessment has passed. Contact the recruiter if you think this is a mistake.' },
    cancelled: { title: 'This assessment is no longer available', description: 'The recruiter has withdrawn this assessment. You do not need to do anything.' },
    error: { title: 'Something went wrong', description: vm.error ?? 'Please reload the page and try again.' },
    submitted: vm.submittedHere
      ? {
          title: 'Assessment submitted',
          illustration: 'teams',
          description:
            vm.autoSubmitted === 'time'
              ? 'Time ran out, so your answers were submitted automatically. The hiring team will be in touch.'
              : vm.autoSubmitted === 'tab_switches'
                ? 'You left the test more often than allowed, so your answers were submitted automatically. The hiring team will be in touch.'
                : vm.autoSubmitted === 'server'
                  ? 'Your assessment was submitted automatically with the answers saved so far. The hiring team will be in touch.'
                  : 'Thank you. Your answers have been submitted and the hiring team will be in touch.',
        }
      : { title: 'You have already submitted this assessment', illustration: 'teams', description: 'Each assessment can be taken once. The hiring team will be in touch.' },
  };
  const t = terminal[vm.phase];
  if (t) {
    return (
      <PublicShell company={company} width="narrow">
        <StatusScreen illustration={t.illustration ?? 'review'} title={t.title} description={t.description} />
      </PublicShell>
    );
  }

  // ---- intro ----
  if (vm.phase === 'intro' || vm.phase === 'starting') {
    const info = vm.info!;
    return (
      <PublicShell company={company} width="narrow">
        <div className="py-2 sm:py-6">
          {company && <CompanyMark company={company} size={48} />}
          <p className={cx(text.overline, 'mt-6')}>Assessment{info.positionTitle ? ` · ${info.positionTitle}` : ''}</p>
          <h1 className={cx(heading.lg, 'mt-2 break-words')}>{info.testName}</h1>
          {company?.name && <p className={cx(text.lead, 'mt-2')}>{company.name}</p>}

          <dl className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--tt-radius-md)] border border-line p-4">
              <dt className="flex items-center gap-2 text-xs text-fg-muted"><Timer className="h-4 w-4" aria-hidden="true" /> Duration</dt>
              <dd className="mt-1 text-xl font-semibold text-fg">{info.durationMinutes} min</dd>
            </div>
            <div className="rounded-[var(--tt-radius-md)] border border-line p-4">
              <dt className="flex items-center gap-2 text-xs text-fg-muted"><ListChecks className="h-4 w-4" aria-hidden="true" /> Questions</dt>
              <dd className="mt-1 text-xl font-semibold text-fg">{info.questionCount || '—'}</dd>
            </div>
          </dl>

          <section className="mt-8 rounded-[var(--tt-radius-lg)] bg-bg-subtle p-5 sm:p-6" aria-labelledby="rules-heading">
            <h2 id="rules-heading" className={heading.sm}>Instructions</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
              <li>You can take this assessment <strong className="text-fg">only once</strong>.</li>
              <li>The timer starts when you press Start test and keeps running even if you close this page.</li>
              <li>Questions are shown one at a time. Use Save &amp; next, Previous, or the question palette to move between them.</li>
              <li>Use <strong className="text-fg">Mark for review</strong> on any question you want to look at again. Answers on marked questions are still submitted.</li>
              <li>Your answers are saved as you go, so a reload will not lose them.</li>
              <li>Press <strong className="text-fg">End test</strong> to see a summary and submit. When time runs out, your answers are submitted automatically.</li>
              <li>Use a stable internet connection and do not switch devices mid-way.</li>
            </ul>
          </section>

          <section className="mt-6 rounded-[var(--tt-radius-lg)] border border-line p-5 sm:p-6" aria-labelledby="palette-heading">
            <h2 id="palette-heading" className={cx(heading.sm, 'flex items-center gap-2')}>
              <Flag className="h-4 w-4" aria-hidden="true" /> Question palette
            </h2>
            <p className={cx(text.body, 'mt-1 mb-4')}>Each question number shows its state:</p>
            <PaletteLegend counts={{ answered: 1, not_answered: 2, not_visited: 3, marked: 4, answered_marked: 5 }} />
          </section>

          <TestRulesPanel proctoring={info.proctoring} />

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[var(--tt-radius-md)] border border-line px-4 py-3.5">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tt-primary)]" />
            <span className="text-sm leading-relaxed text-fg">I have read the instructions and I am ready to start.</span>
          </label>

          <div className="mt-6">
            <Button
              onClick={() => {
                // Full screen needs the click itself (user gesture), before any await.
                if (info.proctoring?.requireFullscreen && fullscreenSupported()) requestFullscreen();
                void vm.start();
              }}
              disabled={!agreed}
              loading={vm.phase === 'starting'}
              loadingLabel="Starting…"
              className="sm:!w-auto sm:min-w-[220px] sm:!px-8"
            >
              Start test
            </Button>
            {vm.error && <p role="alert" className={cx(text.error, 'mt-3 text-sm')}>{vm.error}</p>}
          </div>
        </div>
      </PublicShell>
    );
  }

  // ---- running / submitting ----
  return <TestPortal vm={vm} />;
}

/** The rules of this test that change how it works for the candidate (copy/paste, full screen, leaving). */
function TestRulesPanel({ proctoring }: { proctoring: TestProctoring | null }) {
  if (!proctoring) return null;
  const rules = [
    ...(proctoring.blockCopyPaste ? ['Copy, cut, paste and right-click are turned off.'] : []),
    ...(proctoring.requireFullscreen ? ['The test runs in full screen. If you leave full screen, the test pauses until you return.'] : []),
    ...(proctoring.maxTabSwitches
      ? [`If you leave the test more than ${proctoring.maxTabSwitches} time${proctoring.maxTabSwitches === 1 ? '' : 's'}, it is submitted automatically.`]
      : []),
  ];
  if (!rules.length) return null;
  return (
    <section className="mt-6 rounded-[var(--tt-radius-lg)] border border-line p-5 sm:p-6" aria-labelledby="test-rules-heading">
      <h2 id="test-rules-heading" className={heading.sm}>Rules for this test</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
  );
}
