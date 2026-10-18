'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, CalendarClock, IndianRupee, Mail, MapPin, Phone, Timer } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { messageOf, statusOf } from '@/lib/api/errors';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { ResumeViewer } from '../../shared/components/ResumeViewer';
import { Tabs } from '../../shared/components/Tabs';
import { TEST_RESULT_LABELS } from '../../shared/constants/recruitment.constants';
import { initials, btn, fieldOf, formatInr } from '../../interviews/lib/ui';
import { EarlierRounds } from '../../interviews/components/interview-detail/EarlierRounds';
import { DetailEmpty } from '../../interviews/components/interview-detail/DetailEmpty';
import * as api from '../api/reviews.api';
import type { DossierDto, ReviewDecision } from '../types/reviews.dto';
import { DECISION_LABEL } from '../types/reviews.dto';
import { DecisionBadge } from './DecisionBadge';

type Tab = 'resume' | 'tests' | 'interviews' | 'notes' | 'reviews';

function Fact({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted"><Icon className="h-3.5 w-3.5 shrink-0" />{children}</span>;
}

/** The reviewer's decision, or what they decided. */
function DecisionPanel({ d, onSaved }: { d: DossierDto; onSaved: (n: DossierDto) => void }) {
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [ctc, setCtc] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const r = d.review;

  async function save() {
    const e: Record<string, string> = {};
    if (!decision) e.decision = 'Choose a decision';
    if (decision && decision !== 'offer' && !note.trim()) e.note = 'Add a short reason';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      onSaved(await api.decide(r.id, { decision: decision as ReviewDecision, note: note.trim() || undefined, suggested_ctc: decision === 'offer' && ctc ? Number(ctc) : null, suggested_joining_date: decision === 'offer' && date ? date : null }));
      showSuccess('Decision sent to HR');
    } catch (err) {
      const f = fieldOf(err);
      if (f) setErrors({ [f]: messageOf(err) }); else showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold text-fg">Your decision</h2>
        <DecisionBadge review={r} />
      </div>
      <div className="space-y-4 p-4">
        {r.message && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">{r.requestedBy || 'HR'}: “{r.message}”</p>}
        {d.canDecide ? (
          <>
            <div>
              <FieldLabel label="Should we make an offer?" required />
              <div role="radiogroup" aria-label="Decision" className={cx('grid gap-2', errors.decision && 'rounded-lg ring-1 ring-[var(--tt-danger)]')}>
                {(['offer', 'hold', 'reject'] as ReviewDecision[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={decision === v}
                    onClick={() => { setDecision(v); setErrors({}); }}
                    className={cx('flex h-11 items-center justify-center rounded-lg border text-sm font-bold transition-colors', decision === v ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle')}
                  >
                    {DECISION_LABEL[v]}
                  </button>
                ))}
              </div>
              <FieldMessage error={errors.decision} />
            </div>
            {decision === 'offer' && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                <TextField label="Suggested annual CTC" type="number" inputMode="numeric" prefix="₹" value={ctc} onChange={setCtc} error={errors.suggested_ctc} hint={d.candidate.expectedCtc ? `Expects ${formatInr(d.candidate.expectedCtc)}` : undefined} />
                <TextField label="Suggested joining date" type="date" value={date} onChange={setDate} error={errors.suggested_joining_date} />
              </div>
            )}
            <div>
              <FieldLabel label={decision && decision !== 'offer' ? 'Reason' : 'Note'} required={Boolean(decision && decision !== 'offer')} />
              <textarea value={note} onChange={(e) => { setNote(e.target.value); setErrors((x) => ({ ...x, note: '' })); }} rows={4} maxLength={2000} placeholder="What should HR know?" className={cx('w-full rounded-lg border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)]', errors.note ? 'border-[var(--tt-danger)]' : 'border-line')} />
              <FieldMessage error={errors.note} />
            </div>
            <button type="button" onClick={save} disabled={busy} className={cx(btn.primary, 'w-full')}>{busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />} Send decision</button>
          </>
        ) : r.status === 'decided' ? (
          <div className="space-y-1.5 text-sm">
            <p className="font-bold text-fg">{r.decision ? DECISION_LABEL[r.decision] : ''}</p>
            {(r.suggestedCtc || r.suggestedJoiningDate) && <p className="text-xs text-fg">Suggested {[r.suggestedCtc ? `${formatInr(r.suggestedCtc)} a year` : null, r.suggestedJoiningDate ? `joining ${formatDate(r.suggestedJoiningDate)}` : null].filter(Boolean).join(', ')}</p>}
            {r.note && <p className="whitespace-pre-wrap text-xs text-fg-muted">{r.note}</p>}
            <p className="text-[11px] text-fg-subtle">Sent {formatDateTime(r.decidedAt)}</p>
          </div>
        ) : (
          <p className="text-xs text-fg-muted">{r.status === 'cancelled' ? 'HR cancelled this request.' : 'This candidate is closed, so no decision is needed.'}</p>
        )}
      </div>
    </section>
  );
}

/** One review: the candidate dossier (resume, tests, interviews, notes, other reviews) and the decision. */
export function ReviewDetailPage({ reviewId }: { reviewId: number }) {
  const [d, setD] = useState<DossierDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);

  const load = useCallback(async () => {
    try { setD(await api.getReview(reviewId)); } catch (err) {
      if ([403, 404].includes(statusOf(err) || 0)) setNotFound(true); else setError(messageOf(err));
    }
  }, [reviewId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (d && !tab) setTab(d.candidate.hasResume ? 'resume' : 'interviews'); }, [d, tab]);

  const back = <Link href="/employee/my-reviews" className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /> My reviews</Link>;

  if (notFound) {
    return <div className="flex h-full flex-col gap-3">{back}<div className="rounded-xl border border-line bg-surface p-6"><EmptyState illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="Review not found" description="It may have been cancelled, or it is not yours." /></div></div>;
  }

  const c = d?.candidate;
  const others = d ? d.reviews.filter((r) => r.id !== d.review.id) : [];
  const tabs = d ? [
    { value: 'resume' as const, label: 'Resume' },
    { value: 'tests' as const, label: 'Tests', count: d.tests.length },
    { value: 'interviews' as const, label: 'Interviews', count: d.interviews.length },
    { value: 'notes' as const, label: 'HR notes', count: d.notes.length },
    { value: 'reviews' as const, label: 'Other reviews', count: others.length },
  ] : [];
  const t = tab ?? 'resume';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {back}
      <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
        {error && <div className="mb-3"><Alert message={error} tone="error" /></div>}
        {!d || !c ? (
          <div className="animate-pulse space-y-3"><div className="h-32 rounded-xl border border-line bg-surface" /><div className="h-[60vh] rounded-xl border border-line bg-surface" /></div>
        ) : (
          <div className="space-y-3 pb-6">
            <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-4">
                <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-fg text-lg font-bold text-[var(--tt-on-primary)]">{initials(c.name)}</span>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-bold tracking-tight text-fg sm:text-xl">{c.name}</h1>
                  <p className="text-sm text-fg-muted">{d.position.title}</p>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                    {(c.currentTitle || c.currentCompany) && <Fact icon={Briefcase}>{[c.currentTitle, c.currentCompany].filter(Boolean).join(' at ')}</Fact>}
                    {c.totalExperience !== null && <Fact icon={Timer}>{c.totalExperience} yrs experience</Fact>}
                    {c.city && <Fact icon={MapPin}>{c.city}</Fact>}
                    {c.noticePeriodDays !== null && <Fact icon={CalendarClock}>{c.noticePeriodDays} days notice</Fact>}
                    {c.currentCtc !== null && <Fact icon={IndianRupee}>Current {formatInr(c.currentCtc)}</Fact>}
                    {c.expectedCtc !== null && <Fact icon={IndianRupee}>Expects {formatInr(c.expectedCtc)}</Fact>}
                    {c.email && <Fact icon={Mail}>{c.email}</Fact>}
                    {c.phone && <Fact icon={Phone}>{c.phone}</Fact>}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 rounded-xl border border-line bg-surface p-3 sm:p-4">
                <Tabs tabs={tabs} value={t} onChange={setTab} idPrefix="review" ariaLabel="Candidate information" />
                <div role="tabpanel" id={`review-panel-${t}`} aria-labelledby={`review-tab-${t}`} className="pt-4">
                  {t === 'resume' && (c.hasResume ? <ResumeViewer candidateId={c.id} fileName={c.resumeName} className="h-[75vh]" /> : <DetailEmpty title="No resume on file" />)}
                  {t === 'tests' && (d.tests.length === 0 ? <DetailEmpty title="No submitted tests" /> : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {d.tests.map((x) => (
                        <li key={x.id} className="rounded-xl border border-line p-4">
                          <p className="truncate text-sm font-bold text-fg">{x.testName || 'Test'}</p>
                          <p className="text-[11px] text-fg-muted">Submitted {formatDateTime(x.submittedAt)}</p>
                          <div className="mt-3 flex items-end justify-between">
                            <p className="text-3xl font-bold tabular-nums text-fg">{x.scorePercent === null ? '—' : `${Math.round(x.scorePercent)}%`}</p>
                            <span className="text-right text-[11px] text-fg-muted">{x.result ? TEST_RESULT_LABELS[x.result] : ''}<br />{x.risk ? `Integrity risk: ${x.risk}` : ''}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ))}
                  {t === 'interviews' && <EarlierRounds rounds={d.interviews} hidden={null} />}
                  {t === 'notes' && (d.notes.length === 0 ? <DetailEmpty title="No HR notes" /> : (
                    <ul className="space-y-2">{d.notes.map((n, i) => <li key={i} className="rounded-lg border border-line p-3"><p className="text-[11px] text-fg-muted">{n.by || 'HR'} · {formatDateTime(n.at)}</p><p className="mt-1 whitespace-pre-wrap text-sm text-fg">{n.text}</p></li>)}</ul>
                  ))}
                  {t === 'reviews' && (others.length === 0 ? <DetailEmpty title="No other reviewers" /> : (
                    <ul className="space-y-2">
                      {others.map((r) => (
                        <li key={r.id} className="rounded-lg border border-line p-3">
                          <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-fg">{r.reviewer.name}{r.reviewer.designation ? <span className="font-normal text-fg-muted"> · {r.reviewer.designation}</span> : null}</p><DecisionBadge review={r} /></div>
                          {r.hidden && <p className="mt-1 text-[11px] text-fg-subtle">Shown after you decide.</p>}
                          {r.note && <p className="mt-1.5 whitespace-pre-wrap text-xs text-fg-muted">{r.note}</p>}
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
              </div>
              <div className="tt-scroll-hidden lg:sticky lg:top-0 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto">
                <DecisionPanel d={d} onSaved={(n) => setD(n)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
