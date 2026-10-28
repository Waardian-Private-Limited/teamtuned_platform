'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Battery, Clock, Crosshair, MapPin } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/FormControls';
import { usePolling } from '@/lib/hooks/usePolling';
import { messageOf } from '@/lib/api/errors';
import { getLiveBoard } from '../api/tracking.api';
import { ATTENTION, LIVE_POLL_MS, NOT_LIVE, STALE_FIX_MS, STATE_COLOR, STATE_LABEL, healthText } from '../constants/tracking.constants';
import type { LiveBoardDto, LiveEmployeeDto, TrackingFilters as Filters, TrackingState } from '../types/tracking.dto';
import { TrackingFilters } from './TrackingFilters';
import { TrackingMapLazy } from './map/TrackingMapLazy';

// The board is "stale" once two polls in a row have failed to refresh it.
const STALE_BOARD_MS = 2 * LIVE_POLL_MS + 5_000;

const ago = (iso: string, now: number) => {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
};

// A live state whose last fix is older than STALE_FIX_MS: the pin is not where the person is now.
const isStale = (e: LiveEmployeeDto, now: number) =>
  !NOT_LIVE.includes(e.state) && (!e.recorded_at || now - new Date(e.recorded_at).getTime() > STALE_FIX_MS);

function StateDot({ state }: { state: TrackingState }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STATE_COLOR[state] }} />;
}

export function LiveMapPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [states, setStates] = useState<TrackingState[]>([]);
  const [search, setSearch] = useState('');
  // The board together with the filter key it was loaded for, so the map fits the right data.
  const [loaded, setLoaded] = useState<{ board: LiveBoardDto; key: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; seq: number } | null>(null);
  // Ticks on its own so "N min ago" and the stale banner move even when every poll fails.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const key = JSON.stringify([filters, states]);
  usePolling(
    async (signal) => {
      try {
        const board = await getLiveBoard(filters, states, signal);
        const at = Date.now();
        setLoaded({ board, key, at });
        setNow(at);
        setError(null);
      } catch (err) {
        if (!signal.aborted) {
          setError(messageOf(err));
          setNow(Date.now());
        }
      }
    },
    LIVE_POLL_MS,
    true,
    key
  );

  const data = loaded?.board ?? null;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.employees ?? [])
      .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.employee_code ?? '').toLowerCase().includes(q))
      .sort((a, b) => Number(ATTENTION.includes(b.state)) - Number(ATTENTION.includes(a.state)) || a.name.localeCompare(b.name));
  }, [data, search]);

  const mapped = useMemo(
    () => list.filter((e) => e.lat !== null && e.lng !== null).map((e) => ({ id: e.employee_id, name: e.name, lat: e.lat as number, lng: e.lng as number, state: e.state, stale: isStale(e, now) })),
    [list, now]
  );
  const toggle = (s: TrackingState) => setStates((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const counts = data?.counts ?? {};
  const boardStale = loaded !== null && now - loaded.at > STALE_BOARD_MS;
  const narrowed = Boolean(search.trim()) || states.length > 0 || Object.values(filters).some((v) => v !== null && v !== undefined);

  const pick = (e: LiveEmployeeDto) => {
    setSelected(e.employee_id);
    if (e.lat !== null && e.lng !== null) setFocus((cur) => ({ lat: e.lat as number, lng: e.lng as number, seq: (cur?.seq ?? 0) + 1 }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TrackingFilters value={filters} onChange={setFilters} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find an employee"
          className="h-9 w-56 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-[var(--tt-primary)]"
        />
      </div>

      {/* Every state keeps its chip (zero included); pick several to combine them. */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(STATE_LABEL) as TrackingState[]).map((s) => (
          <Chip key={s} active={states.includes(s)} onClick={() => toggle(s)}>
            <span className="inline-flex items-center gap-1.5"><StateDot state={s} />{STATE_LABEL[s]} · {counts[s] ?? 0}</span>
          </Chip>
        ))}
      </div>

      {boardStale && loaded && (
        <Alert tone="error" message={`Live data is out of date: last updated ${ago(new Date(loaded.at).toISOString(), now)}. Positions below may have changed. Retrying every ${LIVE_POLL_MS / 1000} s.`} />
      )}
      {error && !boardStale && <Alert message={error} tone="error" />}
      {data?.truncated && (
        <Alert tone="info" message={`Showing the first ${data.limit ?? data.employees.length} employees only. Narrow the filters to see everyone.`} />
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <TrackingMapLazy employees={mapped} sites={data?.sites ?? []} selectedId={selected} onSelect={setSelected} fitKey={loaded?.key} focus={focus} />
        </div>

        <div className="flex max-h-[40vh] min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs lg:max-h-none lg:w-80">
          <div className="border-b border-line px-3 py-2 text-xs font-semibold text-fg-muted">
            {data ? `${list.length} employees · updated ${ago(data.as_of, now)}` : 'Live positions'}
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {list.map((e) => {
              const stale = isStale(e, now);
              const health = healthText(e.health);
              return (
                <li key={e.employee_id}>
                  <button type="button" onClick={() => pick(e)} className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle ${selected === e.employee_id ? 'bg-bg-subtle' : ''}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg"><StateDot state={e.state} />{e.name}</span>
                    <span className="flex flex-wrap items-center gap-x-3 text-xs text-fg-muted">
                      <span>{STATE_LABEL[e.state]}{e.site_name ? ` · ${e.site_name}` : ''}</span>
                      {e.battery !== null && <span className="inline-flex items-center gap-1"><Battery className="h-3 w-3" />{e.battery}%</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 text-xs text-fg-muted">
                      <span className={`inline-flex items-center gap-1 ${stale ? 'font-semibold text-[#b54708]' : ''}`} title="Time of the last location fix">
                        <MapPin className="h-3 w-3" />
                        {e.recorded_at ? `last fix ${ago(e.recorded_at, now)}` : 'no location fix'}
                        {e.accuracy_m !== null && e.recorded_at ? ` · ±${Math.round(e.accuracy_m)} m` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Last time the phone reached the server"><Clock className="h-3 w-3" />seen {ago(e.last_seen_at, now)}</span>
                    </span>
                    {stale && <span className="text-xs font-semibold text-[#b54708]">Position may be out of date</span>}
                    {health && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#d92d20]" title={e.health ? `Since ${ago(e.health.at, now)}` : undefined}>
                        <AlertTriangle className="h-3 w-3" />{health}
                      </span>
                    )}
                    {selected === e.employee_id && (
                      <span className="mt-1 flex items-center gap-3 text-xs">
                        <Link href={`/org-admin/tracking/timeline?employee=${e.employee_id}`} className="font-semibold text-fg underline">Open timeline</Link>
                        {e.lat === null && <span className="inline-flex items-center gap-1 text-fg-muted"><Crosshair className="h-3 w-3" />No position to show on the map</span>}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {!data && !error && <li className="px-3 py-8 text-center text-sm text-fg-muted">Loading live positions…</li>}
            {!data && error && <li className="px-3 py-8 text-center text-sm text-fg-muted">Live positions could not be loaded. Retrying…</li>}
            {data && list.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-fg-muted">{narrowed ? 'No one matches these filters.' : 'No one is being tracked right now.'}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
