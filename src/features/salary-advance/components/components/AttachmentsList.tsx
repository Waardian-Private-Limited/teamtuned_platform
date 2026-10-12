'use client';

import React from 'react';
import { FileText, ImageIcon, Paperclip, ShieldCheck } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/salaryAdvance.api';
import type { AdvanceAttachment } from '../../types/salaryAdvance.model';
import { fileSize } from '../../utils/format';

interface AttachmentsListProps {
  advanceId: number;
  attachments: AdvanceAttachment[];
  hasProof?: boolean;
  disbursementReference?: string | null;
}

export function AttachmentsList({ advanceId, attachments, hasProof, disbursementReference }: AttachmentsListProps) {
  const [opening, setOpening] = React.useState<number | 'proof' | null>(null);
  const [error, setError] = React.useState('');

  const open = async (index: number | 'proof') => {
    setOpening(index);
    setError('');
    const tab = window.open('', '_blank');
    try {
      const { url } = await api.attachmentUrl(advanceId, index);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } catch (err) {
      tab?.close();
      setError(messageOf(err));
    } finally {
      setOpening(null);
    }
  };

  if (!attachments.length && !hasProof && !disbursementReference) {
    return <p className="text-sm text-fg-muted">No documents attached.</p>;
  }

  const itemClass = 'flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle disabled:opacity-60';

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((a) => (
        <button key={a.index} type="button" onClick={() => open(a.index)} disabled={opening === a.index} className={itemClass}>
          {a.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 shrink-0 text-fg-muted" /> : <FileText className="h-4 w-4 shrink-0 text-fg-muted" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">{a.name}</span>
            <span className="block text-[11px] text-fg-muted">{fileSize(a.size)}</span>
          </span>
          {opening === a.index ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fg border-t-transparent" /> : <Paperclip className="h-3.5 w-3.5 text-fg-subtle" />}
        </button>
      ))}
      {(hasProof || disbursementReference) && (
        <button type="button" onClick={() => hasProof && open('proof')} disabled={!hasProof || opening === 'proof'} className={itemClass}>
          <ShieldCheck className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">Payout proof</span>
            <span className="block truncate text-[11px] text-fg-muted">{disbursementReference ? `Reference ${disbursementReference}` : 'Uploaded by Accounts'}</span>
          </span>
          {hasProof && (opening === 'proof' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fg border-t-transparent" /> : <Paperclip className="h-3.5 w-3.5 text-fg-subtle" />)}
        </button>
      )}
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}
