'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { usePolling } from '@/lib/hooks/usePolling';
import { messageOf } from '@/lib/api/errors';
import { getTimeline, listTrackedEmployees } from '../api/tracking.api';
import { kmText, minutesText, timeText, todayInput } from '../constants/tracking.constants';
import type { TimelineDto, TrackedEmployeeDto } from '../types/tracking.dto';
import { TrackingMapLazy } from './map/TrackingMapLazy';

const inputClass = 'h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-[var(--tt-primary)]';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 shadow-xs">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-fg">{value}</div>
    </div>
  );
}

const SEGMENT_LABEL = { site: 'At site', stay: 'Away, standing', move: 'Moving', gap: 'No signal' } as const;

export function TimelinePage() {
  const router = useRouter();
  const params = useSearchParams();
  const employeeId = Number(params.get('employee')) || null;
  const date = params.get('date') || todayInput();
  const isToday = date === todayInput();

  const [employees, setEmployees] = useState<TrackedEmployeeDto[]>([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState<TimelineDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    listTrackedEmployees({ filters: {}, enabled: true, page: 1, pageSize: 200 }).then((r) => setEmployees(r.employees)).catch((e) => setError(messageOf(e)));
  }, []);

  const go = (next: { employee?: number | null; date?: string }) => {
    const q = new URLSearchParams(params.toString());
    if (next.employee !== undefined) (next.employee ? q.set('employee', String(next.employee)) : q.delete('employee'));
    if (next.date) q.set('date', next.date);
    router.replace(`/org-admin/tracking/timeline?${q.toString()}`);
  };

  // Today refreshes by itself; a past day loads once.
  usePolling(
    async (signal) => {
      if (!employeeId) return;
      try {
        setData(await getTimeline(employeeId, date, signal));
        setError(null);
      } catch (err) {
        if (!signal.aborted) setError(messageOf(err));
      }
    },
    isToday ? 30_000 : 24 * 3600_000,
    !!employeeId,
    `${employeeId}:${date}`
  );

  const route = data?.route ?? [];
  const idx = Math.min(step, Math.max(0, route.length - 1));
  const playhead = route.length ? route[idx] : null;
  useEffect(() => setStep(0), [employeeId, date]);

  const stops = useMemo(() => (data?.segments ?? []).filter((s) => (s.kind === 'site' || s.kind === 'stay') && s.lat !== null && s.minutes >= 5).map((s) => ({ lat: s.lat as number, lng: s.lng as number, label: `${s.site_name || SEGMENT_LABEL[s.kind]} · ${minutesText(s.minutes)}` })), [data]);

  const events = useMemo(() => {
    if (!data) return [];
    return [
      ...data.punches.map((p) => ({ at: p.punched_at, text: `Check-${p.direction}${p.place_name ? ` at ${p.place_name}` : ''}${p.source === 'system' ? ' (automatic)' : ''}` })),
      ...data.breaks.flatMap((b) => [
        { at: b.started_at, text: `Break started${b.start_source.startsWith('auto') ? ' (automatic)' : ''}` },
        ...(b.ended_at ? [{ at: b.ended_at, text: 'Break ended' }] : []),
      ]),
      ...data.device_events.map((e) => ({ at: e.at, text: e.kind.replaceAll('_', ' ') })),
    ].sort((a, b) => a.at.localeCompare(b.at));
  }, [data]);

  const shown = employees.filter((e) => !filter || e.name.toLowerCase().includes(filter.toLowerCase()));
  const s = data?.summary;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${inputClass} w-44`} placeholder="Search employee" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className={`${inputClass} min-w-56`} value={employeeId ?? ''} onChange={(e) => go({ employee: e.target.value ? Number(e.target.value) : null })} aria-label="Employee">
          <option value="">Choose an employee</option>
          {shown.map((e) => (
            <option key={e.employee_id} value={e.employee_id}>{e.name}{e.employee_code ? ` (${e.employee_code})` : ''}</option>
          ))}
        </select>
        <input type="date" className={inputClass} value={date} max={todayInput()} onChange={(e) => e.target.value && go({ date: e.target.value })} aria-label="Date" />
        {isToday && employeeId && <span className="text-xs text-fg-muted">Live: updates every 30 seconds</span>}
      </div>

      {error && <Alert message={error} tone="error" />}
      {!employeeId && <div className="rounded-xl border border-line bg-surface p-10 text-center text-sm text-fg-muted">Choose an employee and a date to see where they were.</div>}

      {employeeId && data && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Distance" value={s ? kmText(s.distance_m) : '-'} />
            <Stat label="At site" value={s ? minutesText(s.site_minutes) : '-'} />
            <Stat label="Away from site" value={s ? minutesText(s.outside_minutes) : '-'} />
            <Stat label="Moving" value={s ? minutesText(s.moving_minutes) : '-'} />
            <Stat label="Standing" value={s ? minutesText(s.stationary_minutes) : '-'} />
            <Stat label="No signal / off" value={s ? minutesText(s.gap_minutes + s.gps_off_minutes) : '-'} />
          </div>

          <div className="h-[420px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
            <TrackingMapLazy route={route} sites={data.sites} stops={stops} playhead={playhead} fitKey={`${employeeId}:${date}`} />
          </div>

          {route.length > 1 && (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 shadow-xs">
              <span className="w-14 text-xs font-semibold text-fg">{timeText(playhead?.at)}</span>
              <input type="range" min={0} max={route.length - 1} value={idx} onChange={(e) => setStep(Number(e.target.value))} className="flex-1" aria-label="Replay" />
              <span className="text-xs text-fg-muted">{route.length} points</span>
            </div>
          )}

          {data.actions.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-3 shadow-xs">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">Automatic actions</div>
              <ul className="text-sm text-fg">
                {data.actions.map((a) => (
                  <li key={a.key}>{a.action.replaceAll('_', ' ')} · {a.outcome.replaceAll('_', ' ')}{a.at ? ` · ${timeText(new Date(a.at).toISOString())}` : ''}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Where they were</div>
              <ul className="divide-y divide-line text-sm">
                {data.segments.map((g, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="font-medium text-fg">{g.site_name || SEGMENT_LABEL[g.kind]}</span>
                    <span className="text-xs text-fg-muted">{timeText(g.from)} - {timeText(g.to)} · {minutesText(g.minutes)}{g.kind === 'move' ? ` · ${kmText(g.distanceM)}` : ''}</span>
                  </li>
                ))}
                {data.segments.length === 0 && <li className="px-3 py-6 text-center text-fg-muted">No location recorded for this day.</li>}
              </ul>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Events</div>
              <ul className="divide-y divide-line text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="capitalize text-fg">{e.text}</span>
                    <span className="text-xs text-fg-muted">{timeText(e.at)}</span>
                  </li>
                ))}
                {events.length === 0 && <li className="px-3 py-6 text-center text-fg-muted">Nothing recorded.</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
