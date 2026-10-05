'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/approvals.api';
import type { Delegation, EmployeeRef } from '../types/approvals';
import { EmployeeSearch } from './EmployeeSearch';

const today = () => new Date().toISOString().slice(0, 10);

export function DelegationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = React.useState<Delegation[]>([]);
  const [delegate, setDelegate] = React.useState<EmployeeRef[]>([]);
  const [from, setFrom] = React.useState(today());
  const [to, setTo] = React.useState(today());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => api.myDelegations().then(setItems).catch((e) => showError(messageOf(e))), []);
  React.useEffect(() => { if (open) load(); }, [open, load]);

  const add = async () => {
    setErrors({});
    if (!delegate[0]) { setErrors({ delegate: 'Choose who covers for you' }); return; }
    setBusy(true);
    try {
      await api.setMyDelegation({ delegateEmployeeId: delegate[0].id, startsOn: from, endsOn: to });
      showSuccess('Out-of-office cover set');
      setDelegate([]);
      load();
    } catch (err) {
      const fields = (err as { data?: { fields?: { path: string; message: string }[] } })?.data?.fields;
      if (fields?.length) setErrors(Object.fromEntries(fields.map((f) => [f.path === 'delegateEmployeeId' ? 'delegate' : f.path, f.message])));
      else showError(messageOf(err));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Out of office" maxWidthClassName="max-w-xl">
      <p className="mb-4 text-sm text-fg-muted">While you are away, approvals that would reach you go to your cover. If you are on approved leave and have no cover, they go to your manager.</p>
      <div className="space-y-3">
        <EmployeeSearch label="Cover" value={delegate} onChange={(v) => setDelegate(v.slice(-1))} error={errors.delegate} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="From" type="date" value={from} onChange={(v) => setFrom(v)} />
          <TextField label="To" type="date" value={to} min={from} onChange={(v) => setTo(v)} error={errors.endsOn} />
        </div>
        <Btn variant="primary" busy={busy} onClick={add}>Set cover</Btn>
      </div>
      {items.length > 0 && (
        <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
          {items.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-fg">{d.delegateName}<span className="ml-2 text-xs text-fg-muted">{d.startsOn.slice(0, 10)} to {d.endsOn.slice(0, 10)}</span></span>
              <button type="button" aria-label="Remove cover" onClick={() => api.clearDelegation(d.id).then(load).catch((e) => showError(messageOf(e)))} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
