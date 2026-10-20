'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Lock, MapPin, User } from 'lucide-react';

export type Geo = { lat: number; lng: number; accuracy: number | null };
export interface SystemValues { name?: string | null; at?: string | null; geo?: Geo | null; locating?: boolean; geoError?: string; sample?: boolean }

// Built into every form (the same four the old forms always had). Never typed by the person: the submission
// itself carries who, when and where, so nothing here is stored in the answers.
export const SYSTEM_FIELDS = [
  { key: 'system_submitted_by', label: 'Submitted by', icon: User },
  { key: 'system_date', label: 'Date', icon: Calendar },
  { key: 'system_time', label: 'Time', icon: Clock },
  { key: 'system_location', label: 'Location', icon: MapPin },
] as const;

function text(key: string, v: SystemValues): string {
  const at = v.at ? new Date(v.at) : new Date();
  if (key === 'system_submitted_by') return v.name || (v.sample ? 'Filled in automatically' : '—');
  if (key === 'system_date') return at.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  if (key === 'system_time') return at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (v.geo) return `${v.geo.lat.toFixed(5)}, ${v.geo.lng.toFixed(5)}${v.geo.accuracy ? ` · ±${Math.round(v.geo.accuracy)} m` : ''}`;
  if (v.locating) return 'Finding your location…';
  return v.geoError || (v.sample ? 'Captured on submit' : 'Not captured');
}

export function SystemFields({ values }: { values: SystemValues }) {
  return (
    <div className="mb-4 rounded-lg border border-line bg-bg-subtle p-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted"><Lock className="h-3 w-3" />Filled in automatically</p>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SYSTEM_FIELDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex min-w-0 items-start gap-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" />
            <div className="min-w-0">
              <dt className="text-[11px] text-fg-muted">{label}</dt>
              <dd className={key === 'system_location' && values.geoError ? 'break-words text-xs font-semibold text-[var(--tt-danger)]' : 'break-words text-xs font-semibold text-fg'}>
                {key === 'system_location' && values.geo && !values.sample
                  ? <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${values.geo.lat},${values.geo.lng}`}>{text(key, values)}</a>
                  : text(key, values)}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Asks the browser for the current position once when a fill screen opens; retry() asks again. */
export function useDevicePosition(enabled = true) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setError('This device cannot share its location'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(
      (p) => { setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setLocating(false); },
      () => { setError('Location is off. Turn it on and retry'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [enabled, tick]);
  return { geo, locating, error, retry: () => setTick((t) => t + 1) };
}
