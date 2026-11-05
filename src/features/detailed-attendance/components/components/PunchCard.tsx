'use client';

import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Camera, ImageOff, MapPinOff, Moon, ScanFace } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FACE_TEXT, LOCATION_TEXT, SOURCE_TEXT } from '../../constants/detailed.constants';
import { usePunchImage } from '../../hooks/usePunchImage';
import type { FaceEngineDto } from '../../types/detailed.dto';
import type { Punch } from '../../types/detailed.model';
import { punchTimeText } from '../../utils/format';
import { Skeleton } from './controls';

const label = (p: Punch) => (p.kind === 'night_ot' ? (p.direction === 'in' ? 'Night OT start' : 'Night OT end') : p.direction === 'in' ? 'Check-in' : 'Check-out');

/** Google's embeddable map for a point, the same view the old attendance screen showed. */
export const mapSrc = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}&output=embed&z=15`;

function Selfie({ punch }: { punch: Punch }) {
  const { url, state, onImageError } = usePunchImage(punch.id, punch.hasImage && !punch.voided);
  if (!punch.hasImage) return null;
  return (
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-bg-subtle">
      {state === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
      {state === 'failed' && <span className="flex h-full flex-col items-center justify-center gap-1 text-[11px] text-fg-muted"><ImageOff className="h-4 w-4" aria-hidden /> Photo unavailable</span>}
      {state === 'ready' && url && (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open the ${label(punch).toLowerCase()} photo`} className="block h-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link, not an optimisable asset */}
          <img src={url} alt={`${label(punch)} photo`} className="h-full w-full object-cover" onError={onImageError} />
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

const ENGINE = { ai: 'AI server', rekognition: 'AWS' } as const;
const ENGINE_RESULT: Record<FaceEngineDto['result'], string> = { match: 'matched', no_match: 'no match', error: 'failed', down: 'was down', skipped: 'not used' };
const WHY_FALLBACK: Record<string, string> = {
  ai_no_match: 'AI server said no, AWS checked again',
  ai_error: 'AI server failed, AWS checked',
  ai_down: 'AI server was down, AWS checked',
  legacy_reference: 'Old face photo, checked by AWS',
};
const pct = (v: number | null | undefined) => (v === null || v === undefined ? null : `${Number(v).toFixed(1)}%`);
const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? null : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

function EngineChip({ name, engine, decided }: { name: string; engine: FaceEngineDto; decided: boolean }) {
  const tone = engine.result === 'match' ? 'text-[var(--tt-success)]' : engine.result === 'no_match' ? 'text-[var(--tt-danger)]' : 'text-fg-muted';
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]', decided ? 'border-fg bg-bg-subtle' : 'border-line')}>
      <span className="font-semibold text-fg">{name}</span>
      <span className={cx('font-semibold', tone)}>{ENGINE_RESULT[engine.result] ?? engine.result}</span>
      {[pct(engine.similarity), secs(engine.ms)].filter(Boolean).map((x) => <span key={x} className="tabular-nums text-fg-muted">· {x}</span>)}
    </span>
  );
}

/**
 * Which engine decided the face and what each said, so HR can see why a punch passed or failed and the AI
 * server can be judged against AWS. Punches from before this was saved show only the engine and its score.
 */
function FaceCheck({ punch }: { punch: Punch }) {
  const c = punch.faceCheck;
  if (!c && !punch.faceProvider) return null;
  if (!c) {
    return (
      <p className="mt-1 flex items-center gap-1 text-[11px] text-fg-muted">
        <ScanFace className="h-3.5 w-3.5" aria-hidden /> Checked by {ENGINE[punch.faceProvider!]}{pct(punch.similarity) ? ` · ${pct(punch.similarity)}` : ''}
      </p>
    );
  }
  const steps = [c.ai && c.ai.result !== 'skipped' ? (['ai', c.ai] as const) : null, c.rekognition ? (['rekognition', c.rekognition] as const) : null].filter(
    (x): x is readonly ['ai' | 'rekognition', FaceEngineDto] => x !== null
  );
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <ScanFace className="h-3.5 w-3.5 text-fg-muted" aria-hidden />
        {steps.map(([key, engine], i) => (
          <span key={key} className="inline-flex items-center gap-1">
            {i > 0 && <ArrowRight className="h-3 w-3 text-fg-muted" aria-hidden />}
            <EngineChip name={ENGINE[key]} engine={engine} decided={c.decided_by === key} />
          </span>
        ))}
        {steps.length === 0 && <span className="text-[11px] text-fg-muted">No face engine answered</span>}
      </div>
      {c.fallback_reason && WHY_FALLBACK[c.fallback_reason] && <p className="text-[11px] text-fg-muted">{WHY_FALLBACK[c.fallback_reason]}{c.threshold ? ` · pass mark ${c.threshold}%` : ''}</p>}
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
          {!punch.voided && punch.face !== 'skipped' && <FaceCheck punch={punch} />}
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
