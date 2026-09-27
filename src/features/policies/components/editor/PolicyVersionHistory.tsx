'use client';

import { Eye, History, RotateCcw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { PolicyVersion } from '../../types/policies.model';

interface PolicyVersionHistoryProps {
  versions: PolicyVersion[];
  isSaving: boolean;
  canEdit: boolean;
  onRollback: (versionId: number) => void;
  onView: (version: PolicyVersion) => void;
}

const STATUS_TONE: Record<string, string> = {
  draft: 'border-line bg-bg-subtle text-fg-muted',
  published: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
  superseded: 'border-line bg-surface text-fg-subtle',
};

export function PolicyVersionHistory({ versions, isSaving, canEdit, onRollback, onView }: PolicyVersionHistoryProps) {
  if (!versions.length) return null;

  return (
    <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-fg-muted" />
        <h3 className="text-sm font-semibold text-fg">Version history</h3>
      </div>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 p-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-fg">v{v.versionNo}</span>
                <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', STATUS_TONE[v.status] ?? STATUS_TONE.draft)}>
                  {v.status}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-fg-muted">
                {v.changeNote || 'No change note'} · effective {v.effectiveFrom}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onView(v)}
                aria-label={`View configuration of version ${v.versionNo}`}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
              >
                <Eye className="h-3 w-3" /> View
              </button>
              {canEdit && v.status === 'superseded' && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => onRollback(v.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" /> Roll back
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
