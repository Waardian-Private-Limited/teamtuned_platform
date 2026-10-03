'use client';

import { useRef } from 'react';
import { AlertCircle, CheckCircle2, UploadCloud } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { VaultDocumentDto } from '../types/employee-onboarding.dto';

const ACCEPT_MIME: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' };

export function DocumentUploadRow({
  label,
  accept,
  uploaded,
  isUploading,
  progress,
  onPick,
  errorText,
  locked = false,
}: {
  label: string;
  accept: string[];
  uploaded?: VaultDocumentDto;
  isUploading: boolean;
  progress: number;
  onPick: (file: File) => void;
  locked?: boolean;
  errorText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rejected = uploaded?.status === 'rejected';
  const verified = uploaded?.status === 'verified';
  const message = errorText ?? (rejected ? `Rejected${uploaded?.remarks ? `: ${uploaded.remarks}` : ''}. Upload it again.` : undefined);

  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5',
        locked ? 'cursor-default opacity-70' : 'cursor-pointer',
        message ? 'border-[var(--tt-danger)]' : 'border-line'
      )}
      onClick={() => !isUploading && !locked && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept.map((a) => ACCEPT_MIME[a] || '').join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
      {rejected ? (
        <AlertCircle className="h-5 w-5 text-[var(--tt-danger)]" />
      ) : uploaded ? (
        <CheckCircle2 className="h-5 w-5 text-[var(--tt-primary)]" />
      ) : (
        <UploadCloud className="h-5 w-5 text-fg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-fg">
          {label}
          {verified && <span className="ml-1.5 text-xs font-semibold text-[var(--tt-success)]">Verified</span>}
        </p>
        {uploaded?.number_last4 && <p className="text-xs text-fg-muted">•••• {uploaded.number_last4}</p>}
        {isUploading && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-bg-subtle">
            <div className="h-full bg-[var(--tt-primary)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {message && <p className="mt-0.5 text-xs font-medium text-[var(--tt-danger)]">{message}</p>}
      </div>
      {!isUploading && !locked && (
        <span className="shrink-0 text-xs font-semibold text-[var(--tt-primary)]">{rejected ? 'Re-upload' : uploaded ? 'Replace' : 'Upload'}</span>
      )}
    </div>
  );
}
