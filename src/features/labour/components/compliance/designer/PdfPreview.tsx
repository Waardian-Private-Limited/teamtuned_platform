'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import * as api from '../../../api/labour.api';
import { parseLabourError } from '../../../utils/errors';
import { secondaryBtn } from '../../shared/Primitives';

/** Live PDF preview of the saved template, with sample values. `version` changes after each save. */
export function PdfPreview({ templateId, version }: { templateId: number | null; version: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!templateId) { setUrl(null); return; }
    let off = false;
    let made: string | null = null;
    setLoading(true);
    setError('');
    api.templatePreviewPdf(templateId)
      .then((b) => { if (off) return; made = URL.createObjectURL(b); setUrl(made); })
      .catch((e) => { if (!off) setError(parseLabourError(e).message); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; if (made) URL.revokeObjectURL(made); };
  }, [templateId, version, tick]);

  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-line bg-bg-subtle">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
        <p className="text-xs font-semibold text-fg">Preview <span className="font-normal text-fg-muted">· sample values, last saved version</span></p>
        <button type="button" className={secondaryBtn} disabled={!templateId || loading} onClick={() => setTick((t) => t + 1)}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />Refresh</button>
      </div>
      <div className="relative flex-1">
        {!templateId ? <p className="p-6 text-center text-sm text-fg-muted">Save the form once to see its PDF preview here.</p>
          : error ? <p role="alert" className="p-6 text-center text-sm font-medium text-[var(--tt-danger)]">{error}</p>
          : url ? <iframe title="Form preview" src={url} className="absolute inset-0 h-full w-full rounded-b-xl bg-white" />
          : <div className="m-4 h-40 animate-pulse rounded-lg bg-surface" />}
      </div>
    </div>
  );
}
