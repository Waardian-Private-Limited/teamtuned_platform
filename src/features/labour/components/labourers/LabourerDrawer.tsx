'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileDown, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Fact } from '@/features/expense-bills/components/Primitives';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { AttendanceDay, LabourerDetail, MachineSyncState } from '../../types/labour.types';
import { daysAgo, fmtDate, fmtDateTime, fmtMinutes, fmtTime, fullName, titleCase, today } from '../../utils/format';
import { FormError, Pill, Tabs, secondaryBtn } from '../shared/Primitives';
import { FaceBadge } from './LabourersPage';
import { FormsPdfDialog } from './FormsPdfDialog';
import { PayPanel } from './PayPanel';
import { ComplianceGapsList } from './ComplianceGapsList';
import type { StepId } from './wizard/wizard.types';
import { hajriLabel } from '../../utils/pay';

type Tab = 'profile' | 'pay' | 'documents' | 'face' | 'attendance';
const addrLine = (a?: Record<string, string | null | undefined> | null) => (a ? [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '') || '—';

export function LabourerDrawer({ id, onClose, canManage, canForms, onEdit, onChanged }: { id: number | null; onClose: () => void; canManage: boolean; canForms: boolean; onEdit: (id: number, startAt?: StepId) => void; onChanged: () => void }) {
  return (
    <Drawer open={id !== null} onClose={onClose} title="Labourer" maxWidthClassName="sm:max-w-xl">
      {id !== null && <Body key={id} id={id} canManage={canManage} canForms={canForms} onEdit={onEdit} onChanged={onChanged} onClose={onClose} />}
    </Drawer>
  );
}

function Body({ id, canManage, canForms, onEdit, onChanged, onClose }: { id: number; canManage: boolean; canForms: boolean; onEdit: (id: number, startAt?: StepId) => void; onChanged: () => void; onClose: () => void }) {
  const [d, setD] = useState<LabourerDetail | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('profile');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pdf, setPdf] = useState(false);

  const load = useCallback(() => api.getLabourer(id).then(setD).catch((e) => setError(messageOf(e))), [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <FormError message={error} />;
  if (!d) return <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  const open = async (docId: number) => {
    try { window.open((await api.labourerDocLink(id, docId)).url, '_blank', 'noopener'); } catch (e) { showError(messageOf(e)); }
  };
  const removeDoc = (docId: number) => setConfirm({
    title: 'Remove this document?', body: 'The file is deleted and cannot be recovered.', cta: 'Remove', danger: true,
    run: async () => { try { await api.deleteLabourerDoc(id, docId); showSuccess('Document removed'); load(); } catch (e) { showError(messageOf(e)); } },
  });
  const remove = () => setConfirm({
    title: `Remove ${fullName(d)}?`, body: 'The labourer is taken off the roll. Past attendance stays on record.', cta: 'Remove', danger: true,
    run: async () => { try { await api.deleteLabourer(id); showSuccess('Labourer removed'); onChanged(); onClose(); } catch (e) { showError(messageOf(e)); } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-bg-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {d.photoUrl && <img src={d.photoUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-fg">{fullName(d)}</h3>
          <p className="text-xs text-fg-muted">{d.code} · {d.contractorName || 'No contractor'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5"><Pill tone={d.status === 'active' ? 'good' : 'neutral'}>{titleCase(d.status)}</Pill><FaceBadge l={d} /></div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {canForms && <button type="button" className={secondaryBtn} onClick={() => setPdf(true)}><FileDown className="h-3.5 w-3.5" aria-hidden />Forms PDF</button>}
          {canManage && (<>
            <button type="button" className={secondaryBtn} onClick={() => onEdit(id)}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button>
            <button type="button" aria-label="Remove labourer" className={secondaryBtn} onClick={remove}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
          </>)}
        </div>
      </div>

      {d.complianceGaps && d.complianceGaps.missing.length > 0 && (
        <ComplianceGapsList gaps={d.complianceGaps} action={canManage ? <button type="button" className={secondaryBtn} onClick={() => onEdit(id, 'compliance')}>Fill now</button> : undefined} />
      )}

      {d.machineSync && <MachineSync sync={d.machineSync} />}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'profile', label: 'Profile' }, { value: 'pay', label: 'Pay' }, { value: 'documents', label: `Documents (${d.documents.length})` }, { value: 'face', label: 'Face' }, { value: 'attendance', label: 'Attendance' }]} />

      {tab === 'profile' && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Fact label="Site" value={d.siteName || '—'} />
          <Fact label="Category" value={[d.categoryName, d.subcategoryName].filter(Boolean).join(' / ') || '—'} />
          <Fact label="Mobile" value={d.phone || '—'} />
          <Fact label="Emergency" value={d.emergencyPhone || '—'} />
          <Fact label="Guardian" value={d.guardianName || '—'} />
          <Fact label="Gender" value={d.gender ? titleCase(d.gender) : '—'} />
          <Fact label="Date of birth" value={fmtDate(d.dob)} />
          <Fact label="Work start" value={fmtDate(d.workStartDate)} />
          <Fact label="Aadhaar" value={d.aadhaarMasked || (d.aadhaarLast4 ? `XXXX XXXX ${d.aadhaarLast4}` : '—')} />
          <Fact label="Present address" wide value={addrLine(d.addresses?.present as never)} />
          <Fact label="Permanent address" wide value={addrLine(d.addresses?.permanent as never)} />
          {d.profileHidden && <p className="col-span-2 rounded-xl bg-bg-subtle p-3 text-xs text-fg-muted">Compliance details hidden — needs Manage labour or Compliance permission.</p>}
          {!d.profileHidden && Object.entries(d.profile || {}).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '').map(([k, v]) => <Fact key={k} label={titleCase(k)} value={v === 'true' ? 'Yes' : v === 'false' ? 'No' : v} />)}
        </dl>
      )}
      {tab === 'documents' && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {d.documents.length === 0 && <li className="p-4 text-sm text-fg-muted">No documents uploaded.</li>}
          {d.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-fg">{titleCase(doc.docType)}{doc.side && doc.side !== 'single' ? ` (${doc.side})` : ''}</p><p className="text-[11px] text-fg-muted">{[doc.number, doc.expiryOn ? `Expires ${fmtDate(doc.expiryOn)}` : ''].filter(Boolean).join(' · ') || 'No number'}</p></div>
              <div className="flex gap-1.5">
                <button type="button" className={secondaryBtn} onClick={() => open(doc.id)}><ExternalLink className="h-3.5 w-3.5" aria-hidden />View</button>
                {canManage && <button type="button" aria-label="Remove document" className={secondaryBtn} onClick={() => removeDoc(doc.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {tab === 'pay' && <PayPanel labourer={d} onChanged={load} />}
      {tab === 'face' && <FacePanel d={d} />}
      {tab === 'attendance' && <RecentDays id={id} />}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      {pdf && <FormsPdfDialog labourerIds={[id]} name={d.code} onClose={() => setPdf(false)} />}
    </div>
  );
}

/** Has each site machine taken this labourer yet? An offline machine stays "waiting" until it reconnects. */
function MachineSync({ sync }: { sync: NonNullable<LabourerDetail['machineSync']> }) {
  if (!sync.machines.length) return null;
  if (sync.waitingForFace) return <p className="rounded-xl bg-bg-subtle p-3 text-xs text-fg-muted">Site machines get this labourer after the face is registered.</p>;
  const on = sync.machines.filter((m) => m.state === 'synced').length;
  const pill = (m: MachineSyncState) => (m.state === 'synced' ? <Pill tone="good">On machine</Pill>
    : m.state === 'failed' ? <Pill tone="bad">Failed to add</Pill>
      : <Pill tone="warn">{m.online ? 'Waiting to sync' : `Waiting — offline${m.lastSeenAt ? ` since ${fmtDateTime(m.lastSeenAt)}` : ''}`}</Pill>);
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-sm font-semibold text-fg">On {on} of {sync.machines.length} site machine{sync.machines.length === 1 ? '' : 's'}</p>
      <ul className="mt-2 divide-y divide-line">
        {sync.machines.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
            <span className="min-w-0 truncate"><span className="font-semibold text-fg">{m.name}</span><span className="text-fg-muted"> · {m.siteName || 'No site'}</span></span>
            {pill(m)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FacePanel({ d }: { d: LabourerDetail }) {
  const copy = {
    enrolled: 'Face is registered and ready for punching.',
    pending: 'The photos are saved and registration will finish automatically. It is retried every 10 minutes, so there is nothing to do.',
    failed: 'Face registration did not work. Edit the labourer and take the photos again.',
    none: 'No face has been registered yet. Edit the labourer to add the three photos.',
  }[d.faceStatus];
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-bg-subtle p-3 text-sm text-fg">{copy}</p>
      {d.needsReregistration && <p className="text-xs font-medium text-fg">The face model changed. New photos are needed to keep punching working.</p>}
      <dl className="grid grid-cols-2 gap-3">
        <Fact label="Attempts" value={d.face?.attempts ?? 0} />
        <Fact label="Registered on" value={fmtDateTime(d.face?.enrolledAt)} />
        {d.face?.lastError && <Fact wide label="Last problem" value={d.face.lastError} />}
      </dl>
    </div>
  );
}

function RecentDays({ id }: { id: number }) {
  const [rows, setRows] = useState<AttendanceDay[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.listDays({ labourerId: id, from: daysAgo(30), to: today(), pageSize: 31 }).then((r) => setRows(r.items || [])).catch((e) => setError(messageOf(e))); }, [id]);
  if (error) return <FormError message={error} />;
  if (!rows) return <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" />;
  if (!rows.length) return <p className="text-sm text-fg-muted">No attendance in the last 30 days.</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <span className="font-semibold text-fg">{fmtDate(r.workDate)}</span>
          <span className="text-xs text-fg-muted">{fmtTime(r.firstIn)} – {fmtTime(r.lastOut)} · {fmtMinutes(r.workedMinutes)}{r.payBasis === 'hajri' && r.hajri !== null && r.hajri !== undefined ? ` · ${hajriLabel(r.hajri)} H${r.hajriOverridden ? ' (set)' : ''}` : ''}</span>
          <Pill tone={r.status === 'incomplete' ? 'warn' : 'good'}>{titleCase(r.status)}</Pill>
        </li>
      ))}
    </ul>
  );
}
