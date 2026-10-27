'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ImageOff, Scale, Trash2, UserRound } from 'lucide-react';
import { Chip, FieldLabel } from '@/components/ui/FormControls';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { AttendanceDay, Punch } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { daysAgo, fmtDate, fmtMinutes, fmtTime, titleCase } from '../../utils/format';
import { HAJRI_CHOICES } from '../../constants/labour.constants';
import { basisLabel, hajriLabel } from '../../utils/pay';
import { DayPay } from './DayPay';
import { FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';

/** Photo links are presigned for 5 minutes; anything older than this is fetched again before it is shown large. */
const LINK_FRESH_MS = 4 * 60 * 1000;

/**
 * `canRemove`: LABOUR_REGULARIZE and the `allowRemovePunch` setting; each punch then gets a Remove action (reason required).
 * `canSetHajri`: LABOUR_REGULARIZE and `allowSetHajri`; a day with punches gets "Set hajri" (½, 1, 1½ … or back to the slab table).
 */
export function PunchDrawer({ day, onClose, canRemove = false, canSetHajri = false, maxBackDays, onChanged }: { day: AttendanceDay | null; onClose: () => void; canRemove?: boolean; canSetHajri?: boolean; maxBackDays?: number; onChanged?: () => void }) {
  return (
    <Drawer open={day !== null} onClose={onClose} title="Punch timeline" maxWidthClassName="sm:max-w-md">
      {day && <Body key={day.id} day={day} canRemove={canRemove} canSetHajri={canSetHajri} maxBackDays={maxBackDays} onChanged={onChanged} />}
    </Drawer>
  );
}

interface Loaded { punches: Punch[]; registered: string | null; at: number }

function Body({ day: initial, canRemove, canSetHajri, maxBackDays, onChanged }: { day: AttendanceDay; canRemove: boolean; canSetHajri: boolean; maxBackDays?: number; onChanged?: () => void }) {
  const [day, setDay] = useState<AttendanceDay>(initial);
  const [settingHajri, setSettingHajri] = useState(false);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<number | null>(null);
  const [removing, setRemoving] = useState<Punch | null>(null);
  const load = useCallback(() => api.listPunches(day.labourerId, day.workDate)
    .then((r) => setData({ punches: r.punches || [], registered: r.registeredPhotoUrl || null, at: Date.now() }))
    .catch((e) => setError(messageOf(e))), [day]);
  useEffect(() => { load(); }, [load]);

  const open = (id: number) => {
    if (data && Date.now() - data.at > LINK_FRESH_MS) load();
    setViewing(id);
  };
  const punches = data?.punches || null;
  const shown = punches?.find((p) => p.id === viewing) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Thumb url={data?.registered || null} alt={`${day.name}, registered photo`} size="h-14 w-14" onClick={data?.registered ? () => open(-1) : undefined} empty={<UserRound className="h-5 w-5 text-fg-subtle" aria-hidden />} />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-fg">{day.name}</h3>
          <p className="text-xs text-fg-muted">{day.code} · {fmtDate(day.workDate)} · {day.siteName || 'No site'}</p>
          <div className="mt-2 flex flex-wrap gap-1.5"><Pill tone={day.status === 'incomplete' ? 'warn' : 'good'}>{titleCase(day.status)}</Pill><Pill>{fmtMinutes(day.workedMinutes)} worked</Pill></div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
        <div className="min-w-0 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Pay · {basisLabel(day.payBasis)}</p>
          <div className="mt-0.5"><DayPay d={day} /></div>
          {day.payBasis !== 'hajri' && day.hajri !== null && day.hajri !== undefined && day.punchCount > 0 && (
            <p className="text-[11px] text-fg-muted">Hajri {hajriLabel(day.hajri)}{day.hajriOverridden ? ' (set by hand)' : ''}; it only pays for labour paid by hajri.</p>
          )}
        </div>
        {canSetHajri && day.punchCount > 0 && (
          <button type="button" className={secondaryBtn} onClick={() => setSettingHajri(true)}><Scale className="h-3.5 w-3.5" aria-hidden />Set hajri</button>
        )}
      </div>
      <FormError message={error} />
      {!punches && !error && <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" />}
      {punches && punches.length === 0 && <p className="text-sm text-fg-muted">No punches on this day.</p>}
      {punches && punches.length > 0 && (
        <ol className="relative space-y-4 border-l border-line pl-5">
          {punches.map((p) => (
            <li key={p.id} className="relative flex items-start justify-between gap-3">
              <span className="absolute -left-[1.85rem] flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface">{p.type === 'in' ? <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden /> : <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg">{p.type === 'in' ? 'IN' : 'OUT'} · {fmtTime(p.punchedAt)}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.source && <Pill>{titleCase(p.source)}</Pill>}
                  {p.matchScore !== null && <Pill>Match {Math.round(p.matchScore * 100)}%</Pill>}
                  {p.livenessScore !== null && <Pill>Liveness {Math.round(p.livenessScore * 100)}%</Pill>}
                  {p.clockTrusted === false && <Pill tone="warn">Device clock not trusted</Pill>}
                </div>
              </div>
              <div className="flex shrink-0 items-start gap-1.5">
                {p.hasImage && (
                  <Thumb url={p.imageUrl || null} alt={`${p.type === 'in' ? 'IN' : 'OUT'} photo at ${fmtTime(p.punchedAt)}`} size="h-14 w-14 shrink-0"
                    onClick={p.imageUrl ? () => open(p.id) : undefined} empty={<ImageOff className="h-4 w-4 text-fg-subtle" aria-label="Photo unavailable" />} />
                )}
                {canRemove && <button type="button" aria-label={`Remove the ${p.type === 'in' ? 'IN' : 'OUT'} punch at ${fmtTime(p.punchedAt)}`} className={secondaryBtn} onClick={() => setRemoving(p)}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {settingHajri && (
        <SetHajriDialog day={day} maxBackDays={maxBackDays} onClose={() => setSettingHajri(false)}
          onDone={(r) => { setSettingHajri(false); setDay((d) => ({ ...d, hajri: r.hajri, hajriOverridden: r.hajriOverridden, payBasis: (r.payBasis as AttendanceDay['payBasis']) ?? d.payBasis })); onChanged?.(); }} />
      )}
      {removing && <RemovePunchDialog day={day} punch={removing} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); load(); onChanged?.(); }} />}
      {viewing !== null && (
        <Dialog open onClose={() => setViewing(null)} title={shown ? `${shown.type === 'in' ? 'IN' : 'OUT'} · ${fmtTime(shown.punchedAt)}` : 'Registered photo'} maxWidthClassName="max-w-3xl">
          <div className={shown ? 'grid gap-3 sm:grid-cols-2' : ''}>
            {shown && <Large url={shown.imageUrl || null} caption="Punch photo" alt={`${day.name}, punch photo`} />}
            <Large url={data?.registered || null} caption="Registered photo (straight)" alt={`${day.name}, registered photo`} />
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** set_hajri: the day's units by hand (0, ½, 1, 1½, 2) or back to the slab table; reason kept in the audit log. */
function SetHajriDialog({ day, maxBackDays, onClose, onDone }: { day: AttendanceDay; maxBackDays?: number; onClose: () => void; onDone: (r: { hajri: number; hajriOverridden: boolean; payBasis: string | null }) => void }) {
  const [choice, setChoice] = useState<number | 'clear' | null>(day.hajriOverridden ? Number(day.hajri) : null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const tooOld = maxBackDays !== undefined && maxBackDays !== null && day.workDate < daysAgo(maxBackDays);
  const save = async () => {
    const e: Record<string, string> = {};
    if (choice === null) e.hajri = 'Choose the hajri for this day';
    if (reason.trim().length < 3) e.reason = 'Write why (at least 3 characters)';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length || choice === null) return;
    setBusy(true);
    try {
      const r = await api.setDayHajri({ labourerId: day.labourerId, workDate: day.workDate, hajri: choice === 'clear' ? null : choice, reason: reason.trim() });
      showSuccess(choice === 'clear' ? 'Hajri back to the slab table' : `Day set to ${hajriLabel(choice)} hajri`);
      onDone({ hajri: r.day?.hajri ?? (choice === 'clear' ? Number(day.hajri) : choice), hajriOverridden: r.day ? r.day.hajriOverridden : choice !== 'clear', payBasis: r.day?.payBasis ?? day.payBasis ?? null });
    } catch (err) {
      const p = placeError(err, (f) => f === 'reason' || f === 'hajri');
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Set hajri" maxWidthClassName="max-w-md"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy || tooOld} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg">{day.name} on {fmtDate(day.workDate)} worked {fmtMinutes(day.workedMinutes)}: <span className="font-semibold">{hajriLabel(day.hajri)} hajri</span>{day.hajriOverridden ? ' (set by hand)' : ' by the slab table'}.</p>
        {day.payBasis !== 'hajri' && <p className="text-xs text-fg-muted">This day is paid {basisLabel(day.payBasis).toLowerCase()}, so hajri does not change its pay.</p>}
        {tooOld && <p className="text-xs font-medium text-[var(--tt-danger)]">This day is more than {maxBackDays} days back and can no longer be changed.</p>}
        <div>
          <FieldLabel label="Hajri for this day" required />
          <div role="radiogroup" aria-label="Hajri for this day" className={`flex flex-wrap gap-1.5 rounded-lg ${errors.hajri ? 'border border-[var(--tt-danger)] p-1.5' : ''}`}>
            {HAJRI_CHOICES.map((u) => <Chip key={u} active={choice === u} onClick={() => { setChoice(u); setErrors({}); }}>{u === 0 ? '0 (not paid)' : hajriLabel(u)}</Chip>)}
            {day.hajriOverridden && <Chip active={choice === 'clear'} onClick={() => { setChoice('clear'); setErrors({}); }}>Use slab table</Chip>}
          </div>
          {errors.hajri && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors.hajri}</p>}
        </div>
        <Textarea label="Reason" required value={reason} error={errors.reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: '' })); }} hint="Kept in the audit log with your name. A later punch keeps this value." />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

function RemovePunchDialog({ day, punch, onClose, onDone }: { day: AttendanceDay; punch: Punch; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const label = `${punch.type === 'in' ? 'IN' : 'OUT'} at ${fmtTime(punch.punchedAt)}`;
  const save = async () => {
    if (reason.trim().length < 3) { setError('Write why this punch is wrong (at least 3 characters)'); return; }
    setBusy(true);
    setFormError('');
    try {
      await api.regularize({ action: 'remove_punch', labourerId: day.labourerId, workDate: day.workDate, punchId: punch.id, reason: reason.trim() });
      showSuccess('Punch removed');
      onDone();
    } catch (err) {
      const p = placeError(err, (f) => f === 'reason');
      setError(p.fields.reason || '');
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Remove this punch?" maxWidthClassName="max-w-md"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Removing…' : 'Remove punch'}</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg">The <span className="font-semibold">{label}</span> punch of {day.name} on {fmtDate(day.workDate)} is deleted and the rest of the day is paired again. It stays in the audit log.</p>
        <Textarea label="Reason" required value={reason} error={error} onChange={(e) => { setReason(e.target.value); setError(''); }} hint="Kept in the audit log with your name." />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

function Thumb({ url, alt, size, onClick, empty }: { url: string | null; alt: string; size: string; onClick?: () => void; empty: React.ReactNode }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  const box = `${size} flex items-center justify-center overflow-hidden rounded-lg border border-line bg-bg-subtle`;
  if (!url || broken) return <div className={box}>{empty}</div>;
  return (
    <button type="button" onClick={onClick} className={`${box} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg`} aria-label={`Open ${alt}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link, not an optimisable asset */}
      <img src={url} alt={alt} className="h-full w-full object-cover" onError={() => setBroken(true)} />
    </button>
  );
}

function Large({ url, caption, alt }: { url: string | null; caption: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return (
    <figure className="space-y-1.5">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-subtle">
        {url && !broken
          // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link
          ? <img src={url} alt={alt} className="h-full w-full object-contain" onError={() => setBroken(true)} />
          : <p className="px-4 text-center text-xs text-fg-muted">{url ? 'This photo could not be loaded. Close and open it again.' : 'No photo'}</p>}
      </div>
      <figcaption className="text-xs font-semibold text-fg-muted">{caption}</figcaption>
    </figure>
  );
}
