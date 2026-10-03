'use client';

import { ChevronLeft, Download, FileArchive, FileText, Loader2, RotateCw, Trash2, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { cx } from '@/theme/tokens';
import { useDownloadCenter } from '../context/DownloadCenterContext';
import type { ExportJobDto } from '../types/downloads.dto';

function size(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function when(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusLine(job: ExportJobDto) {
  switch (job.status) {
    case 'queued':
      return job.queue_position ? `Waiting in queue · ${job.queue_position} ahead` : 'Waiting in queue · starting soon';
    case 'running':
      return job.total > 1 ? `Preparing · ${job.processed} of ${job.total}` : 'Preparing…';
    case 'done':
      return [size(job.file_size), job.expires_at && `available until ${when(job.expires_at)}`].filter(Boolean).join(' · ');
    case 'failed':
      return job.error || 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired. Request it again if you still need it.';
    default:
      return '';
  }
}

function JobRow({ job }: { job: ExportJobDto }) {
  const { download, cancel, remove } = useDownloadCenter();
  const active = job.status === 'queued' || job.status === 'running';
  const Icon = job.file_name?.endsWith('.zip') ? FileArchive : FileText;
  return (
    <li className="rounded-lg border border-line p-3">
      <div className="flex items-start gap-2.5">
        <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', job.status === 'done' ? 'text-[var(--tt-primary)]' : 'text-fg-muted')} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg" title={job.title}>{job.title}</p>
          <p className={cx('text-xs', job.status === 'failed' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>{statusLine(job)}</p>
          <p className="text-[11px] text-fg-subtle">Requested {when(job.created_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {job.status === 'done' && (
            <button
              type="button"
              onClick={() => download(job)}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          )}
          {active ? (
            <button type="button" onClick={() => cancel(job)} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle" title="Cancel" aria-label="Cancel">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={() => remove(job)} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle" title="Remove from list" aria-label="Remove">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {active && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
          <div
            className={cx('h-full rounded-full bg-[var(--tt-primary)] transition-all duration-500', job.status === 'queued' && 'w-1/12 animate-pulse')}
            style={job.status === 'running' ? { width: `${Math.max(4, job.progress)}%` } : undefined}
          />
        </div>
      )}
    </li>
  );
}

/** Right-edge tab on every page that opens the user's Download Centre. */
export function DownloadCenter() {
  const { jobs, open, setOpen, activeCount, loading, refresh } = useDownloadCenter();
  const readyCount = jobs.filter((j) => j.status === 'done').length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Download Centre"
        title="Download Centre"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-line bg-surface px-1.5 py-2.5 text-fg-muted shadow-[var(--tt-shadow-lg)] transition-colors hover:text-fg"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {activeCount > 0 ? <Loader2 className="h-4 w-4 animate-spin text-[var(--tt-primary)]" /> : <Download className="h-4 w-4" />}
        {(activeCount > 0 || readyCount > 0) && (
          <span className="min-w-[18px] rounded-full bg-[var(--tt-primary)] px-1 text-center text-[10px] font-bold leading-[18px] text-[var(--tt-on-primary)]">
            {activeCount || readyCount}
          </span>
        )}
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Download Centre">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">
            Large downloads are prepared in the background. You can keep working; we will notify you when a file is ready.
          </p>
          <button type="button" onClick={() => refresh()} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle" title="Refresh" aria-label="Refresh">
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
        {loading && !jobs.length ? (
          <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-muted">
            No downloads yet. Use a Download button anywhere in the app and it will appear here.
          </div>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}
