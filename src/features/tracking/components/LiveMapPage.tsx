'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Battery, Clock } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Chip } from '@/components/ui/FormControls';
import { usePolling } from '@/lib/hooks/usePolling';
import { messageOf } from '@/lib/api/errors';
import { getLiveBoard } from '../api/tracking.api';
import { ATTENTION, LIVE_POLL_MS, STATE_COLOR, STATE_LABEL } from '../constants/tracking.constants';
import type { LiveBoardDto, TrackingFilters as Filters, TrackingState } from '../types/tracking.dto';
import { TrackingFilters } from './TrackingFilters';
import { TrackingMapLazy } from './map/TrackingMapLazy';

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
};

function StateDot({ state }: { state: TrackingState }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STATE_COLOR[state] }} />;
}

export function LiveMapPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [states, setStates] = useState<TrackingState[]>([]);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LiveBoardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  usePolling(
    async (signal) => {
      try {
        setData(await getLiveBoard(filters, states, signal));
        setError(null);
      } catch (err) {
        if (!signal.aborted) setError(messageOf(err));
      }
    },
    LIVE_POLL_MS,
    true,
    JSON.stringify([filters, states])
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.employees ?? [])
      .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.employee_code ?? '').toLowerCase().includes(q))
      .sort((a, b) => Number(ATTENTION.includes(b.state)) - Number(ATTENTION.includes(a.state)) || a.name.localeCompare(b.name));
  }, [data, search]);

  const mapped = useMemo(() => list.filter((e) => e.lat !== null && e.lng !== null).map((e) => ({ id: e.employee_id, name: e.name, lat: e.lat as number, lng: e.lng as number, state: e.state })), [list]);
  const toggle = (s: TrackingState) => setStates((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const counts = data?.counts ?? {};

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

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(STATE_LABEL) as TrackingState[]).filter((s) => counts[s] || states.includes(s)).map((s) => (
          <Chip key={s} active={states.includes(s)} onClick={() => toggle(s)}>
            <span className="inline-flex items-center gap-1.5"><StateDot state={s} />{STATE_LABEL[s]} · {counts[s] ?? 0}</span>
          </Chip>
        ))}
      </div>

      {error && <Alert message={error} tone="error" />}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <TrackingMapLazy employees={mapped} sites={data?.sites ?? []} selectedId={selected} onSelect={setSelected} fitKey={JSON.stringify(filters) + states.join()} />
        </div>

        <div className="flex max-h-[40vh] min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs lg:max-h-none lg:w-80">
          <div className="border-b border-line px-3 py-2 text-xs font-semibold text-fg-muted">{list.length} employees{data ? ` · updated ${ago(data.as_of)}` : ''}</div>
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {list.map((e) => (
              <li key={e.employee_id}>
                <button type="button" onClick={() => setSelected(e.employee_id)} className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle ${selected === e.employee_id ? 'bg-bg-subtle' : ''}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-fg"><StateDot state={e.state} />{e.name}</span>
                  <span className="flex flex-wrap items-center gap-x-3 text-xs text-fg-muted">
                    <span>{STATE_LABEL[e.state]}{e.site_name ? ` · ${e.site_name}` : ''}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{ago(e.last_seen_at)}</span>
                    {e.battery !== null && <span className="inline-flex items-center gap-1"><Battery className="h-3 w-3" />{e.battery}%</span>}
                  </span>
                  {selected === e.employee_id && (
                    <Link href={`/org-admin/tracking/timeline?employee=${e.employee_id}`} className="mt-1 text-xs font-semibold text-fg underline">Open timeline</Link>
                  )}
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-muted">No one is being tracked right now.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
