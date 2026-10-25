'use client';

// Add, edit, generate and history dialogs for milestones, used by the month plan and the dashboard.
import React from 'react';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { fieldErrorsOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, TextField } from '@/components/ui/FormControls';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { Location, Milestone } from '../api/dpr.api';
import { DateBox, LocationSelect } from './parts';

export function EditDialog({ siteId, milestone, locations, onClose, onSaved, defaultTarget = null }: { siteId: number; milestone: Milestone | null; locations: Location[]; onClose: () => void; onSaved: () => void; defaultTarget?: string | null }) {
  const [v, setV] = React.useState({ activity: milestone?.activity || '', purpose: milestone?.purpose || '', location_id: milestone?.location_id || null, level: milestone?.level || '', target_on: milestone?.target_on || defaultTarget, reason: '', done_on: milestone?.done_on || null });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const levels = locations.find((l) => l.id === v.location_id)?.levels || [];
  const moved = Boolean(milestone?.target_on) && v.target_on !== milestone?.target_on;
  const save = async () => {
    setBusy(true);
    try {
      if (milestone) await api.editMilestone(milestone.id, { activity: v.activity, purpose: v.purpose || null, location_id: v.location_id, level: v.level || null, target_on: v.target_on, ...(moved ? { reason: v.reason } : {}), done_on: v.done_on });
      else await api.addMilestone(siteId, { activity: v.activity, purpose: v.purpose || null, location_id: v.location_id, level: v.level || null, target_on: v.target_on });
      showSuccess(milestone ? 'Milestone saved' : 'Milestone added');
      onSaved();
    } catch (e) { const f = fieldErrorsOf(e); setErrors(f.fields); if (f.general) showError(f.general); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={milestone ? 'Edit milestone' : 'Add milestone'} footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Save</Btn></div>}>
      <div className="space-y-3">
        <TextField label="Work item" required value={v.activity} onChange={(x) => setV({ ...v, activity: x })} error={errors.activity} placeholder="e.g. Slab casting" />
        <TextField label="Purpose" value={v.purpose} onChange={(x) => setV({ ...v, purpose: x })} placeholder="e.g. Shuttering, reinforcement, pour" />
        <div className="grid grid-cols-2 gap-3">
          <div><p className="mb-1.5 text-xs font-semibold">Location</p><LocationSelect locations={locations} value={v.location_id} onChange={(x) => setV({ ...v, location_id: x, level: '' })} ariaLabel="Location" overallLabel="Whole site" /></div>
          <div>
            <p className="mb-1.5 text-xs font-semibold">Level</p>
            <input list="dpr-levels" value={v.level} onChange={(e) => setV({ ...v, level: e.target.value })} aria-label="Level" placeholder="e.g. Slab 3" className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" />
            <datalist id="dpr-levels">{levels.map((l) => <option key={l} value={l} />)}</datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="mb-1.5 text-xs font-semibold">Target</p><DateBox value={v.target_on} onChange={(x) => setV({ ...v, target_on: x })} ariaLabel="Target" error={errors.target_on} /></div>
          {milestone && <div><p className="mb-1.5 text-xs font-semibold">Done on</p><DateBox value={v.done_on} onChange={(x) => setV({ ...v, done_on: x })} ariaLabel="Done on" error={errors.done_on} /></div>}
        </div>
        {moved && <TextField label="Why the date moves" required value={v.reason} onChange={(x) => setV({ ...v, reason: x })} error={errors.reason} />}
      </div>
    </Dialog>
  );
}

export function GenerateDialog({ siteId, locations, onClose, onSaved }: { siteId: number; locations: Location[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState({ activity: '', purpose: '', location_ids: [] as string[], start_on: null as string | null, every_days: 7 });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const count = locations.filter((l) => v.location_ids.includes(l.id)).reduce((s, l) => s + Math.max(1, l.levels.length), 0);
  const save = async () => {
    setBusy(true);
    try { const r = await api.generateMilestones(siteId, { ...v, every_days: v.start_on ? v.every_days : null }); showSuccess(`${r.added} milestones added`); onSaved(); } catch (e) { const f = fieldErrorsOf(e); setErrors(f.fields); if (f.general) showError(f.general); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="Add milestones by level" footer={<div className="flex items-center justify-between gap-2"><span className="text-xs text-fg-muted">{count} milestones</span><div className="flex gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!count} onClick={save}>Add</Btn></div></div>}>
      <div className="space-y-3">
        <p className="text-xs text-fg-muted">One milestone per level of each location picked, for one activity. With a start date, each level comes the set number of days after the one before.</p>
        <TextField label="Work item" required value={v.activity} onChange={(x) => setV({ ...v, activity: x })} error={errors.activity} placeholder="e.g. Slab casting" />
        <TextField label="Purpose" value={v.purpose} onChange={(x) => setV({ ...v, purpose: x })} />
        <div>
          <p className="mb-1.5 text-xs font-semibold">Locations</p>
          <div className="flex flex-wrap gap-1.5">{locations.map((l) => <Chip key={l.id} active={v.location_ids.includes(l.id)} onClick={() => setV({ ...v, location_ids: v.location_ids.includes(l.id) ? v.location_ids.filter((x) => x !== l.id) : [...v.location_ids, l.id] })}>{l.name} · {l.levels.length || 1}</Chip>)}</div>
          {errors.location_ids && <p className="mt-1 text-xs text-[var(--tt-danger)]">{errors.location_ids}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="mb-1.5 text-xs font-semibold">First target</p><DateBox value={v.start_on} onChange={(x) => setV({ ...v, start_on: x })} ariaLabel="First target" error={errors.start_on} /></div>
          <TextField label="Days between levels" type="number" value={String(v.every_days)} onChange={(x) => setV({ ...v, every_days: Number(x) || 0 })} error={errors.every_days} disabled={!v.start_on} />
        </div>
      </div>
    </Dialog>
  );
}

export function HistoryDialog({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const { data, error } = useAsync(() => api.milestoneHistory(milestone.id), [milestone.id]);
  return (
    <Dialog open onClose={onClose} title={`History: ${milestone.activity}`}>
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      {data && !data.items.length && <p className="text-sm text-fg-muted">No changes yet.</p>}
      <ol className="space-y-2.5">
        {data?.items.map((h, i) => (
          <li key={i} className="rounded-lg border border-line p-2.5 text-sm">
            <p className="font-medium text-fg">{h.kind === 'target' ? <>Target {formatDate(h.from_on)} → <b>{formatDate(h.to_on)}</b></> : h.kind === 'done' ? <>Done on {formatDate(h.to_on)}</> : 'Marked not done'}</p>
            {h.reason && <p className="text-xs text-fg-muted">{h.reason}</p>}
            <p className="mt-0.5 text-[11px] text-fg-muted">{h.by_name || 'System'} · {formatDayTime(h.changed_at)}</p>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
