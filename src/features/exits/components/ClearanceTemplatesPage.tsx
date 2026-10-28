'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { OWNER_TYPE_LABEL } from '../constants/exits.constants';
import { useExitsBasePath } from '../hooks/useExitsBasePath';
import { useLoad } from '../hooks/useLoad';
import type { ClearanceOwnerType, ClearanceTemplate } from '../types/exits';
import { Card, Skeleton, TonePill } from './parts';

function TemplateDialog({ tpl, open, onClose, onDone }: { tpl: ClearanceTemplate | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = React.useState('');
  const [ownerType, setOwnerType] = React.useState<ClearanceOwnerType | null>('role');
  const [ownerRef, setOwnerRef] = React.useState('');
  const [order, setOrder] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (open) { setName(tpl?.name || ''); setOwnerType(tpl?.owner_type || 'role'); setOwnerRef(tpl?.owner_ref || ''); setOrder(tpl ? String(tpl.order) : ''); setErr(null); }
  }, [open, tpl]);
  const needsRef = ownerType === 'role' || ownerType === 'permission';
  const save = async () => {
    if (!name.trim() || !ownerType) { setErr('Add a name and choose the owner'); return; }
    if (needsRef && !ownerRef.trim()) { setErr('Name the role or permission code'); return; }
    setBusy(true);
    try {
      await api.saveClearanceTemplate(tpl?.id ?? null, { name: name.trim(), owner_type: ownerType, owner_ref: needsRef ? ownerRef.trim() : null, order: order === '' ? undefined : Number(order) });
      showSuccess('Saved'); onDone();
    } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">{tpl ? 'Edit clearance item' : 'New clearance item'}</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Save</Btn></>}>
      <div className="space-y-4">
        {err && <Alert message={err} />}
        <TextField label="Name" required value={name} onChange={setName} maxLength={150} placeholder="e.g., IT: return laptop and revoke accounts" />
        <SelectField<ClearanceOwnerType> label="Owner" required value={ownerType} onChange={setOwnerType} options={(Object.keys(OWNER_TYPE_LABEL) as ClearanceOwnerType[]).map((k) => ({ value: k, label: OWNER_TYPE_LABEL[k] }))} />
        {needsRef && <TextField label={ownerType === 'role' ? 'Role' : 'Permission code'} required value={ownerRef} onChange={setOwnerRef} />}
        <TextField label="Order" inputMode="numeric" value={order} onChange={(v) => setOrder(v.replace(/\D/g, ''))} hint="Lower numbers come first" />
      </div>
    </Dialog>
  );
}

/** Admin list of the clearance items every exit gets. Templates are disabled, not deleted. */
export function ClearanceTemplatesPage() {
  const base = useExitsBasePath();
  const q = useLoad(() => api.clearanceTemplates(), []);
  const [edit, setEdit] = React.useState<ClearanceTemplate | null>(null);
  const [open, setOpen] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const toggle = async (t: ClearanceTemplate) => {
    setBusyId(t.id);
    try { await api.saveClearanceTemplate(t.id, { active: !t.active }); q.reload(); } catch (e) { setErr(messageOf(e)); } finally { setBusyId(null); }
  };
  const rows = [...(q.data ?? [])].sort((a, b) => a.order - b.order);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-8">
      <Link href={base} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> All exits</Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Clearance checklist</h1>
          <p className="text-sm text-fg-muted">These items are added to every exit when it reaches clearance.</p>
        </div>
        <Btn variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setEdit(null); setOpen(true); }}>New item</Btn>
      </header>
      {(q.error || err) && <Alert message={q.error || err || ''} />}
      <Card>
        {q.loading && !q.data ? <Skeleton className="h-32" /> : rows.length === 0 ? <EmptyState compact title="No clearance items" description="Add the items each leaver must clear, like IT, admin and finance." /> : (
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-fg">{t.name}</p>
                  <p className="text-xs text-fg-muted">{OWNER_TYPE_LABEL[t.owner_type]}{t.owner_ref ? `: ${t.owner_ref}` : ''}</p>
                </div>
                <TonePill label={t.active ? 'Active' : 'Disabled'} tone={t.active ? 'success' : 'neutral'} />
                <Btn onClick={() => { setEdit(t); setOpen(true); }}>Edit</Btn>
                <Btn busy={busyId === t.id} onClick={() => toggle(t)}>{t.active ? 'Disable' : 'Enable'}</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <TemplateDialog open={open} tpl={edit} onClose={() => setOpen(false)} onDone={() => { setOpen(false); q.reload(); }} />
    </div>
  );
}
