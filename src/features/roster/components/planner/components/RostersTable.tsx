'use client';

import { Archive, Download, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { RosterRow } from '../../../types/roster.types';
import { formatDay } from '../../../utils/rosterTime';
import { RosterStatusPill } from './RosterStatusPill';

interface Props {
  rows: RosterRow[];
  canEdit: boolean;
  canDelete: boolean;
  busyId: number | null;
  onOpen: (row: RosterRow) => void;
  onArchive: (row: RosterRow) => void;
  onDelete: (row: RosterRow) => void;
  onExport: (row: RosterRow) => void;
}

function period(r: RosterRow) {
  return `${formatDay(r.period_start)} – ${formatDay(r.period_end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function publishedAt(r: RosterRow) {
  return r.published_at ? formatDay(r.published_at.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function coverage(r: RosterRow) {
  return r.summary ? `${r.summary.coverage.percent}%` : '—';
}

function violations(r: RosterRow) {
  return r.summary ? r.summary.violationCount : null;
}

function Actions({ row, canEdit, canDelete, busy, onArchive, onDelete, onExport }: { row: RosterRow; canEdit: boolean; canDelete: boolean; busy: boolean; onArchive: Props['onArchive']; onDelete: Props['onDelete']; onExport: Props['onExport'] }) {
  const canExport = row.status !== 'generating' && row.status !== 'failed' && (row.summary !== null || row.status === 'published');
  const canArchive = canEdit && row.status !== 'archived' && row.status !== 'generating';
  const canRemove = canDelete && row.status !== 'published' && row.status !== 'generating';
  if (!canExport && !canArchive && !canRemove) return null;
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {canExport && (
        <button type="button" onClick={() => onExport(row)} aria-label="Download roster" title="Download PDF or Excel" className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
          <Download className="h-4 w-4" />
        </button>
      )}
      {canArchive && (
        <button type="button" disabled={busy} onClick={() => onArchive(row)} aria-label="Archive roster" title="Archive" className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-40">
          <Archive className="h-4 w-4" />
        </button>
      )}
      {canRemove && (
        <button type="button" disabled={busy} onClick={() => onDelete(row)} aria-label="Delete roster" title="Delete" className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function RostersTable({ rows, canEdit, canDelete, busyId, onOpen, onArchive, onDelete, onExport }: Props) {
  return (
    <>
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-bg-subtle text-xs font-semibold text-fg-muted">
            <tr>
              <th className="px-5 py-2.5">Team</th>
              <th className="px-3 py-2.5">Period</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Coverage</th>
              <th className="px-3 py-2.5 text-right">Issues</th>
              <th className="px-3 py-2.5">Published</th>
              <th className="w-28 px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((r) => {
              const v = violations(r);
              return (
                <tr key={r.id} onClick={() => onOpen(r)} className="cursor-pointer transition-colors hover:bg-bg-subtle/60">
                  <td className="px-5 py-3 font-semibold text-fg">{r.unit_name}</td>
                  <td className="px-3 py-3 text-fg-muted">{period(r)}</td>
                  <td className="px-3 py-3"><RosterStatusPill status={r.status} /></td>
                  <td className="px-3 py-3 text-right font-semibold text-fg">{coverage(r)}</td>
                  <td className={cx('px-3 py-3 text-right font-semibold', v ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>{v === null ? '—' : v}</td>
                  <td className="px-3 py-3 text-fg-muted">{publishedAt(r)}</td>
                  <td className="px-5 py-3"><Actions row={r} canEdit={canEdit} canDelete={canDelete} busy={busyId === r.id} onArchive={onArchive} onDelete={onDelete} onExport={onExport} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
        {rows.map((r) => {
          const v = violations(r);
          return (
            <div key={r.id} onClick={() => onOpen(r)} className="cursor-pointer px-4 py-3.5 active:bg-bg-subtle">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{r.unit_name}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">{period(r)}</p>
                </div>
                <RosterStatusPill status={r.status} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-fg-muted">
                <span>
                  Coverage <b className="text-fg">{coverage(r)}</b>
                  <span className="mx-1.5">·</span>
                  Issues <b className={v ? 'text-[var(--tt-danger)]' : 'text-fg'}>{v === null ? '—' : v}</b>
                  <span className="mx-1.5">·</span>
                  {publishedAt(r)}
                </span>
                <Actions row={r} canEdit={canEdit} canDelete={canDelete} busy={busyId === r.id} onArchive={onArchive} onDelete={onDelete} onExport={onExport} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
