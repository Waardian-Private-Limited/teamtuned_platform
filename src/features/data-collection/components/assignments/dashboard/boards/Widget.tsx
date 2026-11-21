'use client';

import { Area, Bar as RBar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { SUBMISSION_LABEL } from '../../../../constants/dc.constants';
import type { Widget as WidgetDef, WidgetResult } from '../../../../types/dc.types';
import { Pill, Skeleton, statusTone } from '../../../shared/Ui';

const COLORS = ['#111827', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#374151', '#1f2937', '#52525b', '#71717a', '#a1a1aa'];
const FG = 'var(--tt-fg, #111827)';
const fmt = (n: number | null | undefined, unit?: string) => (n === null || n === undefined ? '–' : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`);
const dayFromOffset = (n: number) => new Date(n * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function WidgetView({ widget, result, loading }: { widget: WidgetDef; result?: WidgetResult; loading: boolean }) {
  if (!result) return <Body><Skeleton className="h-full min-h-24 w-full" /></Body>;

  if (result.kind === 'kpi') {
    return <Body center><div className={`text-4xl font-extrabold leading-none text-fg ${loading ? 'opacity-50' : ''}`}>{fmt(result.value)}</div>{result.unit && <div className="mt-1 text-xs font-semibold text-fg-muted">{result.unit}</div>}</Body>;
  }

  if (result.kind === 'series') {
    if (!result.rows.length) return <Chart loading={loading}><EmptyChart /></Chart>;
    const hasRight = result.series.some((s) => s.axis === 'right');
    return <Chart loading={loading}>
      <ComposedChart data={result.rows.map((r) => ({ label: r.label, ...r.values }))} margin={{ left: -18, right: hasRight ? -10 : 8, top: 6, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--tt-line)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={(d: string) => (d.length > 10 ? d.slice(5) : d)} />
        <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={34} />{hasRight && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={34} />}
        <Tooltip formatter={(v, n) => [fmt(Number(v)), n]} />{result.series.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        {result.series.map((s, i) => {
          const common = { key: s.id, dataKey: s.id, name: s.label, yAxisId: s.axis, fill: COLORS[i % COLORS.length], stroke: COLORS[i % COLORS.length] };
          if (s.chart === 'line') return <Line {...common} type="monotone" dot={false} strokeWidth={2} />;
          if (s.chart === 'area') return <Area {...common} type="monotone" fillOpacity={0.15} />;
          return <RBar {...common} radius={[3, 3, 0, 0]} />;
        })}
      </ComposedChart>
    </Chart>;
  }

  if (result.kind === 'pie') {
    if (!result.rows.length) return <Chart loading={loading}><EmptyChart /></Chart>;
    return <Chart loading={loading}>
      <PieChart>
        <Pie data={result.rows} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="80%" label={({ name }: { name?: string }) => name ?? ''} labelLine={false} fontSize={10}>
          {result.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => fmt(Number(v), result.unit)} />
      </PieChart>
    </Chart>;
  }

  if (result.kind === 'scatter') {
    if (!result.points.length) return <Chart loading={loading}><EmptyChart /></Chart>;
    const tick = (date: boolean) => (date ? (n: number) => dayFromOffset(n).slice(0, 6) : undefined);
    return <Chart loading={loading}>
      <ScatterChart margin={{ left: -12, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke="var(--tt-line)" />
        <XAxis type="number" dataKey="x" name={result.xLabel} tick={{ fontSize: 10 }} tickFormatter={tick(result.xDate)} domain={['dataMin', 'dataMax']} />
        <YAxis type="number" dataKey="y" name={result.yLabel} tick={{ fontSize: 10 }} width={42} tickFormatter={tick(result.yDate)} domain={['dataMin', 'dataMax']} />
        <ZAxis range={[40, 40]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, n) => [n === result.xLabel || n === result.yLabel ? (((n === result.xLabel && result.xDate) || (n === result.yLabel && result.yDate)) ? dayFromOffset(v) : v) : v, n]} />
        <Scatter data={result.points} fill={FG} fillOpacity={0.6} />
      </ScatterChart>
    </Chart>;
  }

  if (result.kind === 'table') {
    return <Body><div className={`max-h-full overflow-auto ${loading ? 'opacity-50' : ''}`}>
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface text-fg-muted"><tr>{result.columns.map((c, i) => <th key={i} className={`py-1.5 pr-2 font-semibold ${i ? 'text-right' : ''}`}>{c || 'Group'}</th>)}{result.columns.length > 2 && <th className="py-1.5 text-right font-semibold">Total</th>}</tr></thead>
        <tbody className="divide-y divide-line">{result.rows.map((r) => (
          <tr key={r.label}><td className="py-1.5 pr-2 font-medium text-fg">{r.label}</td>{r.cells.map((c, i) => <td key={i} className="py-1.5 pr-2 text-right tabular-nums text-fg-muted">{fmt(c)}</td>)}{result.columns.length > 2 && <td className="py-1.5 text-right font-semibold tabular-nums text-fg">{fmt(r.total)}</td>}</tr>
        ))}</tbody>
      </table>
      {!result.rows.length && <EmptyChart />}
    </div></Body>;
  }

  if (result.kind === 'data') {
    return <Body><div className={`max-h-full overflow-auto ${loading ? 'opacity-50' : ''}`}>
      <table className="w-max min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface text-fg-muted"><tr>
          <th className="py-1.5 pr-3 font-semibold">Date</th><th className="py-1.5 pr-3 font-semibold">Person</th><th className="py-1.5 pr-3 font-semibold">Status</th>
          {result.columns.map((c) => <th key={c.key} className={`py-1.5 pr-3 font-semibold ${c.numeric ? 'text-right' : ''}`}>{c.label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-line">{result.rows.map((r) => (
          <tr key={r.id}>
            <td className="py-1.5 pr-3 tabular-nums text-fg-muted">{r.work_date}</td>
            <td className="py-1.5 pr-3 font-medium text-fg">{r.employee_name}{r.employee_code ? <span className="text-fg-muted"> ({r.employee_code})</span> : null}</td>
            <td className="py-1.5 pr-3"><div className="flex gap-1"><Pill label={SUBMISSION_LABEL[r.status] || r.status} tone={statusTone(r.status)} />{r.is_late && <Pill label="Late" tone="bad" />}</div></td>
            {result.columns.map((c) => <td key={c.key} className={`py-1.5 pr-3 text-fg ${c.numeric ? 'text-right tabular-nums' : ''}`}>{r.values[c.key] || <span className="text-fg-subtle">–</span>}</td>)}
          </tr>
        ))}</tbody>
      </table>
      {!result.rows.length && <EmptyChart />}
    </div></Body>;
  }
  return <Body><EmptyChart /></Body>;
}

const Body = ({ children, center }: { children: React.ReactNode; center?: boolean }) => <div className={`h-full min-h-0 flex-1 ${center ? 'flex flex-col items-center justify-center' : ''}`}>{children}</div>;
const Chart = ({ children, loading }: { children: React.ReactElement; loading: boolean }) => <Body><div className={`h-full min-h-24 ${loading ? 'opacity-50' : ''}`}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></Body>;
const EmptyChart = () => <div className="flex h-full min-h-24 items-center justify-center text-xs text-fg-muted">No data in range</div>;
