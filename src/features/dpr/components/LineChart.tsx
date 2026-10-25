'use client';

import React from 'react';
import { formatDate } from '@/lib/datetime';
import { n1 } from './parts';

const W = 640;
const H = 200;
const PAD = { l: 44, r: 56, t: 12, b: 26 };

export interface LineSeries { key: string; label: string; dashed?: boolean }

/**
 * Two measures over days on one axis. Told apart by line style as well as ink (solid ink, dashed grey), named in a legend and at the end of
 * each line; hovering shows the day's values. Days with no value leave a gap in that line.
 */
export function LineChart({ points, series, unit = '' }: { points: ({ date: string } & Record<string, number | string | null>)[]; series: [LineSeries, LineSeries]; unit?: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const ref = React.useRef<SVGSVGElement>(null);
  if (!points.length) return <p className="text-xs text-fg-muted">No data yet.</p>;
  const val = (p: (typeof points)[number], k: string) => (typeof p[k] === 'number' ? (p[k] as number) : null);
  const max = Math.max(1, ...points.flatMap((p) => series.map((s) => val(p, s.key) ?? 0)));
  const nice = (() => { const e = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / e) * e; })();
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / nice) * ih;
  const path = (k: string) => points.map((p, i) => [i, val(p, k)] as const).filter(([, v]) => v !== null).map(([i, v], j) => `${j ? 'L' : 'M'}${x(i).toFixed(1)},${y(v as number).toFixed(1)}`).join('');
  const last = (k: string) => { for (let i = points.length - 1; i >= 0; i -= 1) if (val(points[i], k) !== null) return i; return -1; };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const i = Math.round(((((e.clientX - box.left) / box.width) * W - PAD.l) / iw) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const tone = (s: LineSeries) => (s.dashed ? 'text-fg-subtle' : 'text-fg');
  const h = hover === null ? null : points[hover];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-fg-muted">
        {series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={s.dashed ? '4 3' : undefined} className={tone(s)} /></svg>{s.label}</span>)}
      </div>
      <div className="relative">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none select-none" role="img" aria-label={series.map((s) => s.label).join(' and ')} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {[0, nice / 2, nice].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--tt-border)" strokeWidth="1" />
              <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="currentColor" className="text-fg-muted">{n1(t)}</text>
            </g>
          ))}
          {[...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].map((i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" className="text-fg-muted">{formatDate(points[i].date, 'short')}</text>)}
          {series.map((s) => <path key={s.key} d={path(s.key)} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinecap="round" strokeLinejoin="round" className={tone(s)} />)}
          {series.map((s) => { const i = last(s.key); return i < 0 ? null : <text key={s.key} x={Math.min(x(i) + 6, W - PAD.r + 4)} y={y(val(points[i], s.key) as number) + (s.dashed ? 12 : -6)} fontSize="10" fontWeight={s.dashed ? 400 : 700} fill="currentColor" className={tone(s)}>{n1(val(points[i], s.key))}</text>; })}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="currentColor" strokeWidth="1" className="text-fg-muted" />
              {series.map((s) => (val(h, s.key) === null ? null : <circle key={s.key} cx={x(hover)} cy={y(val(h, s.key) as number)} r="4" fill={s.dashed ? 'var(--tt-surface)' : 'currentColor'} stroke={s.dashed ? 'currentColor' : 'var(--tt-surface)'} strokeWidth="2" className={tone(s)} />))}
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div className="pointer-events-none absolute top-1 z-10 rounded-lg border border-line bg-surface px-2.5 py-2 text-[11px] shadow-lg" style={{ left: `${Math.min(68, (x(hover) / W) * 100)}%` }}>
            <p className="font-semibold text-fg">{formatDate(h.date, 'weekday')}</p>
            {series.map((s) => <p key={s.key} className={`tabular-nums ${s.dashed ? 'text-fg-muted' : 'text-fg'}`}>{s.label}: {val(h, s.key) === null ? '—' : `${n1(val(h, s.key))}${unit}`}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}
