'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactMoney, money, monthLabel } from '@/features/expense-bills/utils/format';
import type { Overview } from '../../types/petty-cash.model';
import { Block } from './Primitives';

type Point = Overview['trend'][number];

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
      <p className="font-bold text-fg">{monthLabel(p.month)}</p>
      <p className="mt-1 text-fg-muted">
        Spent <strong className="pl-2 tabular-nums text-fg">{money(p.amount)}</strong>
      </p>
    </div>
  );
}

/** Approved spending of the last 6 months, one monochrome bar each. A screen-reader table repeats the numbers. */
export function TrendChart({ trend, loading }: { trend: Point[] | null; loading: boolean }) {
  const data = trend ?? [];
  const empty = !loading && data.every((p) => !p.amount);
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5">
      <header className="mb-4">
        <h2 className="text-sm font-bold text-fg">Spending by month</h2>
        <p className="mt-0.5 text-xs text-fg-muted">Approved petty cash expenses, last 6 months</p>
      </header>
      {loading ? (
        <Block className="h-56 w-full" />
      ) : empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-fg-muted">Nothing was spent in the last 6 months.</p>
      ) : (
        <div className="h-56 w-full" role="img" aria-label="Bar chart of approved petty cash spending by month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--tt-border)" />
              <XAxis dataKey="month" tickFormatter={(m: string) => monthLabel(m, 'short').split(' ')[0]} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--tt-bg-subtle)' }} />
              <Bar dataKey="amount" name="Spent" fill="var(--tt-fg)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!loading && !empty && (
        <table className="sr-only">
          <caption>Approved spending by month</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Spent</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.month}>
                <td>{monthLabel(p.month)}</td>
                <td>{money(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
