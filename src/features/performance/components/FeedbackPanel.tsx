'use client';

import React from 'react';
import { Mail, Search, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import * as api from '../api/perf.api';
import { FEEDBACK_STATUS_LABEL, RELATION_LABEL } from '../constants/perf.constants';
import { fmt } from '../lib';
import type { FeedbackView, PersonOption, Relation } from '../types/perf.types';
import { Btn, IconBtn } from './ui';

/** 360 feedback about one employee: who was asked, how to add people, and (once enough people answered) what they said. */
export function FeedbackPanel({ sheetId }: { sheetId: number }) {
  const [view, setView] = React.useState<FeedbackView | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [people, setPeople] = React.useState<PersonOption[]>([]);
  const [relation, setRelation] = React.useState<Relation>('peer');
  const [outside, setOutside] = React.useState(false);
  const [guest, setGuest] = React.useState({ name: '', email: '' });

  React.useEffect(() => { api.getFeedback(sheetId).then(setView).catch((e) => setError(messageOf(e))); }, [sheetId]);
  React.useEffect(() => {
    if (q.trim().length < 2) { setPeople([]); return undefined; }
    const t = setTimeout(() => { api.feedbackCandidates(sheetId, q.trim()).then((d) => setPeople(d.items)).catch(() => setPeople([])); }, 250);
    return () => clearTimeout(t);
  }, [q, sheetId]);

  if (!view) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : null;
  const p = view.permissions;
  const s = view.summary;
  const name = (id: number) => view.competencies.find((c) => c.id === id)?.name || '';

  const run = async (fn: () => Promise<FeedbackView>, done: string) => {
    setBusy(true); setError('');
    try { setView(await fn()); showSuccess(done); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  const askOutside = async () => {
    setBusy(true); setError('');
    try {
      setView(await api.askFeedback(sheetId, { external_name: guest.name, external_email: guest.email }));
      setGuest({ name: '', email: '' });
      showSuccess(p.can_assign ? 'Link emailed' : 'Sent to the reviewer to approve');
    } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  const ask = (person: PersonOption) => { setQ(''); setPeople([]); return run(() => api.askFeedback(sheetId, { employee_id: person.id, relation }), p.can_assign ? 'Feedback requested' : 'Sent to the reviewer to approve'); };

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="text-xs font-semibold text-fg sm:text-[13px]">360 feedback <span className="font-normal text-fg-muted">· {view.settings.anonymous ? 'answers are anonymous' : 'answers show the name'}{view.settings.min_responses > 0 ? ` · shown once ${view.settings.min_responses} people answered` : ''} · {view.answered} of {view.requests.filter((r) => r.status !== 'declined' && r.status !== 'proposed').length} answered</span></p>
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}

      <ul className="divide-y divide-line/60 rounded-lg border border-line">
        {view.requests.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-muted">Nobody has been asked yet.</li>}
        {view.requests.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{r.reviewer_name}<span className="ml-2 text-[11px] font-normal text-fg-muted">{RELATION_LABEL[r.relation]}</span></p>
              <p className="text-[11px] text-fg-muted">{FEEDBACK_STATUS_LABEL[r.status]}{r.source === 'employee' ? ' · suggested by the employee' : ''}{r.external_email ? ` · ${r.external_email}` : ''}{r.external && r.status === 'pending' && r.link_expires_at ? ` · link works until ${r.link_expires_at.slice(0, 10)}` : ''}</p>
            </div>
            <div className="flex items-center gap-1">
              {p.can_decide && r.status === 'proposed' && (
                <>
                  <Btn type="button" size="sm" disabled={busy} onClick={() => run(() => api.decideFeedback(sheetId, r.id, true), 'Approved')}>Approve</Btn>
                  <Btn type="button" variant="secondary" size="sm" disabled={busy} onClick={() => run(() => api.decideFeedback(sheetId, r.id, false), 'Declined')}>Decline</Btn>
                </>
              )}
              {p.can_decide && r.external && r.status === 'pending' && <IconBtn label={`Email ${r.reviewer_name} a new link`} disabled={busy} onClick={() => run(() => api.resendFeedback(sheetId, r.id), 'New link emailed')}><Mail className="h-4 w-4" /></IconBtn>}
              {p.can_decide && r.status !== 'submitted' && r.status !== 'proposed' && (
                <button type="button" aria-label={`Remove ${r.reviewer_name}`} onClick={() => run(() => api.removeFeedback(sheetId, r.id), 'Removed')} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {(p.can_assign || p.can_suggest) && view.settings.allow_external && (
        <SegmentedControl<'in' | 'out'> options={[{ value: 'in', label: 'An employee' }, { value: 'out', label: 'Someone outside' }]} value={outside ? 'out' : 'in'} onChange={(v) => setOutside(v === 'out')} fitText />
      )}
      {(p.can_assign || p.can_suggest) && outside && view.settings.allow_external && (
        <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <TextField label="" aria-label="Their name" placeholder="Their name, e.g. a client contact" value={guest.name} onChange={(v) => setGuest({ ...guest, name: v })} maxLength={150} />
          <TextField label="" type="email" aria-label="Their email" placeholder="name@company.com" value={guest.email} onChange={(v) => setGuest({ ...guest, email: v })} maxLength={190} />
          <Btn size="field" icon={Mail} loading={busy} disabled={!guest.name.trim() || !guest.email.trim()} onClick={askOutside}>{p.can_assign ? 'Email link' : 'Suggest'}</Btn>
        </div>
      )}
      {(p.can_assign || p.can_suggest) && !outside && (
        <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_12rem]">
          <div className="relative">
            <TextField label="" aria-label="Find a person" value={q} onChange={setQ} placeholder={p.can_assign ? 'Ask someone for feedback' : 'Suggest someone'} prefix={<Search className="h-3.5 w-3.5" />} />
            {people.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
                {people.map((x) => <li key={x.id}><button type="button" disabled={busy} onClick={() => ask(x)} className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-bg-subtle">{x.name}{x.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{x.employee_code}</span>}</button></li>)}
              </ul>
            )}
          </div>
          <SelectField<Relation> label="" value={relation} onChange={(v) => v && setRelation(v)} options={(Object.keys(RELATION_LABEL) as Relation[]).filter((v) => v !== 'external').map((v) => ({ value: v, label: RELATION_LABEL[v] }))} />
        </div>
      )}

      {s && (
        <div className="space-y-2 rounded-lg bg-bg-subtle p-3">
          <p className="text-xs font-semibold text-fg">Results · {s.count} answered</p>
          {!s.visible ? (
            <p className="text-xs text-fg-muted">Results appear once at least {Math.max(1, view.settings.min_responses)} people have answered, so no single answer can be traced to a person.</p>
          ) : (
            <>
              {s.competencies.map((c) => <p key={c.goal_item_id} className="text-xs text-fg"><span className="font-semibold">{name(c.goal_item_id)}:</span> {fmt(c.avg)} / 5 <span className="text-fg-muted">({c.count} answers)</span></p>)}
              <p className="text-[11px] text-fg-muted">{Object.entries(s.by_relation).map(([k, n]) => `${RELATION_LABEL[k as Relation]}: ${n}`).join(' · ')}</p>
              {s.responses
                ? s.responses.map((r, i) => <p key={i} className="text-xs text-fg"><span className="font-semibold">{r.reviewer_name}:</span> {r.answers.filter((a) => a.answer).map((a) => a.answer).join(' · ')}</p>)
                : s.comments.map((c, i) => <p key={i} className="text-xs text-fg"><span className="text-fg-muted">{c.question}</span> {c.answer}</p>)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
