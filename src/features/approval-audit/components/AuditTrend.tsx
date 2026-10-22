'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Skeleton } from '@/features/attendance-dashboard/components/Card';
import { shortDate } from '../utils/format';
import type { AuditTrendDto } from '../types/audit.dto';

const UNIT_TEXT = { day: 'per day', week: 'per week (from Monday)', month: 'per month' } as const;
const RAISED = 'var(--tt-fg)';
const DECIDED = 'color-mix(in srgb, var(--tt-fg) 32%, var(--tt-surface))';

type Point = AuditTrendDto['points'][number];

function TrendTooltip({ active, payload, unit }: { active?: boolean; payload?: Array<{ payload: Point }>; unit: AuditTrendDto['unit'] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
      <p className="font-bold text-fg">{unit === 'week' ? `Week of ${shortDate(p.start)}` : shortDate(p.start, unit)}</p>
      <p className="mt-1 tabular-nums text-fg"><strong>{p.raised}</strong> raised · <strong>{p.decided}</strong> decided</p>
      <p className="mt-0.5 tabular-nums text-fg-muted">{p.approved} approved · {p.rejected} rejected</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold text-fg-muted">
      <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: RAISED }} />Raised</span>
      <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: DECIDED }} />Decided</span>
    </div>
  );
}

/** Requests raised against requests decided, bucketed by the period's length. */
export function AuditTrend({ trend, loading }: { trend: AuditTrendDto | null; loading: boolean }) {
  const empty = !loading && !!trend && trend.points.every((p) => !p.raised && !p.decided);
  return (
    <Card title="Raised vs decided" subtitle={trend ? `Requests ${UNIT_TEXT[trend.unit]}` : ' '} action={<Legend />}>
      {loading || !trend ? <Skeleton className="h-56 w-full" /> : empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-fg-muted">No requests were raised or decided in this period.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend.points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--tt-border)" />
              <XAxis dataKey="start" tickFormatter={(d: string) => shortDate(d, trend.unit)} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<TrendTooltip unit={trend.unit} />} cursor={{ fill: 'var(--tt-bg-subtle)' }} />
              <Bar dataKey="raised" fill={RAISED} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              <Bar dataKey="decided" fill={DECIDED} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
