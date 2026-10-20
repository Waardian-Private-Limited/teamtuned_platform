'use client';

import { useRef } from 'react';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { TaxProofDocument, TaxProofSection } from '@/features/payroll-setup/types/payroll-setup.model';
import type { MyProofs } from '../../hooks/useMyProofs';
import { errorClass } from './TaxFields';

function statusText(doc: TaxProofDocument): string {
  if (doc.status === 'accepted') return 'Accepted';
  if (doc.status === 'rejected') return doc.remarks ? `Rejected: ${doc.remarks}` : 'Rejected';
  return 'Waiting for HR';
}

/**
 * Proof files for one section, shown under its amount: each file as a chip (open, status,
 * remove) and one "Upload proof" button straight to the file picker. Uploading is hidden
 * while the proof window is closed; files already sent stay visible.
 */
export function ProofFiles({ section, proofs, canUpload }: { section: TaxProofSection; proofs: MyProofs; canUpload: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const docs = proofs.of(section);
  const uploading = proofs.busy === section;
  const error = proofs.errors[section];
  if (!canUpload && docs.length === 0 && !error) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {docs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className={cx(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border bg-surface py-1 pl-2.5 pr-1 text-xs',
                doc.status === 'rejected' ? 'border-[var(--tt-danger)]' : 'border-line'
              )}
            >
              <button
                type="button"
                onClick={() => proofs.open(doc)}
                className="max-w-[160px] truncate font-semibold text-fg underline-offset-2 hover:underline"
                title={doc.fileName}
              >
                {doc.fileName}
              </button>
              <span className={cx('flex min-w-0 items-center gap-1', doc.status === 'rejected' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>
                {doc.status === 'accepted' && <Check className="h-3 w-3 shrink-0 text-fg" />}
                <span className="truncate">{statusText(doc)}</span>
              </span>
              {doc.status !== 'accepted' ? (
                <button
                  type="button"
                  onClick={() => proofs.remove(doc)}
                  disabled={proofs.busy !== null}
                  aria-label={`Remove ${doc.fileName}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-40"
                >
                  {proofs.busy === `doc:${doc.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </button>
              ) : (
                <span className="w-1" />
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <div>
          <input
            ref={input}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) proofs.upload(section, file);
            }}
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={proofs.busy !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span>{uploading ? 'Uploading…' : 'Upload proof'}</span>
          </button>
        </div>
      )}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}
