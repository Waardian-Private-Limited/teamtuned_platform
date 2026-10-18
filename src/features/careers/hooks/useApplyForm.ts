'use client';

import { useCallback, useState } from 'react';
import { PublicApiError, submitHostedApplication } from '../api/careers.api';
import type { ApplicationFormConfig, ApplyResult, FormQuestion, StandardFieldKey } from '../types/careers.types';

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
export const RESUME_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type TextKey = 'first_name' | 'last_name' | 'email' | Exclude<StandardFieldKey, 'resume'>;

export const questionField = (key: string) => `q:${key}`;

export interface ApplyValues {
  text: Record<TextKey, string>;
  answers: Record<string, string>;
  resume: File | null;
  consent: boolean;
  website: string; // honeypot
}

const EMPTY_TEXT: Record<TextKey, string> = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  city: '',
  experience: '',
  current_company: '',
  notice_period: '',
  current_ctc: '',
  expected_ctc: '',
  linkedin: '',
  portfolio: '',
};

const NUMBER_FIELDS: Partial<Record<TextKey, { max: number; integer?: boolean }>> = {
  experience: { max: 60 },
  notice_period: { max: 365, integer: true },
  current_ctc: { max: 1e11 },
  expected_ctc: { max: 1e11 },
};

const URL_FIELDS: TextKey[] = ['linkedin', 'portfolio'];

// Server field names that differ from the form's keys (DB column names).
const SERVER_FIELD_ALIASES: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  total_experience: 'experience',
  totalExperience: 'experience',
  notice_period_days: 'notice_period',
  noticePeriod: 'notice_period',
  currentCompany: 'current_company',
  currentCtc: 'current_ctc',
  expectedCtc: 'expected_ctc',
  linkedin_url: 'linkedin',
  linkedinUrl: 'linkedin',
  portfolio_url: 'portfolio',
  portfolioUrl: 'portfolio',
};

function normaliseUrl(v: string): string {
  const t = v.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function resumeProblem(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!RESUME_EXTENSIONS.includes(ext)) return 'Upload a PDF, DOC or DOCX file.';
  if (file.size > RESUME_MAX_BYTES) return 'The file is larger than 5 MB.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

function validate(v: ApplyValues, form: ApplicationFormConfig): Record<string, string> {
  const e: Record<string, string> = {};
  const req = (k: StandardFieldKey) => form.standard[k] === 'required';
  const on = (k: StandardFieldKey) => form.standard[k] !== 'off';

  if (!v.text.first_name.trim()) e.first_name = 'Enter your first name.';
  else if (v.text.first_name.trim().length > 80) e.first_name = 'Keep this under 80 characters.';
  if (v.text.last_name.trim().length > 80) e.last_name = 'Keep this under 80 characters.';
  const email = v.text.email.trim();
  if (!email) e.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 190) e.email = 'Enter a valid email address.';

  (Object.keys(EMPTY_TEXT) as TextKey[]).forEach((k) => {
    if (k === 'first_name' || k === 'last_name' || k === 'email') return;
    if (!on(k)) return;
    const value = v.text[k].trim();
    if (!value) {
      if (req(k)) e[k] = 'This field is required.';
      return;
    }
    if (k === 'phone' && !/^\+?[\d\s()-]{7,20}$/.test(value)) e[k] = 'Enter a valid phone number.';
    const n = NUMBER_FIELDS[k];
    if (n) {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > n.max) e[k] = 'Enter a valid number.';
      else if (n.integer && !Number.isInteger(num)) e[k] = 'Enter a whole number.';
    }
    if (URL_FIELDS.includes(k) && !isHttpUrl(normaliseUrl(value))) e[k] = 'Enter a valid link.';
    if (k === 'city' || k === 'current_company') {
      if (value.length > 120) e[k] = 'Keep this under 120 characters.';
    }
  });

  if (on('resume')) {
    if (!v.resume) {
      if (req('resume')) e.resume = 'Attach your resume.';
    } else {
      const p = resumeProblem(v.resume);
      if (p) e.resume = p;
    }
  }

  form.questions.forEach((q: FormQuestion) => {
    const value = (v.answers[q.key] ?? '').trim();
    const f = questionField(q.key);
    if (!value) {
      if (q.required) e[f] = q.type === 'choice' || q.type === 'yes_no' ? 'Choose an answer.' : 'This question is required.';
      return;
    }
    if (q.type === 'number' && !Number.isFinite(Number(value))) e[f] = 'Enter a number.';
    if (q.type === 'choice' && !q.options.includes(value)) e[f] = 'Choose one of the options.';
    if (q.type === 'text' && value.length > 500) e[f] = 'Keep this under 500 characters.';
    if (q.type === 'long_text' && value.length > 5000) e[f] = 'Keep this under 5000 characters.';
  });

  if (!v.consent) e.consent = 'Please agree so we can process your application.';
  return e;
}

function buildFormData(v: ApplyValues, form: ApplicationFormConfig): FormData {
  const fd = new FormData();
  fd.append('first_name', v.text.first_name.trim());
  fd.append('last_name', v.text.last_name.trim());
  fd.append('email', v.text.email.trim().toLowerCase());
  (Object.keys(EMPTY_TEXT) as TextKey[]).forEach((k) => {
    if (k === 'first_name' || k === 'last_name' || k === 'email') return;
    if (form.standard[k] === 'off') return;
    const raw = v.text[k].trim();
    if (!raw) return;
    fd.append(k, URL_FIELDS.includes(k) ? normaliseUrl(raw) : raw);
  });
  const answers: Record<string, string | number> = {};
  form.questions.forEach((q) => {
    const value = (v.answers[q.key] ?? '').trim();
    if (!value) return;
    answers[q.key] = q.type === 'number' ? Number(value) : value;
  });
  fd.append('answers', JSON.stringify(answers));
  fd.append('consent', 'true');
  fd.append('website', v.website);
  if (v.resume && form.standard.resume !== 'off') fd.append('resume', v.resume, v.resume.name);
  return fd;
}

export function useApplyForm(slug: string, jobSlug: string, form: ApplicationFormConfig) {
  const [values, setValues] = useState<ApplyValues>({ text: { ...EMPTY_TEXT }, answers: {}, resume: null, consent: false, website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);

  const clearError = (key: string) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  const setText = useCallback((key: TextKey, value: string) => {
    setValues((v) => ({ ...v, text: { ...v.text, [key]: value } }));
    clearError(key);
  }, []);

  const setAnswer = useCallback((key: string, value: string) => {
    setValues((v) => ({ ...v, answers: { ...v.answers, [key]: value } }));
    clearError(questionField(key));
  }, []);

  const setResume = useCallback((file: File | null) => {
    setValues((v) => ({ ...v, resume: file }));
    setErrors((e) => {
      const next = { ...e };
      const p = file ? resumeProblem(file) : null;
      if (p) next.resume = p;
      else delete next.resume;
      return next;
    });
  }, []);

  const setConsent = useCallback((consent: boolean) => {
    setValues((v) => ({ ...v, consent }));
    clearError('consent');
  }, []);

  const setWebsite = useCallback((website: string) => setValues((v) => ({ ...v, website })), []);

  /** Returns false when the form has errors (caller focuses the first one). */
  const submit = useCallback(async (): Promise<boolean> => {
    setFormError(null);
    const found = validate(values, form);
    setErrors(found);
    if (Object.keys(found).length) return false;

    setSubmitting(true);
    try {
      const res = await submitHostedApplication(slug, jobSlug, buildFormData(values, form));
      setResult(res);
      return true;
    } catch (err) {
      if (err instanceof PublicApiError && err.status === 409) {
        setResult('already_applied');
        return true;
      }
      if (err instanceof PublicApiError && err.field) {
        let f = SERVER_FIELD_ALIASES[err.field] ?? err.field;
        const answerKey = /^answers?[.[:]([^\]]+)\]?$/.exec(f)?.[1];
        if (answerKey) f = questionField(answerKey);
        else if (form.questions.some((q) => q.key === f)) f = questionField(f);
        const known = f in EMPTY_TEXT || f === 'resume' || f === 'consent' || f.startsWith('q:');
        if (known) {
          setErrors({ [f]: err.message });
          return false;
        }
      }
      setFormError(err instanceof Error ? err.message : 'Could not send your application. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [values, form, slug, jobSlug]);

  return { values, errors, formError, submitting, result, setText, setAnswer, setResume, setConsent, setWebsite, submit };
}
