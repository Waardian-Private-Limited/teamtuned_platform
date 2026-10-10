'use client';

import { ArrowDownToLine, ArrowUpFromLine, Camera, ImageOff, MapPinOff, Moon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FACE_TEXT, LOCATION_TEXT, SOURCE_TEXT } from '../../constants/detailed.constants';
import { usePunchImage } from '../../hooks/usePunchImage';
import type { Punch } from '../../types/detailed.model';
import { punchTimeText } from '../../utils/format';
import { Skeleton } from './controls';

const label = (p: Punch) => (p.kind === 'night_ot' ? (p.direction === 'in' ? 'Night OT start' : 'Night OT end') : p.direction === 'in' ? 'Check-in' : 'Check-out');

/** Google's embeddable map for a point, the same view the old attendance screen showed. */
export const mapSrc = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}&output=embed&z=15`;

function Selfie({ punch }: { punch: Punch }) {
  const { url, state } = usePunchImage(punch.id, punch.hasImage && !punch.voided);
  if (!punch.hasImage) return null;
  return (
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-bg-subtle">
      {state === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
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

function Place({ punch }: { punch: Punch }) {
  if (punch.lat === null || punch.lng === null) {
    return <p className="flex items-center gap-1.5 text-xs text-fg-muted"><MapPinOff className="h-3.5 w-3.5" aria-hidden /> Location was not recorded</p>;
  }
  return (
    <div className="relative h-28 min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-bg-subtle">
      <iframe title={`${label(punch)} location`} src={mapSrc(punch.lat, punch.lng)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-full w-full border-0" allowFullScreen />
    </div>
  );
}

/**
 * One check-in or check-out: when and where (place name, inside or outside the site, face match,
 * how it was recorded), the spot on a map and the selfie taken at that moment. A punch HR
 * replaced stays on the list, struck through, so nothing disappears silently.
 */
export function PunchCard({ punch, workDate, tz }: { punch: Punch; workDate: string; tz: string }) {
  const Icon = punch.kind === 'night_ot' ? Moon : punch.direction === 'in' ? ArrowDownToLine : ArrowUpFromLine;
  const meta = [punch.place, LOCATION_TEXT[punch.location], FACE_TEXT[punch.face], SOURCE_TEXT[punch.source], punch.accuracyM ? `GPS within ${Math.round(punch.accuracyM)} m` : null].filter(Boolean).join(' · ');
  const showMedia = !punch.voided && ((punch.lat !== null && punch.lng !== null) || punch.hasImage);
  return (
    <li className={cx('rounded-xl border border-line p-3', punch.voided && 'opacity-60')}>
      <div className="flex items-start gap-2.5">
        <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cx('text-sm font-bold text-fg', punch.voided && 'line-through')}>{label(punch)}</p>
            <span className={cx('shrink-0 text-sm font-bold tabular-nums text-fg', punch.voided && 'line-through')}>{punchTimeText(punch.at, workDate, tz)}</span>
          </div>
          {meta && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted break-words">{meta}</p>}
          {punch.voided && <p className="mt-0.5 text-xs text-fg-muted">Replaced{punch.voidReason ? `: ${punch.voidReason}` : ''}</p>}
        </div>
      </div>
      {showMedia && (
        <div className="mt-2.5 flex items-stretch gap-2">
          <Place punch={punch} />
          <Selfie punch={punch} />
        </div>
      )}
    </li>
  );
}
