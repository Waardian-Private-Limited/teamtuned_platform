'use client';

import Link from 'next/link';
import { ArrowLeft, Archive, CheckCircle2, Download, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { RosterRow } from '../../../types/roster.types';
import type { SaveState } from '../../../hooks/useRosterBoard';
import { formatDay } from '../../../utils/rosterTime';
import { RosterStatusPill } from './RosterStatusPill';

interface Props {
  roster: RosterRow;
  unitName: string;
  backHref: string;
  canEdit: boolean;
  canPublish: boolean;
  saveState: SaveState;
  validating: boolean;
  generating: boolean;
  hasAssignments: boolean;
  onGenerate: () => void;
  onValidate: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onExport: () => void;
}

const ghost = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm';
const solid = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] transition-colors hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm';

export function BoardHeader(p: Props) {
  const r = p.roster;
  const archived = r.status === 'archived';
  const publishable = p.canPublish && !archived && !p.generating && (r.status === 'review' || (r.status === 'published' && r.version > r.published_version));
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5">
      <div className="flex items-start gap-3">
        <Link href={p.backHref} aria-label="Back to rosters" className="mt-0.5 rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-bold tracking-tight text-fg sm:text-lg">{p.unitName}</h1>
            <RosterStatusPill status={r.status} />
            <span className="rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted">v{r.version}</span>
            <span className={cx('text-[11px] font-medium text-fg-muted transition-opacity duration-200', p.saveState === 'idle' ? 'opacity-0' : 'opacity-100')} aria-live="polite">
              {p.saveState === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          </div>
          <p className="text-xs text-fg-muted">
            {formatDay(r.period_start)} – {formatDay(r.period_end, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {p.canEdit && !archived && (
          <button type="button" className={solid} disabled={p.generating} onClick={p.onGenerate}>
            {p.hasAssignments ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {p.hasAssignments ? 'Regenerate' : 'Generate'}
          </button>
        )}
        <button type="button" className={ghost} disabled={p.generating || p.validating || !p.hasAssignments} onClick={p.onValidate}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {p.validating ? 'Checking…' : 'Validate'}
        </button>
        {publishable && (
          <button type="button" className={ghost} onClick={p.onPublish}>
            <Upload className="h-3.5 w-3.5" />
            Publish
          </button>
        )}
        <button type="button" className={cx(ghost, 'sm:ml-auto')} disabled={p.generating || !p.hasAssignments} onClick={p.onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        {p.canEdit && !archived && (
          <button type="button" className={ghost} disabled={p.generating} onClick={p.onArchive}>
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        )}
      </div>
    </div>
  );
}
