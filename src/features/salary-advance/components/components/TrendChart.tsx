'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '../../types/salaryAdvance.model';
import { compactMoney, money, monthLabel } from '../../utils/format';
import { Block } from './StatusBadges';

const SERIES = [
  { key: 'disbursed', label: 'Paid out', color: 'var(--tt-fg)' },
  { key: 'recovered', label: 'Recovered', color: 'var(--tt-fg-subtle)' },
] as const;

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TrendPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
      <p className="font-bold text-fg">{monthLabel(p.month)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="mt-1 flex items-center gap-2 text-fg-muted">
          <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
          {s.label} <strong className="ml-auto pl-3 tabular-nums text-fg">{money(p[s.key])}</strong>
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ trend, loading }: { trend: TrendPoint[] | null; loading: boolean }) {
  const data = trend ?? [];
  const empty = !loading && data.every((p) => !p.disbursed && !p.recovered);
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-fg">Paid out vs recovered</h2>
          <p className="mt-0.5 text-xs text-fg-muted">Last 6 months</p>
        </div>
        <ul className="flex items-center gap-3 text-xs text-fg-muted" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      </header>
      {loading ? (
        <Block className="h-60 w-full" />
      ) : empty ? (
        <p className="flex h-60 items-center justify-center text-sm text-fg-muted">Nothing paid out or recovered in the last 6 months.</p>
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--tt-border)" />
              <XAxis dataKey="month" tickFormatter={(m: string) => monthLabel(m, 'short').split(' ')[0]} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--tt-bg-subtle)' }} />
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!loading && !empty && (
        <table className="sr-only">
          <caption>Paid out and recovered by month</caption>
          <thead>
            <tr><th>Month</th><th>Paid out</th><th>Recovered</th></tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.month}><td>{monthLabel(p.month)}</td><td>{money(p.disbursed)}</td><td>{money(p.recovered)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
