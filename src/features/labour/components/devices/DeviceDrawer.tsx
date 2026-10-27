'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, RefreshCw, RotateCcw, ShieldOff } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { TextField } from '@/components/ui/FormControls';
import { Fact } from '@/features/expense-bills/components/Primitives';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { DeviceDetail } from '../../types/labour.types';
import { parseLabourError } from '../../utils/errors';
import { ago, fmtDateTime } from '../../utils/format';
import { FormError, Pill, Tabs, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { DeviceChart } from './DeviceChart';
import { DeviceEvents } from './DeviceEvents';
import { presence } from './DeviceCard';

type Tab = 'health' | 'events' | 'failures';

export function DeviceDrawer({ id, canManage, onClose, onChanged }: { id: number | null; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  return (
    <Drawer open={id !== null} onClose={onClose} title="Device" maxWidthClassName="sm:max-w-2xl">
      {id !== null && <Body key={id} id={id} canManage={canManage} onChanged={onChanged} />}
    </Drawer>
  );
}

function Body({ id, canManage, onChanged }: { id: number; canManage: boolean; onChanged: () => void }) {
  const [d, setD] = useState<DeviceDetail | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('health');
  const [hours, setHours] = useState(48);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(() => api.getDevice(id, hours).then((r) => { setD(r); setError(''); }).catch((e) => setError(parseLabourError(e).message)), [id, hours]);
  useEffect(() => { load(); }, [load]);

  if (error && !d) return <FormError message={error} />;
  if (!d) return <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;
  const m = d.metrics;
  const p = presence(d);

  const rename = async () => {
    if (!renaming?.trim()) { setNameError('Enter a name'); return; }
    try { await api.renameDevice(id, renaming.trim()); showSuccess('Renamed'); setRenaming(null); load(); onChanged(); } catch (e) { setNameError(parseLabourError(e).message); }
  };
  const resync = () => setConfirm({
    title: 'Force a full resync?', body: 'The machine reloads every face from the server on its next check. It stays usable meanwhile.', cta: 'Resync',
    run: async () => { try { await api.resyncDevice(id); showSuccess('Resync requested'); load(); } catch (e) { showError(parseLabourError(e).message); throw e; } },
  });
  const revoke = () => setConfirm({
    title: `Revoke ${d.name || 'this device'}?`, body: 'The machine is signed out immediately and cannot punch until it is registered again at the site.', cta: 'Revoke access', danger: true,
    run: async () => { try { await api.revokeDevice(id); showSuccess('Device revoked'); load(); onChanged(); } catch (e) { showError(parseLabourError(e).message); throw e; } },
  });

  const restore = () => setConfirm({
    title: `Restore ${d.name || 'this device'}?`, body: 'The machine is allowed back. It stays signed out until someone signs it in again at the site with a site login.', cta: 'Restore access',
    run: async () => { try { await api.restoreDevice(id); showSuccess('Device restored. Sign it in again at the site.'); load(); onChanged(); } catch (e) { showError(parseLabourError(e).message); throw e; } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {renaming === null ? (
            <h3 className="flex items-center gap-1.5 truncate text-base font-bold text-fg">{d.name || d.uid}{canManage && <button type="button" aria-label="Rename device" onClick={() => setRenaming(d.name || '')} className="rounded-md p-1 text-fg-muted hover:bg-bg-subtle"><Pencil className="h-3.5 w-3.5" /></button>}</h3>
          ) : (
            <div className="flex items-start gap-2"><TextField label="Device name" value={renaming} error={nameError} onChange={(v) => { setRenaming(v); setNameError(''); }} /><div className="mt-6 flex gap-1.5"><button type="button" className={primaryBtn} onClick={rename}>Save</button><button type="button" className={secondaryBtn} onClick={() => { setRenaming(null); setNameError(''); }}>Cancel</button></div></div>
          )}
          <p className="text-xs text-fg-muted">{d.siteName || 'No site'} · {d.hardware || 'Unknown hardware'} · v{d.appVersion || '?'}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Pill tone={p.tone}>{p.label}</Pill></div>
        </div>
        {canManage && d.status !== 'revoked' && (
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <button type="button" className={secondaryBtn} onClick={resync}><RefreshCw className="h-3.5 w-3.5" aria-hidden />Resync</button>
            <button type="button" className={secondaryBtn} onClick={revoke}><ShieldOff className="h-3.5 w-3.5" aria-hidden />Revoke</button>
          </div>
        )}
        {canManage && d.status === 'revoked' && (
          <button type="button" className={secondaryBtn} onClick={restore}><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restore</button>
        )}
      </div>
      <p className="text-xs text-fg-muted">{p.detail}</p>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'health', label: 'Health' }, { value: 'events', label: 'Event log' }, { value: 'failures', label: `Gallery failures (${d.galleryFailures.length})` }]} />

      {tab === 'health' && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Fact label="Temperature" value={m?.tempC != null ? `${m.tempC.toFixed(1)} °C` : '—'} />
            <Fact label="CPU" value={m?.cpu != null ? `${Math.round(m.cpu)} %` : '—'} />
            <Fact label="Memory / disk" value={m ? `${m.mem != null ? Math.round(m.mem) : '—'} % / ${m.disk != null ? Math.round(m.disk) : '—'} %` : '—'} />
            <Fact label="Punches waiting to upload" value={m?.outboxPending ?? '—'} />
            <Fact label="Faces on device" value={m ? `${m.galleryCount ?? '—'} (cursor ${m.galleryCursor ?? '—'} of ${d.gallerySeq ?? '—'})` : '—'} />
            <Fact label="AI mode" value={m?.aiMode === 'local' ? 'On the machine' : m?.aiMode === 'server' ? 'On the server' : '—'} />
            <Fact label="Clock offset" value={m?.clockOffsetMs != null ? `${Math.round(m.clockOffsetMs / 1000)} s` : '—'} />
            <Fact label="Last reading" value={fmtDateTime(m?.at)} />
            <Fact label="Last seen" value={d.lastSeenAt ? `${ago(d.lastSeenAt)}` : 'Never'} />
          </dl>
          <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold text-fg">Temperature and CPU</h4>
            <select aria-label="Period" value={hours} onChange={(e) => setHours(Number(e.target.value))} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-semibold"><option value={24}>Last 24 hours</option><option value={48}>Last 48 hours</option><option value={168}>Last 7 days</option></select></div>
          <DeviceChart rows={d.metrics24} />
        </div>
      )}
      {tab === 'events' && <DeviceEvents deviceId={id} />}
      {tab === 'failures' && (
        d.galleryFailures.length === 0 ? <p className="text-sm text-fg-muted">No faces failed to load on this device.</p> : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {d.galleryFailures.map((g) => (
              <li key={g.labourerId} className="px-3 py-2.5"><p className="text-sm font-semibold text-fg">{g.name} <span className="font-normal text-fg-muted">· {g.code}</span></p><p className="break-words text-xs text-[var(--tt-danger)]">{g.error}</p><p className="text-[11px] text-fg-muted">{g.attempts} attempts · {fmtDateTime(g.updatedAt)}</p></li>
            ))}
          </ul>
        )
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
