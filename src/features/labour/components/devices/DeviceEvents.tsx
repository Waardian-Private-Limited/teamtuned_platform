'use client';

import { LABOUR_ILLUSTRATIONS as ILL } from '../../constants/labour.constants';
import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import * as api from '../../api/labour.api';
import { DEVICE_EVENT_TYPES, DEVICE_SEVERITIES } from '../../constants/labour.constants';
import { usePagedList } from '../../hooks/usePagedList';
import type { DeviceEvent } from '../../types/labour.types';
import { daysAgo, fmtDateTime, titleCase, today } from '../../utils/format';
import { DateFilter, FilterBar, FilterGrid, FilterSelect, ListShell, Pill } from '../shared/Primitives';

interface Filters extends Record<string, unknown> { search?: string; type: string; severity: string; from: string; to: string }
const INITIAL: Filters = { type: '', severity: '', from: daysAgo(7), to: today() };

export const sevTone = (s: string) => (s === 'error' ? 'bad' : s === 'warn' || s === 'warning' ? 'warn' : 'neutral') as 'bad' | 'warn' | 'neutral';

/** Paged, filterable device log. `deviceId` narrows it to one machine. */
export function DeviceEvents({ deviceId, siteId }: { deviceId?: number; siteId?: number | null }) {
  const list = usePagedList<DeviceEvent, Filters>(
    (f, page, pageSize) => api.listDeviceEvents({ deviceId, siteId: siteId ?? undefined, type: f.type || undefined, severity: f.severity || undefined, from: f.from || undefined, to: f.to || undefined, page, pageSize }),
    INITIAL, { pageSize: deviceId ? 25 : 50 }
  );
  const f = list.filters;
  const [photo, setPhoto] = useState<DeviceEvent | null>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <FilterBar>
        <FilterGrid>
          <DateFilter label="From" value={f.from} onChange={(from) => list.update({ from })} />
          <DateFilter label="To" value={f.to} onChange={(to) => list.update({ to })} />
          <FilterSelect label="Type" value={f.type} onChange={(type) => list.update({ type })} anyLabel="Any type" options={DEVICE_EVENT_TYPES.map((t) => ({ value: t, label: titleCase(t) }))} />
          <FilterSelect label="Severity" value={f.severity} onChange={(severity) => list.update({ severity })} anyLabel="Any severity" options={DEVICE_SEVERITIES.map((t) => ({ value: t, label: t === 'warn' ? 'Warning' : titleCase(t) }))} />
        </FilterGrid>
      </FilterBar>
      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={list.hasActiveFilters} onClear={list.clear}
        emptyIllustration={ILL.events} emptyTitle="No events" emptyText="Nothing was logged in this range." minH="min-h-[260px]"
        page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <ul className="divide-y divide-line/60">
          {list.rows.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
              <span className="w-36 shrink-0 text-xs text-fg-muted">{fmtDateTime(e.createdAt)}</span>
              <div className="flex shrink-0 gap-1.5"><Pill tone={sevTone(e.severity)}>{e.severity === 'warn' ? 'warning' : e.severity}</Pill><Pill>{titleCase(e.type)}</Pill></div>
              <div className="min-w-0 flex-1"><p className="break-words text-sm text-fg">{e.message}</p>{!deviceId && <p className="text-[11px] text-fg-muted">{e.deviceName || `Device ${e.deviceId}`}</p>}</div>
              {e.imageUrl && (
                <button type="button" onClick={() => setPhoto(e)} aria-label="Open the event photo" className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link */}
                  <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </ListShell>
      {photo && (
        <Dialog open onClose={() => setPhoto(null)} title={`${titleCase(photo.type)} · ${fmtDateTime(photo.createdAt)}`} maxWidthClassName="max-w-xl">
          <div className="flex items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link (5 minutes; refresh the list if it has expired) */}
            <img src={photo.imageUrl || ''} alt={photo.message} className="max-h-[70vh] w-full object-contain" />
          </div>
          <p className="mt-2 text-xs text-fg-muted">{photo.message}</p>
        </Dialog>
      )}
    </div>
  );
}

