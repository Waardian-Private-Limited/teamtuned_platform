'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { hourText } from '../constants/dashboard.constants';
import { Card, Skeleton } from './Card';

function ArrivalTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { hour: number; count: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
      <p className="font-bold text-fg">{hourText(p.hour)} – {hourText((p.hour + 1) % 24)}</p>
      <p className="mt-1 tabular-nums text-fg-muted"><strong className="text-fg">{p.count}</strong> checked in</p>
    </div>
  );
}

/** First check-ins per hour on the selected date: when people actually arrive. */
export function ArrivalsChart({ arrivals, loading }: { arrivals: Array<{ hour: number; count: number }> | null; loading: boolean }) {
  const empty = !loading && !(arrivals ?? []).some((a) => a.count > 0);
  return (
    <Card title="Arrivals by hour" subtitle="First check-in of each person present">
      {loading ? <Skeleton className="h-56 w-full" /> : empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-fg-muted">No check-ins on this date yet.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={arrivals ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--tt-border)" />
              <XAxis dataKey="hour" tickFormatter={hourText} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ArrivalTooltip />} cursor={{ fill: 'var(--tt-bg-subtle)' }} />
              <Bar dataKey="count" fill="var(--tt-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
