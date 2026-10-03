'use client';

import { TextField, SelectField, FieldLabel, FieldMessage, Chip } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import type { OnboardingFieldDto } from '../types/employee-onboarding.dto';

export function OnboardingFieldInput({
  field,
  value,
  onChange,
  errorText,
  hint,
  disabled = false,
}: {
  field: OnboardingFieldDto;
  value: unknown;
  onChange: (value: unknown) => void;
  errorText?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const helpText = hint || field.helpText || undefined;
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          label={field.label}
          required={field.required}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          error={errorText}
          hint={helpText}
          disabled={disabled}
        />
      );
    case 'select':
      return (
        <SelectField<string>
          label={field.label}
          required={field.required}
          value={(value as string) || null}
          onChange={(v) => onChange(v)}
          options={field.options.map((o) => ({ value: o, label: o }))}
          error={errorText}
          hint={helpText}
          disabled={disabled}
        />
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          <FieldLabel label={field.label} required={field.required} />
          <div className="flex flex-wrap gap-2">
            {field.options.map((o) => (
              <Chip
                key={o}
                active={selected.includes(o)}
                onClick={() => !disabled && onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o])}
              >
                {o}
              </Chip>
            ))}
          </div>
          <FieldMessage error={errorText} hint={helpText} />
        </div>
      );
    }
    case 'checkbox':
      return (
        <label className="flex items-center gap-2.5 text-sm text-fg">
          <input
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-[var(--tt-primary)]"
          />
          {field.label}
          {field.required && <span className="text-[var(--tt-danger)]">*</span>}
        </label>
      );
    case 'date':
      return (
        <TextField
          label={field.label}
          required={field.required}
          type="date"
          value={(value as string) || ''}
          onChange={onChange}
          error={errorText}
          hint={helpText}
          disabled={disabled}
        />
      );
    case 'file':
      return null;
    default:
      return (
        <TextField
          label={field.label}
          required={field.required}
          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
          value={(value as string) || ''}
          onChange={onChange}
          error={errorText}
          hint={helpText}
          disabled={disabled}
        />
      );
  }
}
