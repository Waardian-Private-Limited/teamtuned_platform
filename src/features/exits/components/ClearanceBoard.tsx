'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { inr } from '@/features/compensation/utils/format';
import { formatDate } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { CLEARANCE_STATUS_META, OWNER_TYPE_LABEL } from '../constants/exits.constants';
import type { ClearanceItem, ClearanceOwnerType } from '../types/exits';
import { Skeleton, TonePill } from './parts';

const ownerOf = (i: ClearanceItem) => i.owner_label || (i.owner_ref ? i.owner_ref : OWNER_TYPE_LABEL[i.owner_type]);

function ItemDialog({ caseId, item, onClose, onDone }: { caseId: number; item: ClearanceItem | null; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = React.useState<'cleared' | 'waived' | null>('cleared');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (item) { setStatus('cleared'); setAmount(item.recovery_amount ? String(item.recovery_amount) : ''); setNote(item.note || ''); setErr(null); } }, [item]);
  if (!item) return null;
  const save = async () => {
    if (!status) return;
    if (amount !== '' && !(Number(amount) >= 0)) { setErr('Enter a valid recovery amount'); return; }
    setBusy(true);
    try {
      await api.updateClearanceItem(caseId, item.id, { status, recovery_amount: amount === '' ? undefined : Number(amount), note: note.trim() || undefined });
      showSuccess('Clearance updated'); onDone();
    } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">{item.title}</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Save</Btn></>}>
      <div className="space-y-4">
        {err && <Alert message={err} />}
        <SelectField<'cleared' | 'waived'> label="Outcome" required value={status} onChange={setStatus} options={[{ value: 'cleared', label: 'Cleared' }, { value: 'waived', label: 'Waived' }]} />
        <TextField label="Recovery amount" inputMode="decimal" prefix="₹" value={amount} onChange={(v) => setAmount(v.replace(/[^\d.]/g, ''))} hint="Leave empty when nothing is owed. It is deducted in the settlement." />
        <Textarea label="Note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Dialog>
  );
}

function AddDialog({ open, caseId, onClose, onDone }: { open: boolean; caseId: number; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = React.useState('');
  const [ownerType, setOwnerType] = React.useState<ClearanceOwnerType | null>('manager');
  const [ownerRef, setOwnerRef] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setTitle(''); setOwnerType('manager'); setOwnerRef(''); setErr(null); } }, [open]);
  const needsRef = ownerType === 'role' || ownerType === 'permission';
  const save = async () => {
    if (!title.trim() || !ownerType) { setErr('Add a title and choose who owns it'); return; }
    if (needsRef && !ownerRef.trim()) { setErr('Name the role or permission code'); return; }
    setBusy(true);
    try { await api.addClearanceItem(caseId, { title: title.trim(), owner_type: ownerType, owner_ref: needsRef ? ownerRef.trim() : undefined }); showSuccess('Item added'); onDone(); } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">Add a clearance item</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Add</Btn></>}>
      <div className="space-y-4">
        {err && <Alert message={err} />}
        <TextField label="Item" required value={title} onChange={setTitle} placeholder="e.g., Return laptop" maxLength={150} />
        <SelectField<ClearanceOwnerType> label="Owner" required value={ownerType} onChange={setOwnerType} options={(Object.keys(OWNER_TYPE_LABEL) as ClearanceOwnerType[]).map((k) => ({ value: k, label: OWNER_TYPE_LABEL[k] }))} />
        {needsRef && <TextField label={ownerType === 'role' ? 'Role' : 'Permission code'} required value={ownerRef} onChange={setOwnerRef} />}
      </div>
    </Dialog>
  );
}

/** The clearance checklist of a case, grouped by owner. The owner or HR marks an item cleared or waived, with any recovery amount. */
export function ClearanceBoard({ caseId, items, canManage, loading, error, onChanged }: {
  caseId: number; items: ClearanceItem[] | null; canManage: boolean; loading?: boolean; error?: string | null; onChanged: () => void;
}) {
  const [edit, setEdit] = React.useState<ClearanceItem | null>(null);
  const [add, setAdd] = React.useState(false);
  const groups = React.useMemo(() => {
    const m = new Map<string, ClearanceItem[]>();
    for (const i of items ?? []) { const k = ownerOf(i); m.set(k, [...(m.get(k) ?? []), i]); }
    return [...m.entries()];
  }, [items]);
  const pending = (items ?? []).filter((i) => i.status === 'pending').length;
  const owed = (items ?? []).reduce((s, i) => s + (i.status === 'cleared' ? Number(i.recovery_amount || 0) : 0), 0);

  if (error) return <Alert message={error} />;
  if (loading && !items) return <Skeleton className="h-24" />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">{items?.length ? `${pending} pending of ${items.length}${owed > 0 ? `, ${inr(owed)} to recover` : ''}` : 'No clearance items yet.'}</p>
        {canManage && <Btn icon={<Plus className="h-4 w-4" />} onClick={() => setAdd(true)}>Add item</Btn>}
      </div>
      {groups.map(([owner, list]) => (
        <div key={owner}>
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-fg-muted">{owner}</h3>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {list.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-fg">{i.title}{i.auto && <span className="ml-2 text-[11px] font-medium text-fg-muted">automatic</span>}</p>
                  <p className="text-xs text-fg-muted">
                    {[i.recovery_amount ? `Recovery ${inr(i.recovery_amount)}` : null, i.cleared_by && i.cleared_at ? `${CLEARANCE_STATUS_META[i.status].label} by ${i.cleared_by} on ${formatDate(i.cleared_at.slice(0, 10))}` : null, i.note].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <TonePill label={CLEARANCE_STATUS_META[i.status].label} tone={CLEARANCE_STATUS_META[i.status].tone} />
                {i.status === 'pending' && (canManage || i.can_act) && <Btn onClick={() => setEdit(i)}>Update</Btn>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <ItemDialog caseId={caseId} item={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); onChanged(); }} />
      <AddDialog open={add} caseId={caseId} onClose={() => setAdd(false)} onDone={() => { setAdd(false); onChanged(); }} />
    </div>
  );
}
