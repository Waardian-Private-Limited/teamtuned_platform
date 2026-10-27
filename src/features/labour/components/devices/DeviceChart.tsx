'use client';

import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DeviceDetail } from '../../types/labour.types';

/** Hourly temperature and CPU. Monochrome: solid black for temperature, dashed grey for CPU. */
export function DeviceChart({ rows }: { rows: DeviceDetail['metrics24'] }) {
  const data = rows.map((r) => ({
    label: new Date(r.hour).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', hour12: true }),
    temp: r.tempAvg, cpu: r.cpuAvg,
  }));
  if (!data.length) return <p className="rounded-xl border border-line p-4 text-sm text-fg-muted">No readings in this period. The machine has not sent a heartbeat.</p>;
  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--tt-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--tt-fg-muted)' }} minTickGap={32} tickLine={false} axisLine={{ stroke: 'var(--tt-border)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--tt-fg-muted)' }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--tt-border)' }} formatter={(v, n) => [n === 'temp' ? `${Number(v).toFixed(1)} °C` : `${Number(v).toFixed(0)} %`, n === 'temp' ? 'Temperature' : 'CPU']} />
          <Legend formatter={(v) => (v === 'temp' ? 'Temperature (°C)' : 'CPU (%)')} wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="temp" stroke="var(--tt-fg)" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="cpu" stroke="var(--tt-fg-muted)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
