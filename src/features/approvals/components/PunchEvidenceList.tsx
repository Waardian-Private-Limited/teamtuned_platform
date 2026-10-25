'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Camera, ImageOff, MapPinOff, Moon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { mapSrc } from '@/features/detailed-attendance/components/components/PunchCard';
import * as api from '../api/approvals.api';
import type { PunchEvidence } from '../types/approvals';

const ISSUE_TEXT: Record<string, string> = { face: 'Face did not match', face_unavailable: 'Face check unavailable' };
const STATE_TEXT: Record<string, string> = { approved: 'Accepted', rejected: 'Not accepted', pending: 'Awaiting review' };

const label = (p: PunchEvidence) => (p.kind === 'night_ot' ? (p.direction === 'in' ? 'Night OT start' : 'Night OT end') : p.direction === 'in' ? 'Check-in' : 'Check-out');

function Selfie({ requestId, punch }: { requestId: number; punch: PunchEvidence }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => {
    if (punch.id === null) return undefined;
    const controller = new AbortController();
    setState('loading');
    api.getPunchImage(requestId, punch.id, controller.signal)
      .then((res) => { setUrl(res.url); setState('ready'); })
      .catch(() => { if (!controller.signal.aborted) setState('failed'); });
    return () => controller.abort();
  }, [requestId, punch.id]);
  return (
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-bg-subtle">
      {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-bg-subtle" />}
      {state === 'failed' && <span className="flex h-full flex-col items-center justify-center gap-1 text-[11px] text-fg-muted"><ImageOff className="h-4 w-4" aria-hidden /> Photo unavailable</span>}
      {state === 'ready' && url && (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open the ${label(punch).toLowerCase()} photo`} className="block h-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link, not an optimisable asset */}
          <img src={url} alt={`${label(punch)} photo`} className="h-full w-full object-cover" loading="lazy" />
        </a>
      )}
      <span className="pointer-events-none absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-[var(--tt-overlay)] px-1.5 py-0.5 text-[9px] font-semibold text-white"><Camera className="h-2.5 w-2.5" aria-hidden /> Selfie</span>
    </div>
  );
}

function Row({ requestId, punch }: { requestId: number; punch: PunchEvidence }) {
  const Icon = punch.kind === 'night_ot' ? Moon : punch.direction === 'in' ? ArrowDownToLine : ArrowUpFromLine;
  const meta = [
    punch.place || 'Unknown place',
    punch.outside ? `Outside the site${punch.distance_m !== null ? `, ${punch.distance_m} m away` : ''}` : null,
    ...punch.issues.map((i) => ISSUE_TEXT[i]).filter(Boolean),
    punch.accuracy_m ? `GPS within ${Math.round(punch.accuracy_m)} m` : null,
    punch.reason ? `Reason: ${punch.reason}` : null,
    STATE_TEXT[punch.review_state] || null,
  ].filter(Boolean).join(' · ');
  const hasPoint = punch.lat !== null && punch.lng !== null;
  const showMedia = !punch.voided && (hasPoint || (punch.has_image && punch.id !== null));
  return (
    <li className={cx('rounded-xl border border-line p-3', punch.voided && 'opacity-60')}>
      <div className="flex items-start gap-2.5">
        <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cx('text-sm font-bold text-fg', punch.voided && 'line-through')}>{label(punch)}</p>
            <span className={cx('shrink-0 text-sm font-bold tabular-nums text-fg', punch.voided && 'line-through')}>{punch.time}</span>
          </div>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-fg-muted">{meta}</p>
          {punch.voided && <p className="mt-0.5 text-xs text-fg-muted">Replaced</p>}
        </div>
      </div>
      {showMedia && (
        <div className="mt-2.5 flex items-stretch gap-2">
          {hasPoint ? (
            <div className="relative h-28 min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-bg-subtle">
              <iframe title={`${label(punch)} location`} src={mapSrc(punch.lat as number, punch.lng as number)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-full w-full border-0" allowFullScreen />
            </div>
          ) : <p className="flex flex-1 items-center gap-1.5 text-xs text-fg-muted"><MapPinOff className="h-3.5 w-3.5" aria-hidden /> Location was not recorded</p>}
          {punch.has_image && punch.id !== null && <Selfie requestId={requestId} punch={punch} />}
        </div>
      )}
    </li>
  );
}

/** The day's punches behind an attendance request: time, place, map point and selfie, as in the attendance popup. */
export function PunchEvidenceList({ requestId, punches }: { requestId: number; punches: PunchEvidence[] }) {
  return (
    <section aria-label="Punches">
      <p className="mb-2 text-xs font-semibold text-fg">Punches</p>
      <ul className="space-y-2">{punches.map((p, i) => <Row key={p.id ?? i} requestId={requestId} punch={p} />)}</ul>
    </section>
  );
}
