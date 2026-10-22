'use client';

import React from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import * as api from '../api/perf.api';
import { SOURCE_LABEL } from '../constants/perf.constants';
import { errorsOf } from '../hooks/useResource';
import type { Settings, Source } from '../types/perf.types';
import { num } from './parts';
import { Btn } from './ui';

const ALL_SOURCES = Object.keys(SOURCE_LABEL) as Source[];

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Settings for the organization, or for one company when a company is chosen at the top of the page. */
export function SettingsTab({ subOrgId, canEdit }: { subOrgId: number | null; canEdit: boolean }) {
  const [form, setForm] = React.useState<Settings | null>(null);
  const [saved, setSaved] = React.useState<Settings | null>(null);
  const [loadError, setLoadError] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm(null); setLoadError('');
    api.getSettings(subOrgId).then((d) => { setForm(d.effective); setSaved(d.effective); }).catch((e) => setLoadError(messageOf(e)));
  }, [subOrgId]);

  const save = async () => {
    if (!form) return;
    setSaving(true); setErrors({});
    try {
      const d = await api.saveSettings(subOrgId, form);
      setForm(d.effective); setSaved(d.effective);
      showSuccess('Settings saved');
    } catch (err) {
      setErrors(errorsOf(err, 'form'));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <p role="alert" className="text-sm text-[var(--tt-danger)]">{loadError}</p>;
  if (!form) return <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />;

  const patch = <K extends keyof Settings>(section: K, values: Partial<Settings[K]>) => setForm({ ...form, [section]: { ...form[section], ...values } });
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const off = !canEdit;

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-xs text-fg-muted">
        {subOrgId ? 'Settings for the selected company. Anything you change here overrides the organization setting for this company only.' : 'Settings for the whole organization. A company can override them once you pick it at the top of the page.'}
      </p>

      <div className="divide-y divide-line/60 rounded-lg border border-line px-4">
        <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Goal setting</p>
        <Row title="Employees can suggest their own goals" hint="The manager still reviews them."><Switch disabled={off} checked={form.goal_setting.employee_can_propose} onChange={(v) => patch('goal_setting', { employee_can_propose: v })} label="Employees can suggest goals" /></Row>
        <Row title="Goal sheets need approval" hint="Goes through the approval flow before the cycle starts."><Switch disabled={off} checked={form.goal_setting.require_goal_approval} onChange={(v) => patch('goal_setting', { require_goal_approval: v })} label="Goal sheets need approval" /></Row>
      </div>

      <div className="divide-y divide-line/60 rounded-lg border border-line px-4">
        <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Reviews</p>
        <Row title="Employees review themselves first"><Switch disabled={off} checked={form.reviews.self_review} onChange={(v) => patch('reviews', { self_review: v })} label="Self review" /></Row>
        <Row title="Final reviews need approval" hint="The manager's review goes through the approval flow before ratings can be released."><Switch disabled={off} checked={form.reviews.require_review_approval} onChange={(v) => patch('reviews', { require_review_approval: v })} label="Final reviews need approval" /></Row>
        <Row title="Employees must acknowledge their rating"><Switch disabled={off} checked={form.reviews.require_acknowledgement} onChange={(v) => patch('reviews', { require_acknowledgement: v })} label="Acknowledgement" /></Row>
        <Row title="Employees see their rating" hint="When the rating is released.">
          <div className="w-44"><SelectField<'after_release' | 'never'> label="" disabled={off} value={form.reviews.rating_visible_to_employee} onChange={(v) => v && patch('reviews', { rating_visible_to_employee: v })} options={[{ value: 'after_release', label: 'After release' }, { value: 'never', label: 'Never' }]} /></div>
        </Row>
        <Row title="Days to dispute a rating" hint="0 to 90. After this the rating is final.">
          <div className="w-28"><TextField label="" type="number" disabled={off} value={String(form.reviews.dispute_window_days)} onChange={(v) => patch('reviews', { dispute_window_days: num(v) ?? 0 })} error={errors['reviews.dispute_window_days']} /></div>
        </Row>
      </div>

      <div className="divide-y divide-line/60 rounded-lg border border-line px-4">
        <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Scoring</p>
        <Row title="When a KPI has no value yet" hint="Skipping leaves it out of the score; zero counts it as nothing achieved.">
          <div className="w-44"><SelectField<'skip' | 'zero'> label="" disabled={off} value={form.scoring.missing_actuals} onChange={(v) => v && patch('scoring', { missing_actuals: v })} options={[{ value: 'skip', label: 'Skip it' }, { value: 'zero', label: 'Count it as zero' }]} /></div>
        </Row>
        <Row title="Managers can change the final rating" hint="They must give a reason."><Switch disabled={off} checked={form.scoring.allow_manager_override} onChange={(v) => patch('scoring', { allow_manager_override: v })} label="Manager override" /></Row>
      </div>

      <div className="rounded-lg border border-line p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Where KPI values may come from</p>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {ALL_SOURCES.map((s) => {
            const on = form.sources.enabled.includes(s);
            return (
              <div key={s} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-fg">{SOURCE_LABEL[s]}</span>
                <Switch disabled={off} checked={on} onChange={(v) => patch('sources', { enabled: v ? [...form.sources.enabled, s] : form.sources.enabled.filter((x) => x !== s) })} label={SOURCE_LABEL[s]} />
              </div>
            );
          })}
        </div>
        {errors['sources.enabled'] && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{errors['sources.enabled']}</p>}
      </div>

      <div className="space-y-3 rounded-lg border border-line p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Calibration guide</p>
        <p className="text-xs text-fg-muted">The share of people you expect at each rating. Leave it empty for no guide. Without enforcing, it only points out where a group is far from this.</p>
        <Row title="Enforce the guide" hint="Releasing ratings, or closing a calibration session, is stopped while the spread is off the guide. Someone who runs the cycle can still go ahead by writing a reason, which is kept.">
          <Switch disabled={off} checked={form.calibration.enforce} onChange={(v) => patch('calibration', { enforce: v })} label="Enforce the guide" />
        </Row>
        {form.calibration.distribution.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-start gap-2">
            <TextField label="" aria-label="Rating code" placeholder="Rating code, as in the rating scale" disabled={off} value={r.code} onChange={(v) => patch('calibration', { distribution: form.calibration.distribution.map((x, j) => (j === i ? { ...x, code: v } : x)) })} maxLength={30} />
            <TextField label="" type="number" aria-label="Percent" suffix={<span className="text-xs text-fg-muted">%</span>} disabled={off} value={String(r.percent)} onChange={(v) => patch('calibration', { distribution: form.calibration.distribution.map((x, j) => (j === i ? { ...x, percent: num(v) ?? 0 } : x)) })} />
            {!off && <button type="button" aria-label="Remove" onClick={() => patch('calibration', { distribution: form.calibration.distribution.filter((_, j) => j !== i) })} className="mt-1.5 rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]">Remove</button>}
          </div>
        ))}
        {!off && <Btn type="button" variant="secondary" size="sm" onClick={() => patch('calibration', { distribution: [...form.calibration.distribution, { code: '', percent: 0 }] })}>Add rating</Btn>}
        {errors['calibration.distribution'] && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors['calibration.distribution']}</p>}
        {form.calibration.enforce && <div className="w-48"><TextField label="Smallest group checked" type="number" disabled={off} value={String(form.calibration.min_group_size)} onChange={(v) => patch('calibration', { min_group_size: num(v) ?? 1 })} error={errors['calibration.min_group_size']} hint="Smaller groups are never stopped: in a team of four, one person is already 25%." /></div>}
        <div className="w-40"><TextField label="Slack (points)" type="number" disabled={off} value={String(form.calibration.tolerance)} onChange={(v) => patch('calibration', { tolerance: num(v) ?? 0 })} error={errors['calibration.tolerance']} hint="Flag a rating this far over or under." /></div>
      </div>

      <div className="divide-y divide-line/60 rounded-lg border border-line px-4">
        <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Improvement plans</p>
        <Row title="Plans need approval" hint="Starting a plan and closing it with an outcome each go through the approval flow."><Switch disabled={off} checked={form.pip.require_approval} onChange={(v) => patch('pip', { require_approval: v })} label="Plans need approval" /></Row>
        <Row title="Suggest a plan for these ratings" hint="Rating codes from your rating scale, separated by commas. People with a released rating in these are listed as worth a conversation.">
          <div className="w-48"><TextField label="" disabled={off} value={form.pip.trigger_bands.join(', ')} onChange={(v) => patch('pip', { trigger_bands: v.split(',').map((x) => x.trimStart()) })} error={errors['pip.trigger_bands']} placeholder="1, 2" /></div>
        </Row>
      </div>

      <div className="divide-y divide-line/60 rounded-lg border border-line px-4">
        <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">360 feedback</p>
        <Row title="Employees can suggest who to ask" hint="The reviewer approves each suggestion."><Switch disabled={off} checked={form.feedback.employee_nominates} onChange={(v) => patch('feedback', { employee_nominates: v })} label="Employees suggest reviewers" /></Row>
        <Row title="Keep answers anonymous" hint="Written answers are listed without names."><Switch disabled={off} checked={form.feedback.anonymous} onChange={(v) => patch('feedback', { anonymous: v })} label="Anonymous feedback" /></Row>
        <Row title="Answers needed before results show" hint="0 to 20. Below this nothing is shown or scored."><div className="w-28"><TextField label="" type="number" disabled={off} value={String(form.feedback.min_responses)} onChange={(v) => patch('feedback', { min_responses: num(v) ?? 0 })} error={errors['feedback.min_responses']} /></div></Row>
        <Row title="Ask people outside the company" hint="Clients, partners or vendors get an emailed link and answer without a login."><Switch disabled={off} checked={form.feedback.allow_external} onChange={(v) => patch('feedback', { allow_external: v })} label="Ask people outside" /></Row>
        {form.feedback.allow_external && <Row title="Days an emailed link works" hint="1 to 60. The reviewer can email a new link at any time."><div className="w-28"><TextField label="" type="number" disabled={off} value={String(form.feedback.external_days)} onChange={(v) => patch('feedback', { external_days: num(v) ?? 14 })} error={errors['feedback.external_days']} /></div></Row>}
        <Row title="Most people to ask per employee" hint="1 to 20."><div className="w-28"><TextField label="" type="number" disabled={off} value={String(form.feedback.max_reviewers)} onChange={(v) => patch('feedback', { max_reviewers: num(v) ?? 1 })} error={errors['feedback.max_reviewers']} /></div></Row>
        <div className="py-3">
          <TextField label="Questions (one per line, up to 5)" disabled={off} value={form.feedback.questions.join(' | ')} onChange={(v) => patch('feedback', { questions: v.split('|').map((x) => x.trimStart()).slice(0, 5) })} error={errors['feedback.questions']} hint="Separate questions with | . Every reviewer is asked the same questions." />
        </div>
      </div>

      {errors.form && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
      {canEdit && <div className="flex justify-end"><Btn type="button" onClick={save} loading={saving} disabled={!dirty}>Save settings</Btn></div>}
    </div>
  );
}
