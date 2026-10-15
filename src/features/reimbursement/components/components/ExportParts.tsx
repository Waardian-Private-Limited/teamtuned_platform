'use client';

import React from 'react';
import { Download, Mail } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import { showSuccess } from '@/lib/toast';
import { EXPORT_MAX_EMAILS } from '../../constants/reimbursement.constants';
import type { ExportFormatDto } from '../../types/reimbursement.dto';
import { placeErrors } from '../../utils/errors';

export const FORMATS: ReadonlyArray<{ value: ExportFormatDto; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel' },
];

export const FILES_HELP: Record<ExportFormatDto, string> = {
  pdf: 'Bills and payment proofs are added as pages.',
  xlsx: 'Photos inside the sheet, plus a Files sheet with links to every file.',
};

export type Delivery = 'download' | 'email';

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits "a@x.com, b@y.com c@z.com" into addresses; returns an error when the list is not usable. */
export function parseEmails(raw: string): { emails: string[]; error: string } {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const e = part.trim();
    if (!e || seen.has(e.toLowerCase())) continue;
    seen.add(e.toLowerCase());
    emails.push(e);
  }
  if (!emails.length) return { emails, error: 'Enter at least one email address' };
  const bad = emails.find((e) => !EMAIL_RE.test(e));
  if (bad) return { emails, error: `“${bad}” is not an email address` };
  if (emails.length > EXPORT_MAX_EMAILS) return { emails, error: `Up to ${EXPORT_MAX_EMAILS} addresses` };
  return { emails, error: '' };
}

/** Starts one Download Centre job: busy state, field errors from a 400, and `track` so it shows in the panel. */
export function useExportJob(placed: ReadonlySet<string>) {
  const { track } = useDownloadCenter();
  const [busy, setBusy] = React.useState<Delivery | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState('');
  const reset = React.useCallback(() => {
    setFields({});
    setForm('');
  }, []);
  const clearField = React.useCallback((...keys: string[]) => setFields((f) => (keys.some((k) => f[k]) ? { ...f, ...Object.fromEntries(keys.map((k) => [k, ''])) } : f)), []);
  const run = async (delivery: Delivery, start: () => Promise<ExportJobDto>, emails: string[], onDone: () => void) => {
    setBusy(delivery);
    reset();
    try {
      track(await start());
      if (delivery === 'email') showSuccess(`It will be emailed to ${emails.join(', ')} when ready. It also stays in Downloads.`);
      onDone();
    } catch (err) {
      const p = placeErrors(err, (k) => placed.has(k));
      setFields(p.fields);
      setForm(p.form);
    } finally {
      setBusy(null);
    }
  };
  return { busy, fields, setFields, form, reset, clearField, run };
}

export function FormatField({ value, onChange, error, hint }: { value: ExportFormatDto; onChange: (v: ExportFormatDto) => void; error?: string; hint?: React.ReactNode }) {
  return (
    <div>
      <FieldLabel label="Format" />
      <div className={cx('rounded-lg', error && 'ring-1 ring-[var(--tt-danger)]')}>
        <SegmentedControl options={FORMATS} value={value} onChange={onChange} />
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

export function ToggleRow({ title, description, checked, onChange, disabled }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 rounded-xl border border-line p-3', disabled && 'opacity-60')}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="text-[11px] text-fg-muted sm:text-xs">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

/** Two date inputs side by side (stacked on phones); errors keyed `<from>` / `<to>`. */
export function DateRangeFields({
  label,
  from,
  to,
  onChange,
  fromError,
  toError,
}: {
  label: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  fromError?: string;
  toError?: string;
}) {
  return (
    <>
      <TextField label={`${label} from`} type="date" value={from} max={to || undefined} onChange={(v) => onChange(v, to)} error={fromError} />
      <TextField label={`${label} to`} type="date" value={to} min={from || undefined} onChange={(v) => onChange(from, v)} error={toError} />
    </>
  );
}

/** "Email to" field, shown once Email is picked. */
export function EmailsField({ value, onChange, error, onHide, inputRef }: { value: string; onChange: (v: string) => void; error?: string; onHide: () => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div>
      <FieldLabel
        label="Email to"
        aside={
          <button type="button" onClick={onHide} className="mb-1.5 text-[11px] font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline">
            Don’t email
          </button>
        }
      />
      <div className={cx('relative flex h-10 w-full items-center gap-2 rounded-lg border bg-surface px-3 transition-colors focus-within:ring-1', error ? 'border-[var(--tt-danger)] focus-within:ring-[var(--tt-danger)]' : 'border-line focus-within:border-[var(--tt-primary)] focus-within:ring-[var(--tt-primary)]')}>
        <Mail className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          inputMode="email"
          autoComplete="email"
          value={value}
          aria-label="Email to"
          aria-invalid={Boolean(error) || undefined}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@company.com, accounts@company.com"
          className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0"
        />
      </div>
      <FieldMessage error={error} hint={`Up to ${EXPORT_MAX_EMAILS} addresses, separated by commas or spaces. The file also stays in Downloads.`} />
    </div>
  );
}

/** Cancel · Email · Download. Email first reveals the address field, then sends. */
export function DeliveryFooter({
  emailOpen,
  busy,
  disabled,
  onCancel,
  onDownload,
  onEmail,
}: {
  emailOpen: boolean;
  busy: Delivery | null;
  disabled?: boolean;
  onCancel: () => void;
  onDownload: () => void;
  onEmail: () => void;
}) {
  const locked = disabled || busy !== null;
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <Btn variant="ghost" onClick={onCancel} className="hidden sm:inline-flex">
        Cancel
      </Btn>
      <Btn
        variant={emailOpen ? 'primary' : 'secondary'}
        busy={busy === 'email'}
        disabled={locked && busy !== 'email'}
        icon={<Mail className="h-3.5 w-3.5" />}
        onClick={onEmail}
        className="flex-1 sm:flex-none"
      >
        {emailOpen ? 'Send email' : 'Email'}
      </Btn>
      <Btn
        variant={emailOpen ? 'secondary' : 'primary'}
        busy={busy === 'download'}
        disabled={locked && busy !== 'download'}
        icon={<Download className="h-3.5 w-3.5" />}
        onClick={onDownload}
        className="flex-1 sm:flex-none"
      >
        Download
      </Btn>
    </div>
  );
}
