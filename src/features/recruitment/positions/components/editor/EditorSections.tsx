'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { FieldLabel, FieldMessage, OptionCard, SelectField, TextField, shellClass } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { cx } from '@/theme/tokens';
import {
  FIELD_RULE_OPTIONS, INTERVIEW_MODE_LABELS, QUESTION_TYPE_LABELS, STANDARD_FIELDS, WORK_MODE_LABELS,
} from '../../../shared/constants/recruitment.constants';
import { EmployeeMultiPicker, EmployeePicker } from '../../../shared/components/EmployeePicker';
import { Markdown } from '../../../shared/components/Markdown';
import { CriteriaChips } from '../../../shared/components/CriteriaChips';
import { useScorecardSetup } from '../../../shared/hooks/useScorecardSetup';
import type { FieldRule, InterviewMode, QuestionType, RecruitmentOptions, WorkMode } from '../../../shared/types/recruitment.model';
import type { PositionEditorState } from '../../hooks/usePositionEditor';

type Ed = PositionEditorState;

const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-30';

export function EditorSection({ id, title, description, error, children }: {
  id: string; title: string; description?: string; error?: boolean; children: React.ReactNode;
}) {
  return (
    <section id={`pos-section-${id}`} data-section={id} className={cx('scroll-mt-4 rounded-xl border bg-surface p-4 sm:p-5', error ? 'border-[var(--tt-danger)]/50' : 'border-line')}>
      <div className="mb-4">
        <h2 className="text-sm font-bold text-fg sm:text-base">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/* --------------------------------- Basics --------------------------------- */

export function BasicsSection({ ed, options }: { ed: Ed; options: RecruitmentOptions }) {
  const { draft, set, errors, clearError } = ed;
  const roles = options.roles.filter((r) => !draft.departmentId || !r.departmentId || r.departmentId === draft.departmentId);
  return (
    <EditorSection id="basics" title="Basics" error={ed.sectionErrors.has('basics')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField label="Job title" required value={draft.title} maxLength={160} placeholder="e.g. Senior Backend Engineer"
            onChange={(v) => { set('title', v); clearError('title'); }} error={errors.title} />
        </div>
        <SelectField label="Department" required numeric value={draft.departmentId}
          options={options.departments.map((d) => ({ value: d.id as number, label: d.name }))}
          onChange={(v) => { set('departmentId', v); clearError('department_id'); if (draft.roleId && !roles.some((r) => r.id === draft.roleId)) set('roleId', null); }}
          error={errors.department_id} placeholder="Select department…" />
        <SelectField label="Role" numeric value={draft.roleId}
          options={roles.map((r) => ({ value: r.id as number, label: r.name }))}
          onChange={(v) => { set('roleId', v); clearError('role_id'); }} error={errors.role_id}
          placeholder="No role" hint="The role the hire gets when they join." />
        <SelectField label="Employment type" numeric value={draft.employmentTypeId}
          options={options.employmentTypes.map((t) => ({ value: t.id as number, label: t.name }))}
          onChange={(v) => { set('employmentTypeId', v); clearError('employment_type_id'); }} error={errors.employment_type_id} placeholder="Select type…" />
        <TextField label="Openings" required type="number" inputMode="numeric" min={0} value={draft.openings}
          onChange={(v) => { set('openings', v); clearError('openings'); }} error={errors.openings}
          hint="Fills automatically once this many are hired. 0 = no limit (keeps hiring)." />
      </div>
    </EditorSection>
  );
}

/* ---------------------------- Location & team ----------------------------- */

export function LocationSection({ ed, options, allowSharedSubOrg }: { ed: Ed; options: RecruitmentOptions; allowSharedSubOrg: boolean }) {
  const { draft, set, errors, clearError } = ed;
  const [useSite, setUseSite] = useState(Boolean(draft.siteId) || (!draft.locationText && options.sites.length > 0));
  return (
    <EditorSection id="location" title="Location & team" error={ed.sectionErrors.has('location')}>
      <div className="space-y-4">
        <div>
          <FieldLabel label="Work mode" required />
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((m) => (
              <OptionCard key={m} selected={draft.workMode === m} title={WORK_MODE_LABELS[m]} onClick={() => { set('workMode', m); clearError('work_mode'); }} />
            ))}
          </div>
          <FieldMessage error={errors.work_mode} />
        </div>

        {draft.workMode !== 'remote' && (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-fg sm:text-[13px]">Location</span>
              {options.sites.length > 0 && (
                <SegmentedControl
                  fitText
                  options={[{ value: 'site', label: 'Site' }, { value: 'text', label: 'Other' }] as const}
                  value={useSite ? 'site' : 'text'}
                  onChange={(v) => {
                    const site = v === 'site';
                    setUseSite(site);
                    if (site) set('locationText', ''); else set('siteId', null);
                  }}
                />
              )}
            </div>
            {useSite && options.sites.length > 0 ? (
              <SelectField label="" numeric value={draft.siteId} options={options.sites.map((s) => ({ value: s.id as number, label: s.name }))}
                onChange={(v) => { set('siteId', v); clearError('site_id'); }} error={errors.site_id} placeholder="Select a site…" />
            ) : (
              <TextField label="" value={draft.locationText} maxLength={160} placeholder="e.g. Pune, Maharashtra"
                onChange={(v) => { set('locationText', v); clearError('location_text'); }} error={errors.location_text} />
            )}
          </div>
        )}

        <SubOrgPicker value={draft.subOrganizationId} onChange={(v) => { set('subOrganizationId', v); clearError('sub_organization_id'); }} allowShared={allowSharedSubOrg} />
        <FieldMessage error={errors.sub_organization_id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel label="Hiring manager" />
            <EmployeePicker value={draft.hiringManager} onChange={(v) => { set('hiringManager', v); clearError('hiring_manager_employee_id'); }}
              invalid={Boolean(errors.hiring_manager_employee_id)} ariaLabel="Hiring manager" />
            <FieldMessage error={errors.hiring_manager_employee_id} hint="Sees this pipeline and every scorecard." />
          </div>
          <div>
            <FieldLabel label="Recruiter" />
            <EmployeePicker value={draft.recruiter} onChange={(v) => { set('recruiter', v); clearError('recruiter_employee_id'); }}
              invalid={Boolean(errors.recruiter_employee_id)} ariaLabel="Recruiter" />
            <FieldMessage error={errors.recruiter_employee_id} />
          </div>
        </div>
      </div>
    </EditorSection>
  );
}

/* ------------------------ Compensation & experience ----------------------- */

export function CompensationSection({ ed }: { ed: Ed }) {
  const { draft, set, errors, clearError } = ed;
  return (
    <EditorSection id="compensation" title="Compensation & experience" description="Annual CTC in rupees; experience in years." error={ed.sectionErrors.has('compensation')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Experience from (yrs)" type="number" inputMode="decimal" min={0} step="0.5" value={draft.experienceMin}
          onChange={(v) => { set('experienceMin', v); clearError('experience_min', 'experience_max'); }} error={errors.experience_min} />
        <TextField label="Experience to (yrs)" type="number" inputMode="decimal" min={0} step="0.5" value={draft.experienceMax}
          onChange={(v) => { set('experienceMax', v); clearError('experience_max'); }} error={errors.experience_max} />
        <TextField label="Salary from (annual)" type="number" inputMode="numeric" min={0} prefix="₹" value={draft.salaryMin}
          onChange={(v) => { set('salaryMin', v); clearError('salary_min', 'salary_max', 'salary_visible'); }} error={errors.salary_min} />
        <TextField label="Salary to (annual)" type="number" inputMode="numeric" min={0} prefix="₹" value={draft.salaryMax}
          onChange={(v) => { set('salaryMax', v); clearError('salary_max', 'salary_visible'); }} error={errors.salary_max} />
      </div>
      <div className={cx('mt-4 flex items-start justify-between gap-3 rounded-lg border p-3', errors.salary_visible ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <div>
          <p className="text-sm font-semibold text-fg">Show salary on careers</p>
          <p className="text-xs text-fg-muted">Off keeps the range internal.</p>
          <FieldMessage error={errors.salary_visible} />
        </div>
        <Switch checked={draft.salaryVisible} onChange={(v) => { set('salaryVisible', v); clearError('salary_visible'); }} label="Show salary on careers" />
      </div>
      <div className="mt-4 sm:max-w-xs">
        <TextField label="Referral reward" type="number" inputMode="numeric" min={0} prefix="₹" value={draft.referralRewardAmount}
          onChange={(v) => { set('referralRewardAmount', v); clearError('referral_reward_amount'); }} error={errors.referral_reward_amount}
          hint="Leave empty to use the referral program's reward." />
      </div>
    </EditorSection>
  );
}

/* ------------------------------- Description ------------------------------ */

export function DescriptionSection({ ed }: { ed: Ed }) {
  const { draft, set, errors, clearError } = ed;
  const [view, setView] = useState<'write' | 'preview'>('write');
  return (
    <EditorSection id="description" title="Description" description="Markdown: # heading, - bullet, 1. list, **bold**, *italic*." error={ed.sectionErrors.has('description')}>
      <div className="mb-2 lg:hidden">
        <SegmentedControl fitText options={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }] as const} value={view} onChange={setView} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={cx(view === 'preview' && 'hidden lg:block')}>
          <div className={cx(shellClass(Boolean(errors.description)), 'h-auto py-2')}>
            <textarea
              value={draft.description}
              onChange={(e) => { set('description', e.target.value); clearError('description'); }}
              rows={16}
              aria-label="Job description"
              aria-invalid={Boolean(errors.description) || undefined}
              placeholder={'## About the role\nWhat the person will do…\n\n## You have\n- 3+ years of …\n- **Strong** communication'}
              className="w-full resize-y bg-transparent font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
          <FieldMessage error={errors.description} />
        </div>
        <div className={cx('min-h-[200px] rounded-lg border border-line bg-bg-subtle/30 p-4', view === 'write' && 'hidden lg:block')}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Preview</p>
          <Markdown source={draft.description} />
        </div>
      </div>
    </EditorSection>
  );
}

/* --------------------------------- Skills --------------------------------- */

export function SkillsSection({ ed }: { ed: Ed }) {
  const { draft, set, errors, clearError } = ed;
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const lower = new Set(draft.skills.map((s) => s.toLowerCase()));
    const next = [...draft.skills];
    parts.forEach((p) => { if (!lower.has(p.toLowerCase()) && next.length < 30) { next.push(p.slice(0, 60)); lower.add(p.toLowerCase()); } });
    set('skills', next);
    clearError('skills');
    setInput('');
  };
  return (
    <EditorSection id="skills" title="Skills" description="Press Enter or comma to add. Up to 30." error={ed.sectionErrors.has('skills')}>
      <div className={cx(shellClass(Boolean(errors.skills)), 'h-auto min-h-10 flex-wrap py-1.5')}>
        {draft.skills.map((s) => (
          <span key={s} className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-bg-subtle pl-2 pr-1 text-xs font-medium text-fg">
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => set('skills', draft.skills.filter((x) => x !== s))} className="rounded p-0.5 text-fg-muted hover:bg-surface hover:text-fg">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { if (e.target.value.endsWith(',')) add(e.target.value); else setInput(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(input); }
            else if (e.key === 'Backspace' && !input && draft.skills.length) set('skills', draft.skills.slice(0, -1));
          }}
          onBlur={() => add(input)}
          aria-label="Add a skill"
          placeholder={draft.skills.length ? '' : 'e.g. Node.js, SQL, Stakeholder management'}
          className="min-w-[140px] flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>
      <FieldMessage error={errors.skills} />
    </EditorSection>
  );
}

/* ----------------------------- Interview plan ----------------------------- */

export function InterviewPlanSection({ ed }: { ed: Ed }) {
  // Criteria come from Recruitment settings → Scorecards for the position's sub-organization.
  const setup = useScorecardSetup({ subOrganizationId: ed.draft.subOrganizationId });
  const { draft, errors, clearError } = ed;
  const plan = draft.interviewPlan;
  return (
    <EditorSection id="interview" title="Interview plan" description="Optional. A suggested plan only: when scheduling, the recruiter can pick another round, change the mode and duration, or swap the panel for that candidate." error={ed.sectionErrors.has('interview')}>
      {errors.interview_plan && <FieldMessage error={errors.interview_plan} />}
      <ol className="space-y-3">
        {plan.map((r, i) => (
          <li key={r.key} className="rounded-lg border border-line p-3">
            <div className="flex items-start gap-3">
              <span className="mt-7 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-bold tabular-nums text-fg">{i + 1}</span>
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_150px_110px]">
                <TextField label="Round name" required value={r.name} maxLength={120}
                  onChange={(v) => { ed.updateRound(i, { name: v }); clearError(`interview_plan.${i}.name`, 'interview_plan'); }}
                  error={errors[`interview_plan.${i}.name`]} />
                <SelectField label="Mode" value={r.mode}
                  options={(Object.keys(INTERVIEW_MODE_LABELS) as InterviewMode[]).map((m) => ({ value: m, label: INTERVIEW_MODE_LABELS[m] }))}
                  onChange={(v) => ed.updateRound(i, { mode: (v || 'video') as InterviewMode })} />
                <TextField label="Minutes" type="number" inputMode="numeric" min={5} max={480} value={String(r.durationMinutes || '')}
                  onChange={(v) => { ed.updateRound(i, { durationMinutes: Number(v) || 0 }); clearError(`interview_plan.${i}.duration_minutes`); }}
                  error={errors[`interview_plan.${i}.duration_minutes`]} />
                <div className="sm:col-span-3">
                  <FieldLabel label="Default interviewers" />
                  <EmployeeMultiPicker value={r.interviewers} onChange={(v) => ed.updateRound(i, { interviewers: v })} ariaLabel={`Interviewers for round ${i + 1}`}
                    invalid={Boolean(errors[`interview_plan.${i}.interviewer_ids`])} />
                  <FieldMessage error={errors[`interview_plan.${i}.interviewer_ids`]} />
                </div>
                <div className="sm:col-span-3">
                  <FieldLabel label="Rating criteria" />
                  <CriteriaChips value={r.criteria || []} options={setup?.criteria} ariaLabel={`Add a rating criterion for round ${i + 1}`}
                    invalid={Boolean(errors[`interview_plan.${i}.criteria`])}
                    onChange={(v) => { ed.updateRound(i, { criteria: v }); clearError(`interview_plan.${i}.criteria`, 'interview_plan'); }} />
                  <FieldMessage error={errors[`interview_plan.${i}.criteria`]} />
                  {!errors[`interview_plan.${i}.criteria`] && <p className="mt-1 text-[11px] text-fg-muted">Panelists rate each 1–5; optional ones may be skipped. Up to 8. Manage the list in Recruitment settings → Scorecards.</p>}
                </div>
              </div>
              <div className="mt-6 flex shrink-0 flex-col gap-1">
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => ed.moveRound(i, -1)} aria-label={`Move round ${i + 1} up`}><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" className={iconBtn} disabled={i === plan.length - 1} onClick={() => ed.moveRound(i, 1)} aria-label={`Move round ${i + 1} down`}><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')} onClick={() => ed.removeRound(i)} aria-label={`Remove round ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => ed.addRound(setup?.criteria.slice(0, 8).map((c) => c.name))} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">
        <Plus className="h-3.5 w-3.5" />Add round
      </button>
    </EditorSection>
  );
}

/* ------------------------------- Assessment ------------------------------- */

export function AssessmentSection({ ed, options }: { ed: Ed; options: RecruitmentOptions }) {
  const { draft, set, errors, clearError } = ed;
  return (
    <EditorSection id="assessment" title="Assessment" description="Optional. With a test, the pipeline gets an Assessment stage; without one it is skipped." error={ed.sectionErrors.has('assessment')}>
      <div className="max-w-md">
        <SelectField label="Test" numeric value={draft.testId}
          options={options.tests.map((t) => ({ value: t.id as number, label: t.name }))}
          onChange={(v) => { set('testId', v); clearError('test_id'); }} error={errors.test_id}
          placeholder="No assessment" hint={options.tests.length ? undefined : 'No tests in the test bank yet (Recruitment → Settings).'} />
      </div>
    </EditorSection>
  );
}

/* ---------------------------- Application form ---------------------------- */

export function FormSection({ ed }: { ed: Ed }) {
  const { draft, set, errors, clearError } = ed;
  const setRule = (key: (typeof STANDARD_FIELDS)[number]['key'], rule: FieldRule) => {
    set('form', { ...draft.form, standard: { ...draft.form.standard, [key]: rule } });
    clearError('form', `form.standard.${key}`);
  };
  return (
    <EditorSection id="form" title="Application form" description="Name and email are always asked. Choose what else candidates fill in." error={ed.sectionErrors.has('form')}>
      <FieldMessage error={errors.form} />
      <div className="divide-y divide-line rounded-lg border border-line">
        {STANDARD_FIELDS.map((f) => (
          <div key={f.key} className={cx('flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between', errors[`form.standard.${f.key}`] && 'bg-[var(--tt-danger-soft)]')}>
            <span className="text-sm font-medium text-fg">{f.label}</span>
            <SegmentedControl fitText options={FIELD_RULE_OPTIONS} value={draft.form.standard[f.key]} onChange={(v) => setRule(f.key, v)} />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-fg sm:text-[13px]">Custom questions</p>
        {draft.form.questions.length === 0 && <p className="mb-2 text-xs text-fg-muted">No custom questions.</p>}
        <ol className="space-y-3">
          {draft.form.questions.map((q, i) => {
            const optErr = errors[`form.questions.${i}.options`];
            return (
              <li key={q.key} className="rounded-lg border border-line p-3">
                <div className="flex items-start gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_150px]">
                    <TextField label={`Question ${i + 1}`} required value={q.label} maxLength={200}
                      onChange={(v) => { ed.updateQuestion(i, { label: v }); clearError(`form.questions.${i}.label`, 'form'); }}
                      error={errors[`form.questions.${i}.label`]} />
                    <SelectField label="Answer type" value={q.type}
                      options={(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
                      onChange={(v) => { ed.updateQuestion(i, { type: (v || 'text') as QuestionType }); clearError(`form.questions.${i}.options`); }} />
                    {q.type === 'choice' && (
                      <div className="sm:col-span-2">
                        <FieldLabel label="Options (one per line)" required />
                        <div className={cx(shellClass(Boolean(optErr)), 'h-auto py-2')}>
                          <textarea
                            value={q.options.join('\n')}
                            onChange={(e) => { ed.updateQuestion(i, { options: e.target.value.split('\n') }); clearError(`form.questions.${i}.options`); }}
                            rows={3}
                            aria-label={`Options for question ${i + 1}`}
                            aria-invalid={Boolean(optErr) || undefined}
                            className="w-full resize-y bg-transparent text-sm text-fg outline-none"
                          />
                        </div>
                        <FieldMessage error={optErr} />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs font-semibold text-fg sm:col-span-2">
                      <Switch checked={q.required} onChange={(v) => ed.updateQuestion(i, { required: v })} label={`Question ${i + 1} required`} />
                      Required
                    </label>
                  </div>
                  <div className="mt-6 flex shrink-0 flex-col gap-1">
                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => ed.moveQuestion(i, -1)} aria-label={`Move question ${i + 1} up`}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" className={iconBtn} disabled={i === draft.form.questions.length - 1} onClick={() => ed.moveQuestion(i, 1)} aria-label={`Move question ${i + 1} down`}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')} onClick={() => ed.removeQuestion(i)} aria-label={`Remove question ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={ed.addQuestion} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">
          <Plus className="h-3.5 w-3.5" />Add question
        </button>
      </div>
    </EditorSection>
  );
}

/* ------------------------------- Publishing ------------------------------- */

export function PublishingSection({ ed, isNew }: { ed: Ed; isNew: boolean }) {
  const { draft, set, errors, clearError } = ed;
  const editableStatus = draft.status === 'draft' || draft.status === 'open';
  return (
    <EditorSection id="publishing" title="Publishing" error={ed.sectionErrors.has('publishing')}>
      <div className="space-y-4">
        {editableStatus ? (
          <div>
            <FieldLabel label="Status" />
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard selected={draft.status === 'draft'} title="Draft" description="Only your team sees it. No applications."
                onClick={() => { set('status', 'draft'); set('published', false); clearError('status'); }} />
              <OptionCard selected={draft.status === 'open'} title="Open" description="Takes applications; can be listed on careers."
                onClick={() => { set('status', 'open'); clearError('status'); }} />
            </div>
            <FieldMessage error={errors.status} />
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-bg-subtle/50 p-3 text-xs text-fg-muted">
            This position is <span className="font-semibold text-fg">{draft.status}</span>. Change it with the actions in the position header.
          </p>
        )}
        <div className={cx('flex items-start justify-between gap-3 rounded-lg border p-3', errors.published ? 'border-[var(--tt-danger)]' : 'border-line', draft.status === 'draft' && 'opacity-60')}>
          <div>
            <p className="text-sm font-semibold text-fg">Published to careers</p>
            <p className="text-xs text-fg-muted">{draft.status === 'draft' ? 'Open the position to publish it.' : 'Listed on your careers page and careers API.'}</p>
            <FieldMessage error={errors.published} />
          </div>
          <Switch checked={draft.published && draft.status !== 'draft'} disabled={draft.status === 'draft'} onChange={(v) => { set('published', v); clearError('published'); }} label="Published to careers" />
        </div>
        <div className="max-w-xs">
          <TextField label="Closes on" type="date" value={draft.closesOn} onChange={(v) => { set('closesOn', v); clearError('closes_on'); }}
            error={errors.closes_on} hint={isNew ? 'Optional. Shown on careers; flagged on the overview once passed.' : undefined} />
        </div>
        {ed.formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{ed.formError}</p>}
      </div>
    </EditorSection>
  );
}
