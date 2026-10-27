'use client';

import { LABOUR_ILLUSTRATIONS as ILL, LABOUR_VIEW_PERMS } from '../../constants/labour.constants';
import { useLabourSites } from '../../hooks/useLabourLists';
import React, { useCallback, useEffect, useState } from 'react';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/labour.api';
import { LP } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { Device } from '../../types/labour.types';
import { EmptyPanel, Block, FilterBar, FilterGrid, FilterSelect, FormError, Gate, PageHeader, Stat, Tabs } from '../shared/Primitives';
import { DeviceCard } from './DeviceCard';
import { DeviceDrawer } from './DeviceDrawer';
import { DeviceEvents } from './DeviceEvents';

export function DevicesPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_VIEW_PERMS)} what="labour devices"><Devices /></Gate>;
}

function Devices() {
  const { can } = useLabourAccess();
  const { sites } = useLabourSites();
  const [tab, setTab] = useState<'devices' | 'events'>('devices');
  const [siteId, setSiteId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    api.listDevices({ siteId, status: status || undefined }).then((r) => { setDevices(r.devices || []); setError(''); }).catch((e) => setError(messageOf(e)));
  }, [siteId, status]);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const online = devices?.filter((d) => d.online).length ?? 0;
  const failures = devices?.reduce((n, d) => n + d.galleryFailures, 0) ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Devices" description="Attendance machines at your sites: health, event log and sync problems." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'devices', label: 'Devices' }, { value: 'events', label: 'Event log' }]} />
      <FilterBar>
        <FilterGrid>
          <SearchableFilterDropdown label="Site" allLabel="All sites" value={siteId} options={sites} onChange={setSiteId} className="md:w-48" />
          {tab === 'devices' && <FilterSelect label="Status" value={status} onChange={setStatus} anyLabel="Any status" options={[{ value: 'active', label: 'Active' }, { value: 'revoked', label: 'Revoked' }]} />}
        </FilterGrid>
      </FilterBar>
      {tab === 'events' ? <DeviceEvents siteId={siteId} /> : (
        <>
          <FormError message={error} />
          {!devices ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Block key={i} className="h-44 rounded-xl" />)}</div> : devices.length === 0 ? (
            <EmptyPanel illustration={ILL.devices} title="No devices yet" text="A machine appears here after it is registered at a site." />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Devices" value={devices.length} />
                <Stat label="Online" value={`${online}/${devices.length}`} />
                <Stat label="Face sync problems" value={failures} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{devices.map((d) => <DeviceCard key={d.id} d={d} onOpen={() => setOpenId(d.id)} />)}</div>
            </>
          )}
        </>
      )}
      <DeviceDrawer id={openId} canManage={can(LP.DEVICES)} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}
