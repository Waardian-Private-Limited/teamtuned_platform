'use client';

import React from 'react';
import { FileText, ImageIcon, Paperclip, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import { ATTACHMENT_ACCEPT } from '../constants/bill.constants';
import { useAttachmentUpload } from '../hooks/useAttachmentUpload';
import type { LineAttachment, UploadedFile } from '../types/bill.model';
import { fileSize } from '../utils/format';

interface ReceiptPickerProps {
  label: string;
  value: LineAttachment[];
  onChange: (files: LineAttachment[]) => void;
  max?: number;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Stores one file (the feature's attachment endpoint). Must be stable. */
  store: (file: File) => Promise<UploadedFile>;
  onBusyChange?: (busy: boolean) => void;
  compact?: boolean;
  /** Text of the add button before any file is attached. */
  addLabel?: string;
  /** A file was uploaded and stored under `key` (the form keeps it to preview from the browser). */
  onUploaded?: (key: string, file: File) => void;
}

export function ReceiptPicker({ label, value, onChange, max = 5, required, error, hint, store, onBusyChange, compact, addLabel = 'Attach receipt', onUploaded }: ReceiptPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { upload, isUploading, error: uploadError } = useAttachmentUpload(store);

  React.useEffect(() => {
    onBusyChange?.(isUploading);
  }, [isUploading, onBusyChange]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const uploaded = await upload(file);
    if (!uploaded) return;
    if (uploaded.key) onUploaded?.(uploaded.key, file);
    onChange([...value, { index: value.length, name: uploaded.name, size: uploaded.size, type: uploaded.type, key: uploaded.key }]);
  };

  const message = error || uploadError;

  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className={cx('flex flex-col gap-2', compact && 'sm:flex-row sm:flex-wrap')}>
        {value.map((f, i) => (
          <div key={f.key || `old-${f.index}`} className={cx('flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2', f.key ? 'border-line bg-bg-subtle/60' : 'border-dashed border-line-strong', compact && 'sm:max-w-[16rem]')}>
            {f.type?.startsWith('image/') ? <ImageIcon className="h-4 w-4 shrink-0 text-fg-muted" /> : <FileText className="h-4 w-4 shrink-0 text-fg-muted" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-fg sm:text-sm">{f.name}</span>
              <span className="block text-[11px] text-fg-muted">{f.key ? (f.size ? fileSize(f.size) : 'Attached') : 'Attach it again to keep it'}</span>
            </span>
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded-md p-1 text-fg-muted hover:bg-surface hover:text-fg">
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
              'flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-xs font-semibold transition-colors sm:text-sm',
              compact ? 'w-full sm:w-auto' : 'w-full',
              message ? 'border-[var(--tt-danger)] text-[var(--tt-danger)]' : 'border-line-strong text-fg-muted hover:border-fg hover:text-fg',
              isUploading && 'cursor-wait opacity-70'
            )}
          >
            {isUploading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Paperclip className="h-4 w-4" />}
            {isUploading ? 'Uploading…' : value.length ? 'Add another' : addLabel}
          </button>
        )}
        <input ref={inputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={pick} className="hidden" />
      </div>
      <FieldMessage error={message} hint={hint ?? 'PDF, JPG or PNG, up to 5 MB'} />
    </div>
  );
}
