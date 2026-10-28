'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import type { InterviewQuestion, InterviewResponse } from '../types/exits';
import { Card, Skeleton } from './parts';

type Answers = InterviewResponse['answers'];

const SCORE = [1, 2, 3, 4, 5];

function Question({ q, value, disabled, onChange }: { q: InterviewQuestion; value: Answers[string] | undefined; disabled: boolean; onChange: (v: Answers[string]) => void }) {
  const label = <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">{q.label}{q.required && <span className="text-[var(--tt-danger)]"> *</span>}</span>;
  if (q.type === 'text') return <Textarea label={q.label} required={q.required} disabled={disabled} value={String(value ?? '')} maxLength={1000} onChange={(e) => onChange(e.target.value)} />;
  const opts: { v: string | number | boolean; l: string }[] =
    q.type === 'rating' ? SCORE.map((n) => ({ v: n, l: String(n) })) : q.type === 'yes_no' ? [{ v: true, l: 'Yes' }, { v: false, l: 'No' }] : (q.options ?? []).map((o) => (typeof o === 'string' ? { v: o, l: o } : { v: o.value, l: o.label }));
  return (
    <fieldset disabled={disabled}>
      <legend className="contents">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
            className={`min-w-10 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${value === o.v ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'}`}>{o.l}</button>
        ))}
      </div>
      {q.type === 'rating' && <p className="mt-1 text-[11px] text-fg-muted">1 is the lowest, 5 the highest.</p>}
    </fieldset>
  );
}

/** The leaver's own exit interview inside My exit. Answered once; they choose whether their manager may see it. */
export function MyInterviewCard() {
  const [state, setState] = React.useState<{ loading: boolean; error: string | null; data: Awaited<ReturnType<typeof api.myInterview>> | null }>({ loading: true, error: null, data: null });
  const [answers, setAnswers] = React.useState<Answers>({});
  const [hide, setHide] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api.myInterview().then((d) => { setState({ loading: false, error: null, data: d }); if (d.response) { setAnswers(d.response.answers); setHide(d.response.hide_from_manager); } })
      .catch((e) => setState({ loading: false, error: messageOf(e), data: null }));
  }, []);
  React.useEffect(load, [load]);

  const { data } = state;
  if (state.loading) return <Card title="Exit interview"><Skeleton className="h-20" /></Card>;
  if (state.error || !data || data.form.questions.length === 0) return state.error ? <Card title="Exit interview"><Alert message={state.error} /></Card> : null;
  const done = Boolean(data.response);

  const submit = async () => {
    const missing = data.form.questions.find((q) => q.required && (answers[q.id] === undefined || answers[q.id] === '' || answers[q.id] === null));
    if (missing) { setErr(`Please answer: ${missing.label}`); return; }
    setBusy(true);
    try { await api.submitMyInterview({ answers, hide_from_manager: hide }); showSuccess('Thank you, your feedback is saved'); setErr(null); load(); } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };

  return (
    <Card title="Exit interview" aside={done ? <span className="text-xs text-fg-muted">Submitted {formatDateTime(data.response?.submitted_at)}</span> : undefined}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">{done ? 'You have already shared your feedback.' : 'Tell us honestly how it was. It helps us improve.'}</p>
        {err && <Alert message={err} />}
        {data.form.questions.map((q) => <Question key={q.id} q={q} value={answers[q.id]} disabled={done} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />)}
        <label className="flex items-start gap-2 text-sm text-fg">
          <input type="checkbox" checked={hide} disabled={done} onChange={(e) => setHide(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>Keep my answers private from my manager</span>
        </label>
        {!done && <Btn variant="primary" busy={busy} onClick={submit}>Submit feedback</Btn>}
      </div>
    </Card>
  );
}

/** Interview answers on the case detail. The server withholds them from the manager when the leaver asked for that. */
export function InterviewAnswersPanel({ questions, response }: { questions: InterviewQuestion[]; response: InterviewResponse | null | undefined }) {
  if (!response) return <p className="text-sm text-fg-muted">No exit interview submitted yet.</p>;
  if (response.hidden) return <p className="text-sm text-fg-muted">The employee chose to keep their answers private from the manager.</p>;
  const label = (q: InterviewQuestion) => q.label;
  const show = (v: Answers[string] | undefined) => (v === true ? 'Yes' : v === false ? 'No' : v === undefined || v === null || v === '' ? 'No answer' : String(v));
  const rows = questions.length ? questions : Object.keys(response.answers).map((id) => ({ id, label: id, type: 'text' as const }));
  return (
    <div className="space-y-3">
      {response.hide_from_manager && <p className="text-xs font-medium text-[var(--tt-warning)]">Hidden from the manager, visible to HR only.</p>}
      <dl className="space-y-3">
        {rows.map((q) => (
          <div key={q.id}>
            <dt className="text-xs text-fg-muted">{label(q)}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm font-semibold text-fg">{show(response.answers[q.id])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
