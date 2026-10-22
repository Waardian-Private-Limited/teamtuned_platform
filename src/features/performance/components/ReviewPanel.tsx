'use client';

import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import * as api from '../api/perf.api';
import { ACK_LABEL, FINAL_STATUS_LABEL } from '../constants/perf.constants';
import { errorsOf, type FieldErrors } from '../hooks/useResource';
import { fmt } from '../lib';
import type { Band, Potential, ReviewForm, ReviewView } from '../types/perf.types';
import { Btn } from './ui';
import { YearSummary } from './YearSummary';

const RATINGS = [1, 2, 3, 4, 5];
// Once reviews open, every break is over (or nearly), so the year summary is worth showing.
const SUMMARY_STAGES = ['review', 'calibration', 'released', 'closed'];
const bandName = (bands: Band[] | undefined, code: string | null) => (code ? bands?.find((b) => b.code === code)?.label || code : '—');
const Err = ({ text }: { text?: string }) => (text ? <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{text}</p> : null);

/** The level descriptor closest to a rating, so a rater sees what "4" is meant to look like. */
function describe(levels: { level: number; descriptor: string }[] | null, rating: number | null) {
  if (!levels?.length || !rating) return '';
  return [...levels].sort((a, b) => Math.abs(a.level - rating) - Math.abs(b.level - rating))[0].descriptor;
}

interface FormState { ratings: Record<number, string>; comments: Record<number, string>; comment: string; code: string; reason: string; potential: Potential | null; potentialNote: string }
const formOf = (r: ReviewForm | null): FormState => ({
  ratings: Object.fromEntries((r?.items || []).filter((i) => i.rating !== null).map((i) => [i.goal_item_id, String(i.rating)])),
  comments: Object.fromEntries((r?.items || []).filter((i) => i.comment).map((i) => [i.goal_item_id, i.comment as string])),
  comment: r?.comment || '', code: r?.rating_code || '', reason: r?.adjustment_reason || '', potential: r?.potential ?? null, potentialNote: r?.potential_note || '',
});

/** Check-ins, the self and manager reviews, and the released result with the employee's reply. Shows only what the viewer may see and do. */
export function ReviewPanel({ sheetId }: { sheetId: number }) {
  const [view, setView] = React.useState<ReviewView | null>(null);
  const [error, setError] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [busy, setBusy] = React.useState('');
  const [form, setForm] = React.useState<FormState>(formOf(null));
  const [checkin, setCheckin] = React.useState<Record<number, { comment: string; code: string }>>({});
  const [reply, setReply] = React.useState('');
  const [adjust, setAdjust] = React.useState({ band: '', reason: '' });

  const apply = React.useCallback((v: ReviewView) => {
    setView(v);
    setForm(formOf(v.permissions.can_manager ? v.manager : v.permissions.can_self ? v.self : null));
  }, []);
  React.useEffect(() => { api.getReview(sheetId).then(apply).catch((e) => setError(messageOf(e))); }, [sheetId, apply]);

  if (!view) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : null;
  const p = view.permissions;
  const bands = view.scale?.bands;
  const kind = p.can_manager ? 'manager' : p.can_self ? 'self' : null;
  const competencies = view.goals.filter((g) => g.item_type === 'competency');
  const hasAnything = view.periods.some((x) => x.started) || kind || view.result || view.self || view.manager;
  if (!hasAnything) return null;

  const run = async (name: string, fn: () => Promise<ReviewView>, done: string) => {
    setBusy(name); setError(''); setErrors({});
    try { apply(await fn()); showSuccess(done); } catch (err) { setErrors(errorsOf(err, 'items')); setError(messageOf(err)); } finally { setBusy(''); }
  };

  // Tuner writes a first draft, or clearer wording of what is typed. Nothing is saved until the person saves.
  const aiReview = async () => {
    if (!kind) return;
    setBusy('ai'); setError('');
    try {
      const ratings = Object.fromEntries(Object.entries(form.ratings).filter(([, v]) => v).map(([k, v]) => [Number(k), Number(v)]));
      const d = await api.reviewDraft(sheetId, { kind, text: form.comment.trim() || undefined, ratings });
      setForm({ ...form, comment: d.comment, comments: { ...form.comments, ...Object.fromEntries(d.items.map((i) => [i.goal_item_id, i.comment])) } });
      showSuccess('Draft ready. Read and change it before you save.');
    } catch (err) { setError(messageOf(err)); } finally { setBusy(''); }
  };
  const aiCheckin = async (periodId: number) => {
    const current = checkin[periodId] || { comment: '', code: '' };
    setBusy(`ai${periodId}`); setError('');
    try {
      const d = await api.reviewDraft(sheetId, { kind: 'checkin', period_id: periodId, text: current.comment.trim() || undefined });
      setCheckin({ ...checkin, [periodId]: { ...current, comment: d.comment } });
    } catch (err) { setError(messageOf(err)); } finally { setBusy(''); }
  };
  const goalNotes = view.goals.filter((g) => form.comments[g.id] !== undefined);

  const reviewBody = (submit: boolean) => ({
    items: view.goals.map((g) => ({ goal_item_id: g.id, rating: g.item_type === 'competency' && form.ratings[g.id] ? Number(form.ratings[g.id]) : null, comment: form.comments[g.id] || '' })),
    comment: form.comment, submit, ...(kind === 'manager' ? { rating_code: form.code, adjustment_reason: form.reason, potential: form.potential, potential_note: form.potentialNote } : {}),
  });

  const readOnly = (r: ReviewForm | null, title: string) => r && (
    <div className="space-y-1 rounded-lg bg-bg-subtle p-3 text-sm text-fg">
      <p className="text-xs font-semibold">{title}{r.status === 'draft' && ' (draft)'}</p>
      {r.items.filter((i) => i.rating !== null).map((i) => <p key={i.goal_item_id} className="text-xs"><span className="font-semibold">{view.goals.find((g) => g.id === i.goal_item_id)?.name}:</span> {i.rating}/5{i.comment ? ` · ${i.comment}` : ''}</p>)}
      {r.comment && <p className="text-xs">{r.comment}</p>}
      {r.rating_code && <p className="text-xs">Rating chosen: {bandName(bands, r.rating_code)}{r.adjustment_reason ? ` · ${r.adjustment_reason}` : ''}</p>}
    </div>
  );

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="text-xs font-semibold text-fg sm:text-[13px]">Reviews <span className="font-normal text-fg-muted">· {FINAL_STATUS_LABEL[view.sheet.final_status]}</span></p>
      {error && <Err text={error} />}
      {view.kudos && view.kudos.count > 0 && (
        <div className="space-y-1.5 rounded-lg bg-bg-subtle p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-fg"><Heart className="h-3.5 w-3.5" />Kudos this cycle <span className="font-normal text-fg-muted">· {view.kudos.count} from colleagues</span></p>
          {view.kudos.latest.map((k) => <p key={k.id} className="text-xs text-fg"><span className="font-semibold">{k.from_name}:</span> {k.message}{k.competency_name ? <span className="text-fg-muted"> · {k.competency_name}</span> : null}</p>)}
        </div>
      )}

      {view.periods.some((x) => x.started) && (p.can_checkin || view.checkins.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg">Check-ins</p>
          {view.periods.filter((x) => x.started).map((period) => {
            const notes = view.checkins.filter((c) => c.period_id === period.id);
            const draft = checkin[period.id] || { comment: '', code: '' };
            return (
              <div key={period.id} className="space-y-2 rounded-lg bg-bg-subtle p-3">
                <p className="text-xs font-semibold text-fg">{period.label} <span className="font-normal text-fg-muted">{period.period_start} to {period.period_end}</span></p>
                {notes.map((n) => <p key={n.kind} className="text-xs text-fg"><span className="font-semibold">{n.kind === 'manager' ? 'Reviewer' : 'Employee'}:</span> {n.comment}{n.rating_code ? ` · ${bandName(bands, n.rating_code)}` : ''}</p>)}
                {p.can_checkin && (
                  <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_10rem_auto_auto]">
                    <TextField label="" aria-label="Check-in note" placeholder="How is this period going?" value={draft.comment} onChange={(v) => setCheckin({ ...checkin, [period.id]: { ...draft, comment: v } })} maxLength={4000} />
                    <SelectField<string> label="" value={draft.code || null} placeholder="No rating" onChange={(v) => setCheckin({ ...checkin, [period.id]: { ...draft, code: v || '' } })} options={(bands || []).map((b) => ({ value: b.code, label: b.label }))} />
                    <Btn type="button" variant="secondary" size="field" loading={busy === `c${period.id}`} onClick={() => run(`c${period.id}`, async () => { const v = await api.saveCheckin(sheetId, period.id, { comment: draft.comment, rating_code: draft.code }); setCheckin({ ...checkin, [period.id]: { comment: '', code: '' } }); return v; }, 'Check-in saved')}>Save note</Btn>
                    {view.ai_available && <Btn variant="ghost" size="field" icon={Sparkles} loading={busy === `ai${period.id}`} aria-label="Write with AI" title={draft.comment.trim() ? 'Improve wording' : 'Write a draft'} onClick={() => aiCheckin(period.id)} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view.periods.length > 0 && SUMMARY_STAGES.includes(view.sheet.cycle_status) && <YearSummary view={view} bandName={bandName} />}

      {kind && (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-fg">{kind === 'manager' ? 'Final review' : 'Your own review'}</p>
          {kind === 'manager' && readOnly(view.self, "Employee's own review")}
          {competencies.map((g) => {
            const r = form.ratings[g.id] ? Number(form.ratings[g.id]) : null;
            return (
              <div key={g.id} className="space-y-1">
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_8rem]">
                  <p className="pt-2 text-sm font-semibold text-fg">{g.name}<span className="ml-2 text-[11px] font-normal text-fg-muted">Weight {g.weight}%</span></p>
                  <SelectField<number> label="" numeric value={r} placeholder="Rate 1 to 5" onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, [g.id]: v ? String(v) : '' } })} options={RATINGS.map((n) => ({ value: n, label: String(n) }))} />
                </div>
                {r && describe(g.levels, r) && <p className="text-[11px] text-fg-muted">{describe(g.levels, r)}</p>}
              </div>
            );
          })}
          {goalNotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-fg">Notes per goal</p>
              {goalNotes.map((g) => <TextField key={g.id} label={g.name} value={form.comments[g.id] || ''} onChange={(v) => setForm({ ...form, comments: { ...form.comments, [g.id]: v } })} maxLength={2000} />)}
            </div>
          )}
          {view.ai_available && (
            <div className="flex justify-end">
              <Btn variant="secondary" size="sm" icon={Sparkles} loading={busy === 'ai'} onClick={aiReview}>{form.comment.trim() ? 'Improve wording' : 'Write a draft'}</Btn>
            </div>
          )}
          <Textarea label="Overall comment" rows={view.ai_available ? 6 : 3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          {kind === 'manager' && (
            <div className="space-y-2 rounded-lg bg-bg-subtle p-3">
              <p className="text-xs text-fg">With your ratings the system rating is <span className="font-semibold">{bandName(bands, view.scorecard.band?.code ?? null)}</span> (score {fmt(view.scorecard.overall.score)}). {view.allow_override ? 'You may choose a different rating, with a reason.' : 'Your company does not allow changing it.'}</p>
              {view.allow_override && (
                <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
                  <SelectField<string> label="Rating" value={form.code || null} placeholder="Keep the system rating" onChange={(v) => setForm({ ...form, code: v || '' })} options={(bands || []).map((b) => ({ value: b.code, label: b.label }))} error={errors.rating_code} />
                  <TextField label="Reason for changing" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} error={errors.adjustment_reason} maxLength={500} />
                </div>
              )}
              <div className="grid grid-cols-1 items-start gap-2 border-t border-line/60 pt-2 sm:grid-cols-2">
                <SelectField<Potential> label="Potential (optional)" value={form.potential} placeholder="Not said" onChange={(v) => setForm({ ...form, potential: v })} options={[{ value: 'low', label: 'Low: right where they are' }, { value: 'medium', label: 'Medium: can grow in the role' }, { value: 'high', label: 'High: ready for bigger roles' }]} hint="For talent planning (nine-box). Never shown to the employee." error={errors.potential} />
                {form.potential && <TextField label="Why (optional)" value={form.potentialNote} onChange={(v) => setForm({ ...form, potentialNote: v })} maxLength={500} />}
              </div>
              {view.sheet.final_status === 'revision_requested' && view.sheet.final_note && <p className="text-xs text-fg"><span className="font-semibold">Changes asked for:</span> {view.sheet.final_note}</p>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="secondary" loading={busy === 'draft'} disabled={Boolean(busy)} onClick={() => run('draft', () => api.saveReview(sheetId, kind, reviewBody(false)), 'Draft saved')}>Save draft</Btn>
            <Btn type="button" loading={busy === 'submit'} disabled={Boolean(busy)} onClick={() => run('submit', () => api.saveReview(sheetId, kind, reviewBody(true)), kind === 'manager' && view.needs_approval ? 'Sent for approval' : 'Submitted')}>Submit</Btn>
          </div>
        </div>
      )}

      {!kind && (
        <>
          {readOnly(view.self, p.can_manager === false && view.self?.status === 'submitted' ? "Employee's own review" : 'Your own review')}
          {readOnly(view.manager, "Manager's final review")}
        </>
      )}

      {view.result && (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-fg">Result</p>
          <p className="text-sm text-fg">
            Final rating <span className="font-bold">{bandName(bands, view.result.final_band)}</span> · score {fmt(view.result.overall_score)}
            <span className="ml-2 text-[11px] text-fg-muted">Goals {fmt(view.result.kpi_score)} · Competencies {fmt(view.result.competency_score)}{view.result.feedback_score !== null ? ` · Feedback ${fmt(view.result.feedback_score)}` : ''}</span>
          </p>
          {view.result.final_band !== view.result.system_band && <p className="text-xs text-fg-muted">The system rating was {bandName(bands, view.result.system_band)}.{view.result.adjustment_reason ? ` Reason for the change: ${view.result.adjustment_reason}` : ''}</p>}
          {view.result.ack_status !== 'none' && <p className="text-xs text-fg-muted">{ACK_LABEL[view.result.ack_status]}{view.result.ack_comment ? ` · ${view.result.ack_comment}` : ''}</p>}

          {(p.can_acknowledge || p.can_dispute) && (
            <div className="space-y-2 pt-1">
              <TextField label="Your comment" value={reply} onChange={setReply} error={errors.comment} placeholder="Optional to accept; required to dispute" maxLength={1000} />
              <div className="flex flex-wrap justify-end gap-2">
                {p.can_dispute && <Btn type="button" variant="secondary" loading={busy === 'dispute'} disabled={Boolean(busy)} onClick={() => run('dispute', () => api.replyToRating(sheetId, { action: 'dispute', comment: reply }), 'Dispute sent')}>Dispute ({p.dispute_days_left} days left)</Btn>}
                {p.can_acknowledge && <Btn type="button" loading={busy === 'ack'} disabled={Boolean(busy)} onClick={() => run('ack', () => api.replyToRating(sheetId, { action: 'acknowledge', comment: reply }), 'Acknowledged')}>Acknowledge</Btn>}
              </div>
            </div>
          )}
          {p.can_withdraw_dispute && <div className="flex justify-end"><Btn type="button" variant="secondary" loading={busy === 'withdraw'} onClick={() => run('withdraw', () => api.withdrawDispute(sheetId), 'Dispute withdrawn')}>Withdraw dispute</Btn></div>}
          {p.can_adjust && (
            <div className="space-y-2 rounded-lg bg-bg-subtle p-3">
              <p className="text-xs text-fg">The dispute was upheld. Set the corrected rating; the employee can then reply to it.</p>
              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[12rem_1fr_auto]">
                <SelectField<string> label="" value={adjust.band || null} placeholder="Rating" onChange={(v) => setAdjust({ ...adjust, band: v || '' })} options={(bands || []).map((b) => ({ value: b.code, label: b.label }))} error={errors.final_band} />
                <TextField label="" placeholder="Reason" value={adjust.reason} onChange={(v) => setAdjust({ ...adjust, reason: v })} error={errors.reason} maxLength={500} />
                <Btn type="button" loading={busy === 'adjust'} onClick={() => run('adjust', () => api.adjustRating(sheetId, { final_band: adjust.band, reason: adjust.reason }), 'Rating changed')}>Change rating</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
