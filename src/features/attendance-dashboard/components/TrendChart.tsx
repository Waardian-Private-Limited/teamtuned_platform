'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dayText, pctText } from '../constants/dashboard.constants';
import type { TrendPointDto } from '../types/dashboard.dto';
import { Card, Skeleton } from './Card';

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TrendPointDto }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
      <p className="font-bold text-fg">{dayText(p.date)}</p>
      <p className="mt-1 text-fg"><strong className="text-sm">{pctText(p.attendance_rate)}</strong> attendance</p>
      <p className="mt-1 tabular-nums text-fg-muted">{p.present} present · {p.absent} absent · {p.late} late · {p.on_leave} on leave</p>
    </div>
  );
}

/** Attendance rate over the last two weeks: one series, so no legend; the title names it. */
export function TrendChart({ trend, loading }: { trend: TrendPointDto[] | null; loading: boolean }) {
  const data = (trend ?? []).map((p) => ({ ...p, rate: p.attendance_rate }));
  const empty = !loading && data.every((p) => p.rate === null);
  return (
    <Card title="Attendance rate, last 14 days" subtitle="Share of people expected at work who came">
      {loading ? <Skeleton className="h-56 w-full" /> : empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-fg-muted">No attendance recorded in these two weeks.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="att-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--tt-primary)" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="var(--tt-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--tt-border)" strokeDasharray="0" />
              <XAxis dataKey="date" tickFormatter={(d: string) => new Date(`${d}T00:00:00`).getDate().toString()} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--tt-border-strong)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="rate" stroke="var(--tt-primary)" strokeWidth={2} fill="url(#att-trend)" connectNulls dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--tt-surface)', fill: 'var(--tt-primary)' }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
