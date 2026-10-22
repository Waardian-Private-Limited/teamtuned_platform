'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import * as api from '../api/perf.api';
import { RELATION_LABEL } from '../constants/perf.constants';
import type { FeedbackForm, FeedbackToGive } from '../types/perf.types';
import { Btn, PageHead, Panel, Table, td } from './ui';

const RATINGS = [1, 2, 3, 4, 5];

/** People who asked me for feedback about them, and the form to answer. */
export function FeedbackToGivePage() {
  const [items, setItems] = React.useState<FeedbackToGive[] | null>(null);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState<FeedbackForm | null>(null);
  const [ratings, setRatings] = React.useState<Record<number, number | null>>({});
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => { api.feedbackToGive().then((d) => setItems(d.items)).catch((e) => setError(messageOf(e))); }, []);
  React.useEffect(load, [load]);

  const open = async (id: number) => {
    setError('');
    try {
      const f = await api.feedbackForm(id);
      setForm(f); setRatings({}); setAnswers(f.questions.map(() => ''));
    } catch (e) { setError(messageOf(e)); }
  };

  const submit = async () => {
    if (!form) return;
    setBusy(true); setError('');
    try {
      await api.answerFeedback(form.id, { ratings, answers });
      showSuccess('Thank you, your feedback was sent');
      setForm(null); load();
    } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };

  const decline = async () => {
    if (!form) return;
    setBusy(true);
    try { await api.declineFeedback(form.id); setForm(null); load(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Feedback to give" count={items?.length} subtitle="360 feedback asked of you" help={HELP.feedback} />
      <Panel>
        {error && !form && <div className="border-b border-line p-3"><p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p></div>}
        {items === null && !error && <TableSkeleton rows={4} columns={3} />}
        {items?.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <EmptyState illustration={{ src: '/vectors/notifications.svg', width: 220, height: 160, alt: '' }} title="You are all caught up" description="When a colleague's reviewer asks for your 360 feedback, it shows up here." />
          </div>
        )}
        {items && items.length > 0 && (
          <Table minWidth={560} head={[{ label: 'Colleague' }, { label: 'Cycle', className: 'w-48' }, { label: 'Asked as', className: 'w-40' }, { label: 'Actions', className: 'w-36 text-right' }]}>
            {items.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-bg-subtle/50">
                <td className={td}><span className="font-semibold">{r.subject_name}</span></td>
                <td className={`${td} text-fg-muted`}>{r.cycle_name}</td>
                <td className={`${td} text-fg-muted`}>{RELATION_LABEL[r.relation]}</td>
                <td className={`${td} text-right`}><Btn size="sm" onClick={() => open(r.id)}>Give feedback</Btn></td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Dialog open={Boolean(form)} onClose={() => setForm(null)} title={form ? `Feedback about ${form.subject_name}` : ''} maxWidthClassName="max-w-2xl"
        footer={<><Btn type="button" variant="secondary" disabled={busy} onClick={decline}>I cannot give feedback</Btn><Btn type="button" loading={busy} onClick={submit}>Send</Btn></>}>
        {form && (
          <div className="space-y-4">
            <p className="text-xs text-fg-muted">{form.anonymous ? 'Your answers are shown without your name, together with other people\'s.' : 'Your name is shown with your answers.'} Rate each competency from 1 (needs a lot of improvement) to 5 (outstanding).</p>
            {form.competencies.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_8rem]">
                  <div className="pt-2"><p className="text-sm font-semibold text-fg">{c.name}</p>{c.description && <p className="text-[11px] text-fg-muted">{c.description}</p>}</div>
                  <SelectField<number> label="" numeric value={ratings[c.id] ?? null} placeholder="Rate 1 to 5" onChange={(v) => setRatings({ ...ratings, [c.id]: v })} options={RATINGS.map((n) => ({ value: n, label: String(n) }))} />
                </div>
              </div>
            ))}
            {form.questions.map((q, i) => <TextField key={q} label={q} value={answers[i] || ''} onChange={(v) => setAnswers(answers.map((a, j) => (j === i ? v : a)))} maxLength={2000} />)}
            {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
