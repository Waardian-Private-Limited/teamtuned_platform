'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { shellClass } from '@/components/ui/FormControls';
import { cx } from '@/theme/tokens';
import { MAX_CRITERION_LENGTH, MAX_INTERVIEW_CRITERIA } from '../constants/recruitment.constants';
import type { ScorecardCriterionDto } from '../types/recruitment.dto';

/**
 * Rating-criteria chips (§10). With `options` (the criteria from Recruitment settings) the list is
 * picked from them and optional ones are marked; a chip that is no longer in settings stays until
 * removed. Without options it falls back to free text: Enter or comma adds, Backspace removes the
 * last. At most 8, unique ignoring case.
 */
export function CriteriaChips({ value, onChange, options, ariaLabel = 'Add a criterion', invalid = false, placeholder = 'e.g. Communication' }: {
  value: string[];
  onChange: (next: string[]) => void;
  options?: ScorecardCriterionDto[] | null;
  ariaLabel?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const full = value.length >= MAX_INTERVIEW_CRITERIA;
  const lowerValue = new Set(value.map((s) => s.toLowerCase()));
  const byName = new Map((options || []).map((o) => [o.name.toLowerCase(), o]));
  const remaining = (options || []).filter((o) => !lowerValue.has(o.name.toLowerCase()));

  const add = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    setInput('');
    if (!parts.length) return;
    const lower = new Set(lowerValue);
    const next = [...value];
    parts.forEach((p) => {
      const name = p.slice(0, MAX_CRITERION_LENGTH);
      if (!lower.has(name.toLowerCase()) && next.length < MAX_INTERVIEW_CRITERIA) { next.push(name); lower.add(name.toLowerCase()); }
    });
    if (next.length !== value.length) onChange(next);
  };

  return (
    <div className={cx(shellClass(invalid), 'h-auto min-h-10 flex-wrap gap-1.5 py-1.5')}>
      {value.map((c) => {
        const opt = byName.get(c.toLowerCase());
        const stale = Boolean(options) && !opt;
        return (
          <span
            key={c}
            title={stale ? 'No longer in the scorecard settings' : undefined}
            className={cx(
              'inline-flex h-7 items-center gap-1 rounded-md border pl-2 pr-1 text-xs font-medium text-fg',
              stale ? 'border-dashed border-line-strong bg-surface' : 'border-line bg-bg-subtle'
            )}
          >
            {c}
            {opt && !opt.required && <span className="rounded border border-line bg-surface px-1 text-[10px] font-semibold text-fg-muted">Optional</span>}
            <button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(value.filter((x) => x !== c))} className="rounded p-0.5 text-fg-muted hover:bg-surface hover:text-fg">
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      {options ? (
        !full && remaining.length > 0 ? (
          <label className="relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-dashed border-line-strong px-2 text-xs font-semibold text-fg-muted hover:text-fg">
            <Plus className="h-3 w-3" aria-hidden="true" /> Add
            <select
              aria-label={ariaLabel}
              value=""
              onChange={(e) => { if (e.target.value) onChange([...value, e.target.value]); }}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">Add a criterion</option>
              {remaining.map((o) => <option key={o.name} value={o.name}>{o.name}{o.required ? '' : ' (optional)'}</option>)}
            </select>
          </label>
        ) : value.length === 0 ? (
          <span className="px-1 text-xs text-fg-subtle">{options.length ? 'All criteria added' : 'No criteria in Recruitment settings'}</span>
        ) : null
      ) : (
        !full && (
          <input
            value={input}
            maxLength={MAX_CRITERION_LENGTH + 1}
            onChange={(e) => { if (e.target.value.endsWith(',')) add(e.target.value); else setInput(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(input); }
              else if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={() => add(input)}
            aria-label={ariaLabel}
            placeholder={value.length ? 'Add…' : placeholder}
            className="min-w-[120px] flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
        )
      )}
    </div>
  );
}
