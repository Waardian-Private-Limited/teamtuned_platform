'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { usePolling } from '@/lib/hooks/usePolling';
import { messageOf } from '@/lib/api/errors';
import { getTimeline } from '../api/tracking.api';
import { kmText, minutesText, timeText, todayInput } from '../constants/tracking.constants';
import type { SegmentDto, TimelineDto } from '../types/tracking.dto';
import { TrackingMapLazy } from './map/TrackingMapLazy';
import { TimelineEmployeePicker } from './TimelineEmployeePicker';
import { TimelinePlayerSlider } from './TimelinePlayerSlider';

const SEGMENT_LABEL = { site: 'At site', stay: 'Away, standing', move: 'Moving', gap: 'No signal' } as const;
const GAP_LABEL = { gps_off: 'Location switched off', phone_off: 'Phone switched off', app_closed: 'App closed by the employee', no_signal: 'No signal' } as const;
const segmentLabel = (s: SegmentDto) => s.site_name || (s.kind === 'gap' && s.reason ? GAP_LABEL[s.reason] : SEGMENT_LABEL[s.kind]);
const EVENT_LABEL: Record<string, string> = {
  gps_off: 'Location switched off', gps_on: 'Location switched on', permission_downgraded: 'Location permission removed', permission_restored: 'Location permission given',
  offline: 'Internet off (recording continues)', online: 'Internet back', boot: 'Phone restarted', shutdown: 'Phone switched off',
  recorder_started: 'Recording started', recorder_stopped: 'Recording stopped', mock_detected: 'Fake location app detected', time_tamper: 'Phone clock changed',
  low_battery: 'Battery low', power_save_on: 'Battery saver on', power_save_off: 'Battery saver off',
  tracking_stopped: 'Tracking stopped: left the site',
  app_terminated: 'App closed by the employee', relaunched: 'Recording resumed after the app was closed',
  precise_off: 'Precise location turned off', precise_on: 'Precise location turned on',
};

export function TimelinePage() {
  const router = useRouter();
  const params = useSearchParams();
  const employeeId = Number(params.get('employee')) || null;
  const date = params.get('date') || todayInput();
  const isToday = date === todayInput();

  const [data, setData] = useState<TimelineDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);

  const go = (next: { employee?: number | null; date?: string }) => {
    const q = new URLSearchParams(params.toString());
    if (next.employee !== undefined) {
      if (next.employee) q.set('employee', String(next.employee));
      else q.delete('employee');
    }
    if (next.date) q.set('date', next.date);
    router.replace(`/org-admin/tracking/timeline?${q.toString()}`);
  };

  const shiftDate = (days: number) => {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d + days);
    const yStr = dt.getFullYear();
    const mStr = String(dt.getMonth() + 1).padStart(2, '0');
    const dStr = String(dt.getDate()).padStart(2, '0');
    const nextDate = `${yStr}-${mStr}-${dStr}`;
    if (nextDate <= todayInput()) {
      go({ date: nextDate });
    }
  };

  // Reset step whenever employee or date changes so we default to the LAST point
  useEffect(() => {
    setStep(null);
  }, [employeeId, date]);

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
  const maxIdx = Math.max(0, route.length - 1);
  // Default to the LAST point when step is null or clamped
  const idx = route.length > 0 ? (step === null ? maxIdx : Math.min(Math.max(0, step), maxIdx)) : 0;
  const playhead = route.length ? route[idx] : null;

  const stops = useMemo(
    () =>
      (data?.segments ?? [])
        .filter((s) => (s.kind === 'site' || s.kind === 'stay') && s.lat !== null && s.minutes >= 5)
        .map((s) => ({
          lat: s.lat as number,
          lng: s.lng as number,
          label: `${segmentLabel(s)} · ${minutesText(s.minutes)}`,
        })),
    [data]
  );

  const events = useMemo(() => {
    if (!data) return [];
    return [
      ...data.punches.map((p) => ({
        at: p.punched_at,
        text: `Check-${p.direction}${p.place_name ? ` at ${p.place_name}` : ''}${
          p.source === 'system' ? ' (automatic)' : ''
        }`,
      })),
      ...data.breaks.flatMap((b) => [
        { at: b.started_at, text: `Break started${b.start_source.startsWith('auto') ? ' (automatic)' : ''}` },
        ...(b.ended_at ? [{ at: b.ended_at, text: 'Break ended' }] : []),
      ]),
      ...data.device_events.map((e) => ({ at: e.at, text: EVENT_LABEL[e.kind] ?? e.kind.replaceAll('_', ' ') })),
    ].sort((a, b) => a.at.localeCompare(b.at));
  }, [data]);

  const s = data?.summary;

  return (
    <div className="tt-scrollbar flex h-full min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
      {/* Top Toolbar - Compact & Monochrome */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Combined Search & Choose Employee Component with Paginated Server Search */}
          <TimelineEmployeePicker
            selectedId={employeeId}
            onSelect={(id) => go({ employee: id })}
          />

          {/* Date Picker Controls with Day Stepping */}
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              title="Previous day"
              className="flex h-8 w-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg active:scale-95"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-fg-muted" />
              <input
                type="date"
                className="h-8 rounded bg-transparent pl-7 pr-1.5 text-xs font-semibold text-fg outline-none sm:text-xs"
                value={date}
                max={todayInput()}
                onChange={(e) => e.target.value && go({ date: e.target.value })}
                aria-label="Date"
              />
            </div>

            <button
              type="button"
              onClick={() => shiftDate(1)}
              disabled={isToday}
              title="Next day"
              className="flex h-8 w-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={() => go({ date: todayInput() })}
                className="h-6.5 rounded bg-bg-subtle px-2 text-[10px] font-semibold text-fg transition-colors hover:bg-line active:scale-95"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Live Auto-update Badge - Strictly Monochrome Black & White */}
        {isToday && employeeId && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-subtle px-2.5 py-0.5 text-xs font-semibold text-fg">
            <span className="h-1.5 w-1.5 rounded-full bg-fg animate-pulse" />
            <span>Live: updates every 30s</span>
          </div>
        )}
      </div>

      {error && <Alert message={error} tone="error" />}

      {!employeeId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/50 p-10 text-center shadow-2xs">
          <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg-subtle text-fg shadow-2xs">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-fg">No Employee Selected</h3>
          <p className="mt-0.5 max-w-sm text-xs text-fg-muted">
            Search or select an employee above and pick a date to view their route and timeline history.
          </p>
        </div>
      )}

      {employeeId && data && (
        <>
          {/* Compact Inline Stats Strip - Fits in single line to save vertical viewport space */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs shadow-2xs">
            <span className="flex items-center gap-1">
              <span className="text-fg-muted">Distance:</span>
              <strong className="font-semibold text-fg">{s ? kmText(s.distance_m) : '-'}</strong>
            </span>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1">
              <span className="text-fg-muted">At site:</span>
              <strong className="font-semibold text-fg">{s ? minutesText(s.site_minutes) : '-'}</strong>
            </span>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1">
              <span className="text-fg-muted">Away:</span>
              <strong className="font-semibold text-fg">{s ? minutesText(s.outside_minutes) : '-'}</strong>
            </span>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1" title="Between check-in and check-out">
              <span className="text-fg-muted">At site after check-in:</span>
              <strong className="font-semibold text-fg">{s ? minutesText(s.checked_in_site_minutes ?? 0) : '-'}</strong>
            </span>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1" title="Between check-in and check-out">
              <span className="text-fg-muted">Away after check-in:</span>
              <strong className="font-semibold text-fg">{s ? minutesText(s.checked_in_outside_minutes ?? 0) : '-'}</strong>
            </span>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1">
              <span className="text-fg-muted">Moving:</span>
              <strong className="font-semibold text-fg">{s ? minutesText(s.moving_minutes) : '-'}</strong>
            </span>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1">
              <span className="text-fg-muted">Standing:</span>
              <strong className="font-semibold text-fg">{s ? minutesText(s.stationary_minutes) : '-'}</strong>
            </span>
            <span className="text-line">|</span>
            <span className="flex items-center gap-1">
              <span className="text-fg-muted">No signal:</span>
              <strong className="font-semibold text-fg">{s ? minutesText(s.gap_minutes + s.gps_off_minutes) : '-'}</strong>
            </span>
          </div>

          {/* Interactive Map - Height scaled so map + slider fit cleanly into single viewport */}
          <div className="h-[320px] md:h-[350px] lg:h-[380px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface shadow-2xs">
            <TrackingMapLazy
              route={route}
              sites={data.sites}
              stops={stops}
              playhead={playhead}
              fitKey={`${employeeId}:${date}`}
            />
          </div>

          {/* Modern Timeline Replay Slider - Positioned directly below map in same viewport */}
          {route.length > 1 && (
            <TimelinePlayerSlider
              route={route}
              currentIndex={idx}
              onIndexChange={(nextIdx) => setStep(nextIdx)}
              isToday={isToday}
            />
          )}

          {data.actions.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-3 shadow-2xs">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Automatic actions
              </div>
              <ul className="divide-y divide-line/30 text-xs sm:text-sm text-fg">
                {data.actions.map((a) => (
                  <li key={a.key} className="py-1 first:pt-0 last:pb-0">
                    <span className="font-medium">{a.action.replaceAll('_', ' ')}</span> ·{' '}
                    <span className="text-fg-muted">{a.outcome.replaceAll('_', ' ')}</span>
                    {a.at && (
                      <span className="text-xs text-fg-subtle">
                        {' '}· {timeText(new Date(a.at).toISOString())}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Segment Details & Events */}
          <div className="grid gap-2 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-2xs">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Where they were
              </div>
              <ul className="tt-scrollbar max-h-56 divide-y divide-line overflow-y-auto text-xs sm:text-sm">
                {data.segments.map((g, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="font-medium text-fg">{segmentLabel(g)}</span>
                    <span className="text-xs text-fg-muted">
                      {timeText(g.from)} - {timeText(g.to)} · {minutesText(g.minutes)}
                      {g.kind === 'move' ? ` · ${kmText(g.distanceM)}` : ''}
                    </span>
                  </li>
                ))}
                {data.segments.length === 0 && (
                  <li className="px-3 py-4 text-center text-xs text-fg-muted">
                    No location recorded for this day.
                  </li>
                )}
              </ul>
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-2xs">
              <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Events
              </div>
              <ul className="tt-scrollbar max-h-56 divide-y divide-line overflow-y-auto text-xs sm:text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="capitalize text-fg">{e.text}</span>
                    <span className="text-xs text-fg-muted">{timeText(e.at)}</span>
                  </li>
                ))}
                {events.length === 0 && (
                  <li className="px-3 py-4 text-center text-xs text-fg-muted">Nothing recorded.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
