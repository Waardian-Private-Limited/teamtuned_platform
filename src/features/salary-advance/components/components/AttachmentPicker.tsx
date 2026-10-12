'use client';

import React from 'react';
import { FileUp, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import { ATTACHMENT_ACCEPT } from '../../constants/salaryAdvance.constants';
import { useAttachmentUpload } from '../../hooks/useAttachmentUpload';
import type { UploadScope } from '../../api/salaryAdvance.api';
import type { UploadedFile } from '../../types/salaryAdvance.model';
import { fileSize } from '../../utils/format';

interface AttachmentPickerProps {
  label: string;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  max?: number;
  required?: boolean;
  error?: string;
  hint?: string;
  onBusyChange?: (busy: boolean) => void;
  scope?: UploadScope;
}

export function AttachmentPicker({ label, value, onChange, max = 3, required, error, hint, onBusyChange, scope = 'me' }: AttachmentPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { upload, isUploading, error: uploadError } = useAttachmentUpload(scope);

  React.useEffect(() => {
    onBusyChange?.(isUploading);
  }, [isUploading, onBusyChange]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const uploaded = await upload(file);
    if (uploaded) onChange([...value, uploaded]);
  };

  const message = error || uploadError;

  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="flex flex-col gap-2">
        {value.map((f) => (
          <div key={f.key} className="flex items-center gap-3 rounded-lg border border-line bg-bg-subtle/60 px-3 py-2">
            <FileUp className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{f.name}</span>
              <span className="block text-[11px] text-fg-muted">{fileSize(f.size)}</span>
            </span>
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(value.filter((x) => x.key !== f.key))} className="rounded-md p-1 text-fg-muted hover:bg-surface hover:text-fg">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cx(
              'flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed text-xs font-semibold transition-colors sm:text-sm',
              message ? 'border-[var(--tt-danger)] text-[var(--tt-danger)]' : 'border-line-strong text-fg-muted hover:border-fg hover:text-fg',
              isUploading && 'cursor-wait opacity-70'
            )}
          >
            {isUploading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <FileUp className="h-4 w-4" />}
            {isUploading ? 'Uploading…' : 'Attach a file'}
          </button>
        )}
        <input ref={inputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={pick} className="hidden" />
      </div>
      <FieldMessage error={message} hint={hint ?? 'PDF, JPG or PNG, up to 5 MB'} />
    </div>
  );
}
