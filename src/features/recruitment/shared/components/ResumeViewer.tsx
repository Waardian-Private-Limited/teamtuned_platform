'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileText, RotateCcw } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import { getResumeUrl } from '../api/recruitment.api';
import type { ResumeUrlDto } from '../types/recruitment.dto';
import { openAsync } from '../utils/format';

type State =
  | { status: 'loading' }
  | { status: 'ready'; link: ResumeUrlDto }
  | { status: 'error'; message: string };

const toolBtn =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]';

/**
 * The candidate's resume shown in the page. PDFs render inline from a short-lived private link
 * (fetched again on Reload or when opened in a new tab); Word files cannot render in a browser,
 * so they get a download button instead.
 */
export function ResumeViewer({ candidateId, fileName, className }: { candidateId: number; fileName?: string | null; className?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setState({ status: 'loading' });
    try {
      const link = await getResumeUrl(candidateId);
      if (mine === seq.current) setState({ status: 'ready', link });
    } catch (err) {
      if (mine === seq.current) setState({ status: 'error', message: messageOf(err) });
    }
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const openFresh = () => openAsync(async () => (await getResumeUrl(candidateId)).url).catch((err) => setState({ status: 'error', message: messageOf(err) }));
  const name = (state.status === 'ready' && state.link.name) || fileName || 'Resume';
  const isPdf = state.status === 'ready' && state.link.type !== 'word';

  return (
    <div className={cx('flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface', className)}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <FileText className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{name}</p>
        <button type="button" onClick={load} className={toolBtn} aria-label="Reload resume">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">Reload</span>
        </button>
        <button type="button" onClick={openFresh} className={toolBtn}>
          {isPdf || state.status !== 'ready' ? <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="hidden sm:inline">{isPdf || state.status !== 'ready' ? 'Open in new tab' : 'Download'}</span>
        </button>
      </div>
      <div className="relative min-h-[60vh] flex-1 bg-bg-subtle">
        {state.status === 'loading' && <div className="absolute inset-0 animate-pulse bg-bg-subtle" aria-busy="true" aria-label="Loading resume" />}
        {state.status === 'error' && (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-semibold text-fg">Could not load the resume</p>
            <p className="max-w-sm text-xs text-fg-muted">{state.message}</p>
            <button type="button" onClick={load} className={toolBtn}><RotateCcw className="h-3.5 w-3.5" /> Try again</button>
          </div>
        )}
        {state.status === 'ready' && isPdf && (
          <iframe
            key={state.link.url}
            src={`${state.link.url}#view=FitH&toolbar=1`}
            title={`Resume: ${name}`}
            className="absolute inset-0 h-full w-full border-0 bg-surface"
            referrerPolicy="no-referrer"
          />
        )}
        {state.status === 'ready' && !isPdf && (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <FileText className="h-8 w-8 text-fg-subtle" aria-hidden="true" />
            <p className="text-sm font-semibold text-fg">Word documents cannot be shown here</p>
            <p className="max-w-sm text-xs text-fg-muted">Download the file to read it.</p>
            <button type="button" onClick={openFresh} className={toolBtn}><Download className="h-3.5 w-3.5" /> Download resume</button>
          </div>
        )}
      </div>
    </div>
  );
}
