'use client';

import { useId, useRef } from 'react';
import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cx, heading, text } from '@/theme/tokens';
import { RESUME_ACCEPT, questionField, useApplyForm } from '../hooks/useApplyForm';
import type { ApplicationFormConfig, FormQuestion, StandardFieldKey } from '../types/careers.types';
import { Checkbox, ChoiceGroup, FieldWrap, SelectInput, TextArea, TextInput } from './controls';

type TextStdKey = Exclude<StandardFieldKey, 'resume'>;

const STANDARD_META: Record<TextStdKey, { label: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string; placeholder?: string; step?: string }> = {
  phone: { label: 'Phone', type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '+91 98765 43210' },
  city: { label: 'Current city', autoComplete: 'address-level2' },
  experience: { label: 'Total experience (years)', type: 'number', inputMode: 'decimal', step: '0.5', placeholder: 'e.g. 3.5' },
  current_company: { label: 'Current company', autoComplete: 'organization' },
  notice_period: { label: 'Notice period (days)', type: 'number', inputMode: 'numeric', step: '1', placeholder: 'e.g. 30' },
  current_ctc: { label: 'Current CTC (annual)', type: 'number', inputMode: 'numeric', step: '1' },
  expected_ctc: { label: 'Expected CTC (annual)', type: 'number', inputMode: 'numeric', step: '1' },
  linkedin: { label: 'LinkedIn profile', type: 'url', inputMode: 'url', autoComplete: 'url', placeholder: 'linkedin.com/in/you' },
  portfolio: { label: 'Portfolio or website', type: 'url', inputMode: 'url', placeholder: 'https://' },
};

const ORDER: TextStdKey[] = ['phone', 'city', 'experience', 'current_company', 'notice_period', 'current_ctc', 'expected_ctc', 'linkedin', 'portfolio'];

function ResumeField({
  file,
  onChange,
  error,
  required,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  required: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <FieldWrap id={id} label="Resume" required={required} error={error} hint={error ? undefined : 'PDF, DOC or DOCX, up to 5 MB.'}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={RESUME_ACCEPT}
        className="sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-msg`}
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      {file ? (
        <div
          className={cx(
            'flex items-center gap-3 rounded-[var(--tt-radius-control)] border px-4 py-3',
            error ? 'border-[var(--tt-danger)] ring-4 ring-[var(--tt-danger)]/10' : 'border-line'
          )}
        >
          <FileText className="h-5 w-5 shrink-0 text-fg" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{file.name}</p>
            <p className="text-xs text-fg-subtle">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 text-sm font-semibold text-fg underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)] rounded"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove resume"
            className="shrink-0 rounded p-1 text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cx(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--tt-radius-control)] border border-dashed px-4 py-8 text-center transition-colors',
            'hover:border-fg/40 hover:bg-bg-subtle has-[:focus-visible]:ring-4',
            error ? 'border-[var(--tt-danger)] ring-4 ring-[var(--tt-danger)]/10' : 'border-line-strong'
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onChange(f);
          }}
        >
          <Upload className="h-5 w-5 text-fg" aria-hidden="true" />
          <span className="text-sm font-semibold text-fg">Choose a file</span>
          <span className="text-xs text-fg-subtle">or drag it here</span>
        </label>
      )}
    </FieldWrap>
  );
}

function QuestionField({ q, value, onChange, error }: { q: FormQuestion; value: string; onChange: (v: string) => void; error?: string }) {
  switch (q.type) {
    case 'long_text':
      return <TextArea label={q.label} required={q.required} value={value} onChange={onChange} error={error} rows={5} maxLength={5000} />;
    case 'number':
      return <TextInput label={q.label} required={q.required} type="number" inputMode="decimal" value={value} onChange={onChange} error={error} />;
    case 'yes_no':
      return (
        <ChoiceGroup
          label={q.label}
          name={`q-${q.key}`}
          required={q.required}
          value={value}
          onChange={onChange}
          error={error}
          inline
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      );
    case 'choice':
      return q.options.length > 5 ? (
        <SelectInput label={q.label} required={q.required} value={value} onChange={onChange} error={error} options={q.options.map((o) => ({ value: o, label: o }))} />
      ) : (
        <ChoiceGroup label={q.label} name={`q-${q.key}`} required={q.required} value={value} onChange={onChange} error={error} options={q.options.map((o) => ({ value: o, label: o }))} />
      );
    default:
      return <TextInput label={q.label} required={q.required} value={value} onChange={onChange} error={error} maxLength={500} />;
  }
}

interface ApplyFormProps {
  slug: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  form: ApplicationFormConfig;
}

export function ApplyForm({ slug, jobSlug, jobTitle, companyName, form }: ApplyFormProps) {
  const vm = useApplyForm(slug, jobSlug, form);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vm.submitting) return;
    const ok = await vm.submit();
    requestAnimationFrame(() => {
      if (ok) {
        resultRef.current?.focus();
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof target.focus === 'function' && target.matches('input, select, textarea')) target.focus({ preventScroll: true });
      }
    });
  };

  if (vm.result) {
    const already = vm.result === 'already_applied';
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="rounded-[var(--tt-radius-lg)] border border-line px-6 py-12 text-center outline-none sm:px-10">
        <CheckCircle2 className="mx-auto h-10 w-10 text-fg" aria-hidden="true" />
        <h2 className={cx(heading.md, 'mt-5')}>{already ? 'You have already applied for this role' : 'Application received'}</h2>
        <p className={cx(text.lead, 'mx-auto mt-3 max-w-md')}>
          {already
            ? `${companyName || 'The hiring team'} already has your application for ${jobTitle}. There is no need to apply again — they will contact you by email.`
            : `Thank you for applying for ${jobTitle}. ${companyName || 'The hiring team'} will review your application and contact you by email about next steps.`}
        </p>
      </div>
    );
  }

  const std = form.standard;
  const fields = ORDER.filter((k) => std[k] !== 'off');

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-8" aria-labelledby="apply-heading">
      <div>
        <h2 id="apply-heading" className={heading.md}>Apply for this role</h2>
        <p className={cx(text.body, 'mt-1')}>Fields marked <span className="text-[var(--tt-danger)]">*</span> are required.</p>
      </div>

      <fieldset className="space-y-5">
        <legend className="sr-only">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput label="First name" required autoComplete="given-name" value={vm.values.text.first_name} onChange={(v) => vm.setText('first_name', v)} error={vm.errors.first_name} maxLength={80} />
          <TextInput label="Last name" autoComplete="family-name" value={vm.values.text.last_name} onChange={(v) => vm.setText('last_name', v)} error={vm.errors.last_name} maxLength={80} />
        </div>
        <TextInput label="Email" required type="email" inputMode="email" autoComplete="email" value={vm.values.text.email} onChange={(v) => vm.setText('email', v)} error={vm.errors.email} maxLength={190} />
        {fields.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((k) => {
              const m = STANDARD_META[k];
              return (
                <TextInput
                  key={k}
                  label={m.label}
                  required={std[k] === 'required'}
                  type={m.type ?? 'text'}
                  inputMode={m.inputMode}
                  autoComplete={m.autoComplete}
                  placeholder={m.placeholder}
                  step={m.step}
                  min={m.type === 'number' ? 0 : undefined}
                  value={vm.values.text[k]}
                  onChange={(v) => vm.setText(k, v)}
                  error={vm.errors[k]}
                />
              );
            })}
          </div>
        )}
      </fieldset>

      {std.resume !== 'off' && (
        <ResumeField file={vm.values.resume} onChange={vm.setResume} error={vm.errors.resume} required={std.resume === 'required'} />
      )}

      {form.questions.length > 0 && (
        <fieldset className="space-y-5">
          <legend className="mb-1 text-base font-semibold text-fg">A few questions</legend>
          {form.questions.map((q) => (
            <QuestionField
              key={q.key}
              q={q}
              value={vm.values.answers[q.key] ?? ''}
              onChange={(v) => vm.setAnswer(q.key, v)}
              error={vm.errors[questionField(q.key)]}
            />
          ))}
        </fieldset>
      )}

      {/* Honeypot: real people never see or reach this; naive bots fill it in. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="careers-website">Website</label>
        <input
          id="careers-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={vm.values.website}
          onChange={(e) => vm.setWebsite(e.target.value)}
        />
      </div>

      <Checkbox checked={vm.values.consent} onChange={vm.setConsent} error={vm.errors.consent}>
        I agree that {companyName || 'the company'} may store and use the information and resume I submit to assess my
        application for this and similar roles. It is used only for recruitment and you can ask for it to be deleted at any time.
      </Checkbox>

      <div>
        <Button type="submit" loading={vm.submitting} loadingLabel="Sending application…" className="sm:!w-auto sm:min-w-[220px] sm:!px-8">
          Submit application
        </Button>
        {vm.formError && (
          <p role="alert" className={cx(text.error, 'mt-3 text-sm')}>{vm.formError}</p>
        )}
      </div>
    </form>
  );
}
