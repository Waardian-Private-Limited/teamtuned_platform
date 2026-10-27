'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import type { Device } from '../../types/labour.types';
import { ago, fmtDateTime } from '../../utils/format';
import { Pill } from '../shared/Primitives';

export function presence(d: Pick<Device, 'online' | 'lastSeenAt' | 'status' | 'revokedAt'>): { tone: 'good' | 'bad' | 'neutral'; label: string; detail: string } {
  if (d.status === 'revoked') return { tone: 'bad', label: d.revokedAt ? `Revoked on ${fmtDateTime(d.revokedAt)}` : 'Revoked', detail: 'Access was revoked. Restore it, then sign the machine in again with a site login to use it.' };
  if (d.online) return { tone: 'good', label: 'Online', detail: `Last heard from ${ago(d.lastSeenAt)}.` };
  if (!d.lastSeenAt) return { tone: 'neutral', label: 'Never connected', detail: 'This machine has not reported in yet.' };
  return { tone: 'bad', label: `Offline since ${fmtDateTime(d.lastSeenAt)}`, detail: `No heartbeat for ${ago(d.lastSeenAt).replace(' ago', '')}. Punches taken meanwhile are stored on the machine and upload when it reconnects.` };
}

function Metric({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return <div className="min-w-0"><dt className="text-[11px] text-fg-muted">{label}</dt><dd className={cx('truncate text-sm font-bold tabular-nums', warn ? 'text-[var(--tt-danger)]' : 'text-fg')}>{value}</dd></div>;
}

export function DeviceCard({ d, onOpen }: { d: Device; onOpen: () => void }) {
  const m = d.metrics;
  const p = presence(d);
  const hot = (m?.tempC ?? 0) >= 75;
  return (
    <button type="button" onClick={onOpen} className={cx('flex min-w-0 flex-col gap-3 rounded-xl border bg-surface p-4 text-left shadow-[var(--tt-shadow-sm)] transition-colors hover:bg-bg-subtle/50', d.online ? 'border-line' : 'border-line-strong')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-bold text-fg"><span aria-hidden className={cx('h-2.5 w-2.5 shrink-0 rounded-full', d.online ? 'bg-[var(--tt-success)]' : d.status === 'revoked' ? 'bg-[var(--tt-danger)]' : 'bg-fg-subtle')} />{d.name || d.uid}</p>
          <p className="truncate text-[11px] text-fg-muted">{d.siteName || 'No site'}</p>
        </div>
        <Pill tone={p.tone}>{d.online ? 'Online' : d.status === 'revoked' ? 'Revoked' : 'Offline'}</Pill>
      </div>
      {!d.online && <p className="text-xs font-medium text-fg">{p.label}</p>}
      {d.online && <p className="text-xs text-fg-muted">Seen {ago(d.lastSeenAt)}</p>}
      <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
        <Metric label="Temp" value={m?.tempC != null ? `${m.tempC.toFixed(0)} °C` : '—'} warn={hot} />
        <Metric label="CPU" value={m?.cpu != null ? `${Math.round(m.cpu)} %` : '—'} />
        <Metric label="Outbox" value={m?.outboxPending ?? '—'} warn={(m?.outboxPending ?? 0) > 50} />
        <Metric label="Faces" value={m?.galleryCount ?? '—'} />
        <Metric label="Sync" value={m ? `${m.galleryCursor ?? 0}/${d.gallerySeq ?? 0}` : '—'} />
        <Metric label="AI" value={m?.aiMode ?? '—'} />
      </dl>
      {(d.pendingChanges ?? 0) > 0 && <p className="text-xs font-semibold text-fg">{d.pendingChanges} labour change{d.pendingChanges === 1 ? '' : 's'} waiting{d.online ? ' to sync' : ' — machine offline'}</p>}
      {d.galleryFailures > 0 && <p className="text-xs font-semibold text-[var(--tt-danger)]">{d.galleryFailures} face{d.galleryFailures === 1 ? '' : 's'} failed to load</p>}
    </button>
  );
}
