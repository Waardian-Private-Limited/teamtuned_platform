'use client';

import { useEffect, useState } from 'react';
import { cx } from '@/theme/tokens';

/** Shows a PDF blob in the page (object URL, revoked on change). */
export function PdfFrame({ blob, loading, error, title, className }: { blob: Blob | null; loading?: boolean; error?: string | null; title: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <div className={cx('relative overflow-hidden rounded-xl border border-line bg-bg-subtle', className)}>
      {url && <iframe src={`${url}#view=FitH&toolbar=0`} title={title} className="absolute inset-0 h-full w-full border-0 bg-surface" />}
      {!url && !error && <div className={cx('absolute inset-0', loading && 'animate-pulse')} aria-busy={loading || undefined} />}
      {loading && url && <div className="absolute right-3 top-3 rounded-md bg-surface/90 px-2 py-1 text-[11px] font-semibold text-fg-muted shadow-xs">Updating…</div>}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-sm text-sm font-medium text-[var(--tt-danger)]">{error}</p>
        </div>
      )}
    </div>
  );
}
