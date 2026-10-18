'use client';

import { useEffect, useState } from 'react';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { RatingStars } from '../../../shared/components/RatingStars';
import { RatingScale } from '../../../shared/components/RatingScale';
import { CriteriaAverages } from '../../../shared/components/CriteriaRatings';
import * as api from '../../api/interviews.api';
import type { InterviewDetailDto, InterviewPanelistDto, Recommendation } from '../../types/interviews.dto';
import { RECOMMENDATION_OPTIONS } from '../../constants/interviews.constants';
import { btn, fieldOf } from '../../lib/ui';
import { ScorecardCard } from './ScorecardCard';

/** Rounded mean of the given ratings (the server's rule when `rating` is left out), or null. */
function roundedAverage(values: Array<number | null | undefined>): number | null {
  const v = values.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Ratings keyed by the interview's criteria spelling (stored keys match ignoring case). */
function ratingsFor(criteria: string[], stored: Record<string, number> | null | undefined): Record<string, number | null> {
  const lower = new Map(Object.entries(stored || {}).map(([k, v]) => [k.toLowerCase(), v]));
  return Object.fromEntries(criteria.map((c) => [c, lower.get(c.toLowerCase()) ?? null]));
}

export function mineOf(d: InterviewDetailDto, myId: number | null): Partial<InterviewPanelistDto> | null {
  if (d.myScorecard) return { ...d.myScorecard, submitted: Boolean(d.myScorecard.submitted || d.myScorecard.submittedAt) };
  return (d.scorecards || d.panel || []).find((p) => p.isMe || (myId !== null && p.employeeId === myId)) || null;
}

type Errors = { recommendation?: string; rating?: string; notes?: string; criteria_ratings?: string };

/**
 * The panelist's scorecard for this round: criteria 1–5, recommendation, overall rating (follows the
 * criteria average until set by hand) and notes. After submitting it shows the scorecard (editable)
 * and this round's panel feedback, which the server only reveals once the panelist has submitted.
 */
export function ScorecardPanel({ detail, myId, onSaved }: { detail: InterviewDetailDto; myId: number | null; onSaved: () => Promise<void> | void }) {
  const mine = mineOf(detail, myId);
  const submitted = Boolean(mine?.submitted || mine?.submittedAt);
  const criteria = detail.criteria || [];
  const optional = new Set((detail.optionalCriteria || []).map((c) => c.toLowerCase()));
  const isOptional = (c: string) => optional.has(c.toLowerCase());
  const canScore = detail.canSubmit !== false && detail.status !== 'cancelled' && Boolean(mine);

  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [criteriaRatings, setCriteriaRatings] = useState<Record<string, number | null>>({});
  const [ratingTouched, setRatingTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Reset the form from the server copy whenever it changes (load, save).
  const stamp = `${detail.id}:${JSON.stringify(mine ?? null)}`;
  useEffect(() => {
    setRecommendation(mine?.recommendation ?? null);
    setRating(mine?.rating ?? null);
    setNotes(mine?.notes ?? '');
    const stored = ratingsFor(criteria, mine?.criteriaRatings);
    setCriteriaRatings(stored);
    const avg = roundedAverage(Object.values(stored));
    setRatingTouched(mine?.rating !== null && mine?.rating !== undefined && mine.rating !== avg);
    setEditing(false);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the saved scorecard changes
  }, [stamp]);

  function rateCriterion(name: string, value: number | null) {
    setCriteriaRatings((prev) => {
      const next = { ...prev, [name]: value };
      if (!ratingTouched) setRating(roundedAverage(criteria.map((c) => next[c])));
      return next;
    });
    setErrors((x) => ({ ...x, criteria_ratings: undefined, ...(ratingTouched ? {} : { rating: undefined }) }));
  }

  async function submit() {
    const e: Errors = {};
    if (!recommendation) e.recommendation = 'Pick a recommendation';
    const unrated = criteria.filter((c) => !criteriaRatings[c] && !isOptional(c));
    if (unrated.length) e.criteria_ratings = `Rate ${unrated.join(', ')}`;
    if (!rating) e.rating = 'Give a rating';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api.submitScorecard(detail.id, {
        recommendation: recommendation as Recommendation,
        rating: rating as number,
        notes: notes.trim(),
        // Skipped optional criteria are left out; the server checks the required ones.
        ...(criteria.length ? { criteria_ratings: Object.fromEntries(criteria.filter((c) => criteriaRatings[c]).map((c) => [c, criteriaRatings[c] as number])) } : {}),
      });
      showSuccess(submitted ? 'Scorecard updated' : 'Scorecard submitted');
      setEditing(false);
      await onSaved();
    } catch (err) {
      const f = fieldOf(err);
      if (f === 'recommendation' || f === 'rating' || f === 'notes' || f === 'criteria_ratings') setErrors({ [f]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  const others = (detail.scorecards || detail.panel || []).filter((p) => p.employeeId !== myId && !p.isMe);
  const showForm = canScore && (!submitted || editing);

  return (
    <section aria-labelledby="scorecard-heading" className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id="scorecard-heading" className="text-sm font-bold text-fg">Your scorecard</h2>
        {submitted ? (
          canScore && !editing ? <button type="button" className={btn.small} onClick={() => setEditing(true)}>Edit</button> : <span className="text-[11px] font-semibold text-fg-muted">Submitted</span>
        ) : (
          <span className="text-[11px] font-semibold text-fg-muted">{canScore ? 'Not submitted' : 'Not on this panel'}</span>
        )}
      </div>

      <div className="space-y-5 p-4">
        {showForm ? (
          <>
            {criteria.length > 0 && (
              <div>
                <FieldLabel label="Rate each criterion" required={criteria.some((c) => !isOptional(c))} />
                <ul className="divide-y divide-line/70 rounded-lg border border-line">
                  {criteria.map((c) => {
                    const opt = isOptional(c);
                    return (
                      <li key={c} className="flex flex-col gap-1.5 px-3 py-2.5">
                        <span className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 text-sm font-medium text-fg">
                            {c}
                            {opt ? <span className="ml-1.5 text-[11px] font-semibold text-fg-subtle">Optional</span> : <span className="ml-0.5 text-[var(--tt-danger)]" aria-hidden="true">*</span>}
                          </span>
                          {opt && criteriaRatings[c] ? (
                            <button type="button" onClick={() => rateCriterion(c, null)} className="text-[11px] font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline">Clear</button>
                          ) : null}
                        </span>
                        <RatingScale value={criteriaRatings[c] ?? null} onChange={(v) => rateCriterion(c, v)} label={c} invalid={Boolean(errors.criteria_ratings) && !opt && !criteriaRatings[c]} />
                      </li>
                    );
                  })}
                </ul>
                <FieldMessage error={errors.criteria_ratings} hint={optional.size ? '1 = poor, 5 = excellent. Optional criteria may be skipped.' : '1 = poor, 5 = excellent.'} />
              </div>
            )}
            <div>
              <FieldLabel label="Recommendation" required />
              <div role="radiogroup" aria-label="Recommendation" className={cx('grid grid-cols-2 gap-2', errors.recommendation && 'rounded-lg ring-1 ring-[var(--tt-danger)]')}>
                {RECOMMENDATION_OPTIONS.map((o) => {
                  const active = recommendation === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => { setRecommendation(o.value); setErrors((x) => ({ ...x, recommendation: undefined })); }}
                      className={cx(
                        'flex h-11 items-center justify-center rounded-lg border px-2 text-sm font-bold transition-all active:scale-[0.98]',
                        active ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <FieldMessage error={errors.recommendation} />
            </div>
            <div>
              <FieldLabel label="Overall rating" required />
              <RatingStars value={rating} onChange={(v) => { setRating(v); setRatingTouched(v !== null); setErrors((x) => ({ ...x, rating: undefined })); }} label="Overall rating" />
              <FieldMessage error={errors.rating} hint={criteria.length && !ratingTouched ? 'Filled from the criteria average; change it if you like.' : undefined} />
            </div>
            <Textarea label="Notes" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} placeholder="Strengths, concerns, what to probe next round" />
            <div className="flex justify-end gap-2">
              {editing && <button type="button" className={btn.secondary} onClick={() => setEditing(false)}>Cancel</button>}
              <button type="button" onClick={submit} disabled={saving} className={btn.primary}>
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {submitted ? 'Update scorecard' : 'Submit scorecard'}
              </button>
            </div>
          </>
        ) : submitted && mine ? (
          <ScorecardCard card={{ employeeId: myId ?? 0, name: 'You', ...mine, submitted: true } as InterviewPanelistDto} criteria={criteria} />
        ) : (
          <p className="text-xs text-fg-muted">{detail.status === 'cancelled' ? 'This interview was cancelled.' : 'Only panelists of this round can submit a scorecard.'}</p>
        )}

        {(submitted || !mine) && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              This round&apos;s panel{detail.feedback ? ` · ${detail.feedback.submitted}/${detail.feedback.total} submitted` : ''}
            </h3>
            <CriteriaAverages averages={detail.feedback?.criteria} className="mb-2" />
            {others.length === 0 ? (
              <p className="text-xs text-fg-muted">No other panelists.</p>
            ) : (
              <div className="space-y-2">{others.map((p) => <ScorecardCard key={p.employeeId} card={p} criteria={criteria} />)}</div>
            )}
          </div>
        )}
        {!submitted && mine && (detail.feedback?.total ?? 0) > 1 && (
          <p className="text-[11px] text-fg-subtle">Other panelists&apos; feedback for this round shows after you submit yours.</p>
        )}
      </div>
    </section>
  );
}
