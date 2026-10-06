'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/FormControls';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { adjustTrip, getTrip, listTrips } from '../api/tracking.api';
import { PAGE_SIZE, TRACKING_PERMISSIONS, kmText, minutesText, timeText } from '../constants/tracking.constants';
import type { TripDto, TripStatus } from '../types/tracking.dto';
import { TrackingMapLazy } from './map/TrackingMapLazy';

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted';
const STATUS_OPTIONS = [
  { value: 'submitted', label: 'To review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
] as const;
const TONE: Record<TripStatus, 'active' | 'inactive' | 'neutral'> = { approved: 'active', rejected: 'inactive', submitted: 'neutral', ended: 'neutral', active: 'neutral', auto_closed: 'neutral' };
const km = (t: TripDto) => t.approved_km ?? t.adjusted_km ?? t.claimed_km ?? t.gps_distance_m / 1000;

function csv(rows: TripDto[]) {
  const head = ['Date', 'Employee', 'Code', 'Vehicle', 'Status', 'GPS km', 'Claimed km', 'Approved km', 'Rate', 'Amount', 'Purpose'];
  const body = rows.map((t) => [t.work_date, t.employee_name ?? '', t.employee_code ?? '', t.vehicle_label ?? '', t.status, (t.gps_distance_m / 1000).toFixed(2), t.claimed_km ?? '', t.approved_km ?? '', t.rate_per_km ?? '', t.amount ?? '', (t.purpose ?? '').replaceAll('"', "'")]);
  return [head, ...body].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
}

export function VisitsPage() {
  const { can } = usePermission();
  const canReview = can(TRACKING_PERMISSIONS.TRIP_REVIEW);
  const [status, setStatus] = useState<string>('submitted');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TripDto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<TripDto | null>(null);
  const [adjusted, setAdjusted] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    listTrips({ status, from, to, page, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.trips); setTotal(r.total); setError(null); })
      .catch((e) => setError(messageOf(e)));
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to, page]);

  const show = async (t: TripDto) => {
    try {
      const full = await getTrip(t.id);
      setOpen(full);
      setAdjusted(String(full.adjusted_km ?? full.claimed_km ?? ''));
      setNote(full.adjust_note ?? '');
    } catch (e) {
      setError(messageOf(e));
    }
  };

  const saveAdjust = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await adjustTrip(open.id, Number(adjusted), note);
      await Promise.all([show(open), load()]);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `field-visits-${from || 'all'}-${to || 'now'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl fitText options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm" aria-label="From" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm" aria-label="To" />
        <Button variant="secondary" onClick={download} disabled={!rows.length}>Export CSV</Button>
        <Link href="/org-admin/approvals" className="text-sm font-semibold text-fg underline">Decide in approvals</Link>
      </div>
      {error && <Alert message={error} tone="error" />}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface shadow-xs">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="sticky top-0 border-b border-line bg-surface"><tr><th className={th}>Date</th><th className={th}>Employee</th><th className={th}>Vehicle</th><th className={th}>Distance</th><th className={th}>Amount</th><th className={th}>Status</th><th className={th}>Flags</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((t) => (
              <tr key={t.id} className="cursor-pointer hover:bg-bg-subtle" onClick={() => show(t)}>
                <td className="px-3 py-2">{t.work_date}</td>
                <td className="px-3 py-2 font-semibold text-fg">{t.employee_name}</td>
                <td className="px-3 py-2">{t.vehicle_label ?? '-'}</td>
                <td className="px-3 py-2">{km(t).toFixed(1)} km</td>
                <td className="px-3 py-2">{t.amount === null ? '-' : t.amount.toFixed(2)}</td>
                <td className="px-3 py-2"><StatusPill label={t.status.replace('_', ' ')} tone={TONE[t.status]} /></td>
                <td className="px-3 py-2 text-xs text-[var(--tt-danger)]">{t.flags.map((f) => f.replaceAll('_', ' ').toLowerCase()).join(', ')}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-fg-muted">No field visits here.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} pageSizeOptions={[PAGE_SIZE]} />

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? `${open.employee_name} · ${open.work_date}` : ''}>
        {open && (
          <div className="flex flex-col gap-3">
            <div className="h-72 overflow-hidden rounded-xl border border-line">
              <TrackingMapLazy route={open.route ?? []} stops={open.stops.map((s) => ({ lat: s.lat, lng: s.lng, label: `${s.customer || 'Stop'} · ${minutesText(s.minutes)}` }))} fitKey={String(open.id)} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-fg-muted">GPS distance</dt><dd>{kmText(open.gps_distance_m)}</dd>
              <dt className="text-fg-muted">Odometer</dt><dd>{open.odo_start ?? '-'} → {open.odo_end ?? '-'}</dd>
              <dt className="text-fg-muted">Claimed</dt><dd>{open.claimed_km ?? '-'} km</dd>
              <dt className="text-fg-muted">Rate</dt><dd>{open.rate_per_km ?? '-'} per km</dd>
              <dt className="text-fg-muted">Amount</dt><dd className="font-semibold">{open.amount ?? '-'}</dd>
              <dt className="text-fg-muted">Time</dt><dd>{timeText(open.started_at)} - {timeText(open.ended_at)}</dd>
              <dt className="text-fg-muted">At site / away</dt><dd>{minutesText(open.site_minutes)} / {minutesText(open.outside_minutes)}</dd>
              <dt className="text-fg-muted">Purpose</dt><dd>{open.purpose || '-'}</dd>
            </dl>
            {open.flags.length > 0 && <Alert message={`Check: ${open.flags.map((f) => f.replaceAll('_', ' ').toLowerCase()).join(', ')}`} tone="info" />}
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">Stops</div>
              <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                {open.stops.map((s) => (
                  <li key={s.seq} className="px-3 py-2"><div className="font-medium text-fg">{s.customer || `Stop ${s.seq}`} · {minutesText(s.minutes)}</div><div className="text-xs text-fg-muted">{timeText(s.arrived_at)}{s.note ? ` · ${s.note}` : ''}</div></li>
                ))}
                {open.stops.length === 0 && <li className="px-3 py-3 text-fg-muted">No stops.</li>}
              </ul>
            </div>
            {canReview && open.status === 'submitted' && (
              <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Correct the distance before approving</div>
                <TextField label="Distance (km)" value={adjusted} onChange={setAdjusted} inputMode="decimal" />
                <TextField label="Reason" value={note} onChange={setNote} />
                <Button onClick={saveAdjust} loading={busy} disabled={!adjusted}>Save distance</Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
