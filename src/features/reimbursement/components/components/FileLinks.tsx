'use client';

import React from 'react';
import { FileText, ImageIcon } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { fileSize } from '../../utils/format';

/**
 * Opens a stored file through a presigned link. The tab opens at once (so the browser does not
 * block it) and is pointed at the link when it arrives.
 */
export function useLinkOpener() {
  const [opening, setOpening] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const open = React.useCallback(async (id: string, link: () => Promise<{ url: string }>) => {
    setOpening(id);
    setError('');
    const tab = window.open('', '_blank');
    try {
      const { url } = await link();
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } catch (err) {
      tab?.close();
      setError(messageOf(err));
    } finally {
      setOpening(null);
    }
  }, []);
  return { open, opening, error };
}

/** One stored file as a button that opens it. */
export function FileChip({ name, size, type, busy, onClick }: { name: string; size?: number | null; type?: string | null; busy?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-60"
    >
      {busy ? (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-fg border-t-transparent" />
      ) : type?.startsWith('image/') ? (
        <ImageIcon className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />
      )}
      <span className="truncate">{name}</span>
      {size ? <span className="shrink-0 font-normal text-fg-muted">{fileSize(size)}</span> : null}
    </button>
  );
}
