'use client';

import React from 'react';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';

/** What a manager (or HR in their place) records about one person. */
export interface Assessment {
  rating: string | null;
  comment: string;
  recommended_percent: string;
  recommend_promotion: boolean;
  proposed_designation: string;
}

export const emptyAssessment: Assessment = { rating: null, comment: '', recommended_percent: '', recommend_promotion: false, proposed_designation: '' };

export function assessmentFrom(r: { rating: string | null; comment: string | null; recommended_percent: number | null; recommend_promotion: boolean; proposed_designation: string | null }): Assessment {
  return {
    rating: r.rating,
    comment: r.comment || '',
    recommended_percent: r.recommended_percent === null ? '' : String(r.recommended_percent),
    recommend_promotion: r.recommend_promotion,
    proposed_designation: r.proposed_designation || '',
  };
}

/** The request body item for one person. */
export function assessmentItem(revisionId: number, a: Assessment): Record<string, unknown> {
  return {
    revision_id: revisionId,
    rating: a.rating,
    comment: a.comment.trim() || null,
    recommended_percent: a.recommended_percent.trim() === '' ? null : Number(a.recommended_percent),
    recommend_promotion: a.recommend_promotion,
    proposed_designation: a.recommend_promotion ? a.proposed_designation.trim() || null : null,
  };
}

/**
 * Rating, comment, suggested increment and promotion for one person. `errors` is keyed by field name (rating, comment,
 * recommended_percent, proposed_designation); each shows on its own field.
 */
export function AssessmentFields({ value, onChange, scale, commentRequired, errors = {}, disabled }: {
  value: Assessment;
  onChange: (next: Assessment) => void;
  scale: { rating: string; label: string }[];
  commentRequired: string[];
  errors?: Record<string, string | undefined>;
  disabled?: boolean;
}) {
  const set = (patch: Partial<Assessment>) => onChange({ ...value, ...patch });
  const needsComment = Boolean(value.rating && commentRequired.includes(value.rating));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <div className="space-y-3">
        <SelectField
          label="Rating"
          required
          value={value.rating}
          onChange={(v) => set({ rating: v })}
          options={scale.map((s) => ({ value: s.rating, label: s.label && s.label !== s.rating ? `${s.rating} · ${s.label}` : s.rating }))}
          placeholder="Not rated"
          error={errors.rating}
          disabled={disabled}
        />
        <TextField
          label="Suggested increment %"
          inputMode="decimal"
          value={value.recommended_percent}
          onChange={(v) => set({ recommended_percent: v.replace(/[^\d.-]/g, '') })}
          hint="Optional. HR decides the final figure."
          error={errors.recommended_percent}
          disabled={disabled}
        />
      </div>
      <div className="space-y-3">
        <Textarea
          label={needsComment ? 'Comment (needed for this rating)' : 'Comment'}
          required={needsComment}
          value={value.comment}
          onChange={(e) => set({ comment: e.target.value.slice(0, 1000) })}
          rows={3}
          error={errors.comment}
          disabled={disabled}
        />
        <label className="flex items-center gap-2 text-xs text-fg sm:text-sm">
          <input type="checkbox" checked={value.recommend_promotion} disabled={disabled} onChange={(e) => set({ recommend_promotion: e.target.checked })} />
          Recommend for promotion
        </label>
        {value.recommend_promotion && (
          <TextField label="Proposed designation" required value={value.proposed_designation} onChange={(v) => set({ proposed_designation: v.slice(0, 255) })} error={errors.proposed_designation} disabled={disabled} />
        )}
      </div>
    </div>
  );
}
