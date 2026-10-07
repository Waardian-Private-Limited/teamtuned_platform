'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import { TextField } from '@/components/ui/FormControls';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { adjustTrip, getTrip, listTrips } from '../api/tracking.api';
import { TRACKING_PERMISSIONS, kmText, minutesText, timeText } from '../constants/tracking.constants';
import type { TripDto } from '../types/tracking.dto';
import { TrackingMapLazy } from './map/TrackingMapLazy';
import { VisitsToolbar } from './components/VisitsToolbar';
import { VisitsTable } from './components/VisitsTable';
import { VisitCardList } from './components/VisitCardList';
import { VisitsTableSkeleton } from './components/VisitsTableSkeleton';
import { VisitsEmptyState } from './components/VisitsEmptyState';

function csv(rows: TripDto[]) {
  const head = [
    'Date',
    'Employee',
    'Code',
    'Vehicle',
    'Status',
    'GPS km',
    'Claimed km',
    'Approved km',
    'Rate',
    'Amount',
    'Purpose',
  ];
  const body = rows.map((t) => [
    t.work_date,
    t.employee_name ?? '',
    t.employee_code ?? '',
    t.vehicle_label ?? '',
    t.status,
    (t.gps_distance_m / 1000).toFixed(2),
    t.claimed_km ?? '',
    t.approved_km ?? '',
    t.rate_per_km ?? '',
    t.amount ?? '',
    (t.purpose ?? '').replaceAll('"', "'"),
  ]);
  return [head, ...body].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
}

export function VisitsPage() {
  const { can } = usePermission();
  const canReview = can(TRACKING_PERMISSIONS.TRIP_REVIEW);

  const [status, setStatus] = useState<string>('submitted');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<TripDto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Detail drawer state
  const [open, setOpen] = useState<TripDto | null>(null);
  const [adjusted, setAdjusted] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    return listTrips({ status, from, to, page, pageSize })
      .then((r) => {
        setRows(r.trips);
        setTotal(r.total);
        setError(null);
      })
      .catch((e) => setError(messageOf(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to, page, pageSize]);

  // Client-side quick filter for search input
  const displayedRows = useMemo(() => {
    if (!searchValue.trim()) return rows;
    const q = searchValue.trim().toLowerCase();
    return rows.filter(
      (t) =>
        t.employee_name?.toLowerCase().includes(q) ||
        t.employee_code?.toLowerCase().includes(q) ||
        t.purpose?.toLowerCase().includes(q)
    );
  }, [rows, searchValue]);

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

  const clearFilters = () => {
    setStatus('');
    setFrom('');
    setTo('');
    setSearchValue('');
    setPage(1);
  };

  const isFiltered = Boolean(status) || Boolean(from) || Boolean(to) || Boolean(searchValue.trim());
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Modern Toolbar */}
      <VisitsToolbar
        total={total}
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        from={from}
        onFromChange={(f) => {
          setFrom(f);
          setPage(1);
        }}
        to={to}
        onToChange={(t) => {
          setTo(t);
          setPage(1);
        }}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onExportCsv={download}
        hasRows={rows.length > 0}
      />

      {/* Main Content Card with Table & Pagination */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {error && (
          <div className="border-b border-line p-3">
            <Alert message={error} tone="error" />
          </div>
        )}

        {loading ? (
          <div className="flex-1 overflow-hidden">
            <VisitsTableSkeleton rows={Math.min(pageSize, 8)} />
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="flex flex-1 flex-col">
            <VisitsEmptyState
              status={status}
              isFiltered={isFiltered}
              onClear={clearFilters}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden min-h-0 flex-1 overflow-hidden md:block">
              <VisitsTable rows={displayedRows} onRowClick={show} />
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="min-h-0 flex-1 overflow-y-auto tt-scrollbar md:hidden">
              <VisitCardList rows={displayedRows} onRowClick={show} />
            </div>

            {/* Pagination Controls */}
            {total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Visit Detail & Adjustment Drawer */}
      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `${open.employee_name} · ${open.work_date}` : ''}
      >
        {open && (
          <div className="flex flex-col gap-3">
            {/* Lazy Map Component */}
            <div className="h-72 overflow-hidden rounded-xl border border-line">
              <TrackingMapLazy
                route={open.route ?? []}
                stops={open.stops.map((s) => ({
                  lat: s.lat,
                  lng: s.lng,
                  label: `${s.customer || 'Stop'} · ${minutesText(s.minutes)}`,
                }))}
                fitKey={String(open.id)}
              />
            </div>

            {/* Trip Details Grid */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
              <dt className="text-fg-muted">GPS distance</dt>
              <dd className="font-medium text-fg">{kmText(open.gps_distance_m)}</dd>
              <dt className="text-fg-muted">Odometer</dt>
              <dd className="font-mono text-fg">{open.odo_start ?? '-'} → {open.odo_end ?? '-'}</dd>
              <dt className="text-fg-muted">Claimed</dt>
              <dd className="font-medium text-fg">{open.claimed_km ?? '-'} km</dd>
              <dt className="text-fg-muted">Rate</dt>
              <dd className="text-fg">{open.rate_per_km ? `₹${open.rate_per_km}/km` : '-'}</dd>
              <dt className="text-fg-muted">Amount</dt>
              <dd className="font-bold text-fg">{open.amount !== null ? `₹${open.amount}` : '-'}</dd>
              <dt className="text-fg-muted">Time</dt>
              <dd className="text-fg">{timeText(open.started_at)} - {timeText(open.ended_at)}</dd>
              <dt className="text-fg-muted">At site / away</dt>
              <dd className="text-fg">
                {minutesText(open.site_minutes)} / {minutesText(open.outside_minutes)}
              </dd>
              <dt className="text-fg-muted">Purpose</dt>
              <dd className="text-fg">{open.purpose || '-'}</dd>
            </dl>

            {/* Alert Flags */}
            {open.flags.length > 0 && (
              <Alert
                message={`Attention required: ${open.flags
                  .map((f) => f.replaceAll('_', ' ').toLowerCase())
                  .join(', ')}`}
                tone="info"
              />
            )}

            {/* Stops Breakdown */}
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Stops
              </div>
              <ul className="divide-y divide-line rounded-xl border border-line text-xs sm:text-sm">
                {open.stops.map((s) => (
                  <li key={s.seq} className="px-3 py-2">
                    <div className="font-medium text-fg">
                      {s.customer || `Stop ${s.seq}`} · {minutesText(s.minutes)}
                    </div>
                    <div className="text-xs text-fg-muted">
                      {timeText(s.arrived_at)}
                      {s.note ? ` · ${s.note}` : ''}
                    </div>
                  </li>
                ))}
                {open.stops.length === 0 && (
                  <li className="px-3 py-3 text-fg-muted text-center">No recorded stops.</li>
                )}
              </ul>
            </div>

            {/* Admin Distance Adjustment */}
            {canReview && open.status === 'submitted' && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-line p-3 bg-surface">
                <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Correct the distance before approving
                </div>
                <TextField
                  label="Distance (km)"
                  value={adjusted}
                  onChange={setAdjusted}
                  inputMode="decimal"
                />
                <TextField label="Reason" value={note} onChange={setNote} />
                <Button
                  onClick={saveAdjust}
                  loading={busy}
                  disabled={!adjusted}
                  className="w-full mt-1"
                >
                  Save distance
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
