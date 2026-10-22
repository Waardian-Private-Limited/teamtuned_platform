'use client';

import React from 'react';
import { PublicShell, StatusScreen } from '@/features/careers/components/PublicShell';
import { Textarea } from '@/components/ui/Textarea';
import * as api from '../api/publicFeedback.api';
import type { PublicFeedbackForm } from '../types/perf.types';
import { Btn } from './ui';

const RATINGS = [1, 2, 3, 4, 5];
type Done = 'sent' | 'declined' | null;

/** The 360 form an outside reviewer (client, partner, vendor) opens from the emailed link. No login: the link is the key. */
export function PublicFeedbackPage({ token }: { token: string }) {
  const [form, setForm] = React.useState<PublicFeedbackForm | null>(null);
  const [failure, setFailure] = React.useState<{ status: number; message: string } | null>(null);
  const [ratings, setRatings] = React.useState<Record<number, number>>({});
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<Done>(null);

  React.useEffect(() => {
    api.getForm(token).then((f) => { setForm(f); setAnswers(f.questions.map(() => '')); })
      .catch((e: api.PublicFeedbackError) => setFailure({ status: e.status, message: e.message }));
  }, [token]);

  const send = async () => {
    if (!form) return;
    const missing = form.competencies.filter((c) => !ratings[c.id]);
    if (missing.length) { setErrors({ ratings: 'Rate every skill from 1 to 5' }); return; }
    setBusy(true); setErrors({});
    try { await api.answer(token, { ratings, answers }); setDone('sent'); } catch (e) {
      const err = e as api.PublicFeedbackError;
      setErrors({ form: err.message, ...(err.errors || {}) });
    } finally { setBusy(false); }
  };
  const turnDown = async () => {
    setBusy(true);
    try { await api.decline(token); setDone('declined'); } catch (e) { setErrors({ form: (e as Error).message }); } finally { setBusy(false); }
  };

  const company = form ? { name: form.company, logoUrl: null } : null;
  if (failure) {
    return (
      <PublicShell width="narrow">
        <StatusScreen title={failure.status === 410 ? 'This link has expired' : failure.status === 404 ? 'This link does not work' : 'Something went wrong'}
          description={failure.status === 404 ? 'It may already have been used, or a newer link was sent. Ask the person who wrote to you for a new one.' : failure.message} />
      </PublicShell>
    );
  }
  if (!form) return <PublicShell width="narrow"><div className="h-64 animate-pulse rounded-xl bg-bg-subtle" /></PublicShell>;
  if (done || !form.open) {
    return (
      <PublicShell company={company} width="narrow">
        <StatusScreen illustration="teams"
          title={done === 'declined' ? 'Thanks for letting us know' : done === 'sent' || form.status === 'submitted' ? 'Thank you, your feedback was sent' : 'This feedback is closed'}
          description={done === 'declined' ? `${form.company} will not count on your answer.` : done === 'sent' ? `It helps ${form.subject_name}'s review. You can close this page.` : 'Nothing more is needed from you.'} />
      </PublicShell>
    );
  }

  return (
    <PublicShell company={company} width="narrow">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">Feedback on {form.subject_name}</h1>
          <p className="text-sm text-fg-muted">Hi {form.reviewer_name.split(' ')[0]}, {form.company} would value your view as part of the {form.cycle_name} review. {form.anonymous ? 'Your answers are shown together with other people’s, without your name.' : 'Your name is shown with your answers.'}</p>
        </div>

        <section className="space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-fg">Rate each skill <span className="font-normal text-fg-muted">· 1 needs a lot of improvement, 5 is outstanding</span></p>
          {form.competencies.map((c) => (
            <div key={c.id} className="space-y-2 border-t border-line/60 pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-semibold text-fg">{c.name}</p>
              {c.description && <p className="text-xs text-fg-muted">{c.description}</p>}
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={c.name}>
                {RATINGS.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={ratings[c.id] === n} onClick={() => { setRatings({ ...ratings, [c.id]: n }); setErrors({}); }}
                    className={`h-10 w-10 rounded-lg border text-sm font-semibold transition-colors ${ratings[c.id] === n ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : `${errors.ratings && !ratings[c.id] ? 'border-[var(--tt-danger)]' : 'border-line'} bg-surface text-fg hover:bg-bg-subtle`}`}>
                    {n}
                  </button>
                ))}
              </div>
              {ratings[c.id] && c.levels?.find((l) => l.level === ratings[c.id]) && <p className="text-[11px] text-fg-muted">{c.levels.find((l) => l.level === ratings[c.id])?.descriptor}</p>}
            </div>
          ))}
          {errors.ratings && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.ratings}</p>}
        </section>

        {form.questions.length > 0 && (
          <section className="space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
            {form.questions.map((q, i) => <Textarea key={q} label={q} rows={3} maxLength={2000} value={answers[i] || ''} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} />)}
          </section>
        )}

        {errors.form && <p role="alert" className="text-sm text-[var(--tt-danger)]">{errors.form}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Btn variant="ghost" disabled={busy} onClick={turnDown}>I cannot give feedback</Btn>
          <Btn loading={busy} onClick={send}>Send feedback</Btn>
        </div>
      </div>
    </PublicShell>
  );
}
