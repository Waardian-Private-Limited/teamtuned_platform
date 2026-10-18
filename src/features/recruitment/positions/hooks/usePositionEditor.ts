'use client';

import { useCallback, useMemo, useState } from 'react';
import { showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../shared/api/recruitment.api';
import { DEFAULT_INTERVIEW_CRITERIA, DEFAULT_STANDARD_FORM } from '../../shared/constants/recruitment.constants';
import { newKey, toPositionDetail } from '../../shared/types/recruitment.mapper';
import type {
  FormQuestion, InterviewRound, NamedRef, PositionDetail, PositionForm, PositionInput, PositionStatus, WorkMode,
} from '../../shared/types/recruitment.model';
import { serverFieldOf } from '../../shared/utils/errors';

/** Editor state: numeric inputs stay strings while typing ("2." must survive). */
export interface PositionDraft {
  title: string;
  departmentId: number | null;
  roleId: number | null;
  employmentTypeId: number | null;
  siteId: number | null;
  locationText: string;
  workMode: WorkMode;
  subOrganizationId: number | null;
  openings: string;
  hiringManager: NamedRef | null;
  recruiter: NamedRef | null;
  experienceMin: string;
  experienceMax: string;
  salaryMin: string;
  salaryMax: string;
  salaryVisible: boolean;
  description: string;
  skills: string[];
  interviewPlan: InterviewRound[];
  testId: number | null;
  form: PositionForm;
  status: PositionStatus;
  published: boolean;
  closesOn: string;
}

export type SectionId =
  | 'basics' | 'location' | 'compensation' | 'description' | 'skills' | 'interview' | 'assessment' | 'form' | 'publishing';

export const EDITOR_SECTIONS: ReadonlyArray<{ id: SectionId; label: string }> = [
  { id: 'basics', label: 'Basics' },
  { id: 'location', label: 'Location & team' },
  { id: 'compensation', label: 'Compensation & experience' },
  { id: 'description', label: 'Description' },
  { id: 'skills', label: 'Skills' },
  { id: 'interview', label: 'Interview plan' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'form', label: 'Application form' },
  { id: 'publishing', label: 'Publishing' },
];

/** Which section a (snake_case, dotted) field error belongs to. */
export function sectionOfField(field: string): SectionId {
  const root = field.split('.')[0];
  switch (root) {
    case 'title': case 'department_id': case 'role_id': case 'employment_type_id': case 'openings': return 'basics';
    case 'site_id': case 'location_text': case 'work_mode': case 'sub_organization_id':
    case 'hiring_manager_employee_id': case 'recruiter_employee_id': return 'location';
    case 'experience_min': case 'experience_max': case 'salary_min': case 'salary_max': case 'salary_visible': return 'compensation';
    case 'description': return 'description';
    case 'skills': return 'skills';
    case 'interview_plan': return 'interview';
    case 'test_id': return 'assessment';
    case 'form': return 'form';
    default: return 'publishing';
  }
}

const defaultCriteria = () => [...DEFAULT_INTERVIEW_CRITERIA];

const DEFAULT_PLAN = (): InterviewRound[] => [
  { key: newKey('round'), name: 'Screening call', mode: 'phone', durationMinutes: 30, interviewers: [], criteria: defaultCriteria() },
  { key: newKey('round'), name: 'Technical interview', mode: 'in_person', durationMinutes: 60, interviewers: [], criteria: defaultCriteria() },
  { key: newKey('round'), name: 'Hiring manager', mode: 'in_person', durationMinutes: 45, interviewers: [], criteria: defaultCriteria() },
];

const numStr = (v: number | null) => (v === null ? '' : String(v));

export function draftFrom(p?: PositionDetail | null): PositionDraft {
  if (!p) {
    return {
      title: '', departmentId: null, roleId: null, employmentTypeId: null, siteId: null, locationText: '',
      workMode: 'onsite', subOrganizationId: null, openings: '1', hiringManager: null, recruiter: null,
      experienceMin: '', experienceMax: '', salaryMin: '', salaryMax: '', salaryVisible: false,
      description: '', skills: [], interviewPlan: DEFAULT_PLAN(), testId: null,
      form: { standard: { ...DEFAULT_STANDARD_FORM }, questions: [] },
      status: 'draft', published: false, closesOn: '',
    };
  }
  return {
    title: p.title,
    departmentId: p.departmentId,
    roleId: p.roleId,
    employmentTypeId: p.employmentTypeId,
    siteId: p.siteId,
    locationText: p.locationText,
    workMode: p.workMode,
    subOrganizationId: p.subOrganizationId,
    openings: String(p.openings ?? 1),
    hiringManager: p.hiringManager?.id ? p.hiringManager : null,
    recruiter: p.recruiter?.id ? p.recruiter : null,
    experienceMin: numStr(p.experienceMin),
    experienceMax: numStr(p.experienceMax),
    salaryMin: numStr(p.salaryMin),
    salaryMax: numStr(p.salaryMax),
    salaryVisible: p.salaryVisible,
    description: p.description,
    skills: [...p.skills],
    interviewPlan: p.interviewPlan.map((r) => ({ ...r, interviewers: [...r.interviewers], criteria: [...(r.criteria || [])] })),
    testId: p.testId,
    form: { standard: { ...p.form.standard }, questions: p.form.questions.map((q) => ({ ...q, options: [...q.options] })) },
    status: p.status,
    published: p.published,
    closesOn: p.closesOn || '',
  };
}

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export type FieldErrors = Record<string, string>;

function validate(d: PositionDraft): FieldErrors {
  const e: FieldErrors = {};
  if (!d.title.trim()) e.title = 'Give the position a title';
  else if (d.title.trim().length > 160) e.title = 'Keep the title under 160 characters';
  if (!d.departmentId) e.department_id = 'Pick a department';
  const openings = toNum(d.openings);
  if (openings === null || Number.isNaN(openings) || openings < 0 || !Number.isInteger(openings)) e.openings = 'Enter 0 (no limit) or more';
  const expMin = toNum(d.experienceMin);
  const expMax = toNum(d.experienceMax);
  if (Number.isNaN(expMin) || (expMin !== null && expMin < 0)) e.experience_min = 'Enter years, e.g. 2';
  if (Number.isNaN(expMax) || (expMax !== null && expMax < 0)) e.experience_max = 'Enter years, e.g. 5';
  else if (expMin !== null && expMax !== null && !Number.isNaN(expMin) && expMax < expMin) e.experience_max = 'Must be at least the minimum';
  const salMin = toNum(d.salaryMin);
  const salMax = toNum(d.salaryMax);
  if (Number.isNaN(salMin) || (salMin !== null && salMin < 0)) e.salary_min = 'Enter an amount';
  if (Number.isNaN(salMax) || (salMax !== null && salMax < 0)) e.salary_max = 'Enter an amount';
  else if (salMin !== null && salMax !== null && !Number.isNaN(salMin) && salMax < salMin) e.salary_max = 'Must be at least the minimum';
  if (d.salaryVisible && salMin === null && salMax === null) e.salary_visible = 'Add a salary range to show it';
  d.interviewPlan.forEach((r, i) => {
    if (!r.name.trim()) e[`interview_plan.${i}.name`] = 'Name this round';
    if (!r.durationMinutes || r.durationMinutes < 5 || r.durationMinutes > 480) e[`interview_plan.${i}.duration_minutes`] = '5–480 min';
    const lower = (r.criteria || []).map((c) => c.toLowerCase());
    if (lower.length > 8) e[`interview_plan.${i}.criteria`] = 'Up to 8 criteria';
    else if (new Set(lower).size !== lower.length) e[`interview_plan.${i}.criteria`] = 'Each criterion once';
  });
  d.form.questions.forEach((q, i) => {
    if (!q.label.trim()) e[`form.questions.${i}.label`] = 'Write the question';
    if (q.type === 'choice' && q.options.filter((o) => o.trim()).length < 2) e[`form.questions.${i}.options`] = 'Add at least two options';
  });
  if (d.closesOn && !/^\d{4}-\d{2}-\d{2}$/.test(d.closesOn)) e.closes_on = 'Pick a date';
  return e;
}

function toInput(d: PositionDraft): PositionInput {
  return {
    title: d.title,
    departmentId: d.departmentId,
    roleId: d.roleId,
    employmentTypeId: d.employmentTypeId,
    siteId: d.siteId,
    locationText: d.siteId ? '' : d.locationText,
    workMode: d.workMode,
    subOrganizationId: d.subOrganizationId,
    openings: toNum(d.openings),
    hiringManager: d.hiringManager,
    recruiter: d.recruiter,
    experienceMin: toNum(d.experienceMin),
    experienceMax: toNum(d.experienceMax),
    salaryMin: toNum(d.salaryMin),
    salaryMax: toNum(d.salaryMax),
    salaryVisible: d.salaryVisible,
    description: d.description,
    skills: d.skills,
    interviewPlan: d.interviewPlan,
    testId: d.testId,
    form: d.form,
    status: d.status,
    published: d.status === 'draft' ? false : d.published,
    closesOn: d.closesOn,
  };
}

/** "interview_plan[1].name" → "interview_plan.1.name" */
const normField = (f: string) => f.replace(/\[(\d+)\]/g, '.$1');

export function usePositionEditor(initial: PositionDetail | null, onSaved: (p: PositionDetail) => void) {
  const [draft, setDraft] = useState<PositionDraft>(() => draftFrom(initial));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = useCallback(<K extends keyof PositionDraft>(key: K, value: PositionDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }, []);

  const clearError = useCallback((...keys: string[]) => {
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  /* interview plan */
  const updateRound = useCallback((index: number, patch: Partial<InterviewRound>) => {
    setDraft((d) => ({ ...d, interviewPlan: d.interviewPlan.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
    setDirty(true);
  }, []);
  /** `criteria`: the new round's starting list (the scorecard settings' criteria when known). */
  const addRound = useCallback((criteria?: string[]) => {
    setDraft((d) => ({ ...d, interviewPlan: [...d.interviewPlan, { key: newKey('round'), name: '', mode: 'in_person', durationMinutes: 45, interviewers: [], criteria: criteria ? [...criteria] : defaultCriteria() }] }));
    setDirty(true);
  }, []);
  const removeRound = useCallback((index: number) => {
    setDraft((d) => ({ ...d, interviewPlan: d.interviewPlan.filter((_, i) => i !== index) }));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('interview_plan'))));
    setDirty(true);
  }, []);
  const moveRound = useCallback((index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const to = index + dir;
      if (to < 0 || to >= d.interviewPlan.length) return d;
      const plan = [...d.interviewPlan];
      [plan[index], plan[to]] = [plan[to], plan[index]];
      return { ...d, interviewPlan: plan };
    });
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('interview_plan'))));
    setDirty(true);
  }, []);

  /* custom questions */
  const updateQuestion = useCallback((index: number, patch: Partial<FormQuestion>) => {
    setDraft((d) => ({ ...d, form: { ...d.form, questions: d.form.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) } }));
    setDirty(true);
  }, []);
  const addQuestion = useCallback(() => {
    setDraft((d) => ({ ...d, form: { ...d.form, questions: [...d.form.questions, { key: newKey('q'), label: '', type: 'text', required: false, options: [] }] } }));
    setDirty(true);
  }, []);
  const removeQuestion = useCallback((index: number) => {
    setDraft((d) => ({ ...d, form: { ...d.form, questions: d.form.questions.filter((_, i) => i !== index) } }));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('form.questions'))));
    setDirty(true);
  }, []);
  const moveQuestion = useCallback((index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const to = index + dir;
      const qs = [...d.form.questions];
      if (to < 0 || to >= qs.length) return d;
      [qs[index], qs[to]] = [qs[to], qs[index]];
      return { ...d, form: { ...d.form, questions: qs } };
    });
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('form.questions'))));
    setDirty(true);
  }, []);

  /** Returns the first section with an error (to scroll to) or null when saved. */
  const submit = useCallback(async (): Promise<SectionId | null> => {
    const local = validate(draft);
    setErrors(local);
    setFormError('');
    const keys = Object.keys(local);
    if (keys.length) return sectionOfField(keys[0]);
    setIsSaving(true);
    try {
      const input = toInput(draft);
      const dto = initial ? await api.updatePosition(initial.id, input) : await api.createPosition(input);
      showSuccess(initial ? 'Position saved' : 'Position created');
      setDirty(false);
      const saved = dto && (dto as { id?: number }).id ? toPositionDetail(dto) : initial;
      if (saved) onSaved(saved);
      return null;
    } catch (err) {
      const field = serverFieldOf(err);
      if (field) {
        const key = normField(field);
        setErrors({ [key]: messageOf(err) });
        return sectionOfField(key);
      }
      setFormError(messageOf(err));
      return 'publishing';
    } finally {
      setIsSaving(false);
    }
  }, [draft, initial, onSaved]);

  const sectionErrors = useMemo(() => {
    const out = new Set<SectionId>();
    Object.keys(errors).forEach((k) => out.add(sectionOfField(k)));
    return out;
  }, [errors]);

  return {
    draft, set, errors, clearError, formError, isSaving, dirty, sectionErrors, submit,
    updateRound, addRound, removeRound, moveRound,
    updateQuestion, addQuestion, removeQuestion, moveQuestion,
  };
}

export type PositionEditorState = ReturnType<typeof usePositionEditor>;
