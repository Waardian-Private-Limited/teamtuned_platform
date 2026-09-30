'use client';

import React from 'react';
import { OptionCard, SelectField, TextField } from '@/components/ui/FormControls';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../../api/employees.api';

export function CodeFormatPanel() {
  const { subOrgs } = useManageableSubOrgs();
  const { isOrgAdmin } = usePermission();
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [code, setCode] = React.useState<api.CodeSettingsDto | null>(null);
  const [inherited, setInherited] = React.useState(false);
  const [next, setNext] = React.useState('');
  const [error, setError] = React.useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isOrgAdmin && subOrgs.length && subOrgId === null) setSubOrgId(subOrgs[0].id);
  }, [isOrgAdmin, subOrgs, subOrgId]);

  React.useEffect(() => {
    api.getEmployeeSettings(subOrgId)
      .then((d) => { setCode(d.settings.code); setInherited(d.inherited); setNext(d.next_employee_code); })
      .catch((e) => setError({ message: messageOf(e) }));
  }, [subOrgId]);

  if (!code) return <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />;

  const preview = `${code.prefix}${code.prefix ? code.separator : ''}${'1'.padStart(code.digits, '0')}`;
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await api.updateEmployeeSettings(subOrgId, code);
      setCode(d.settings.code);
      setNext(d.next_employee_code);
      setInherited(false);
      showSuccess('Employee code format saved');
    } catch (e) {
      const field = e instanceof ApiError ? (e.data as { field?: string } | null)?.field : undefined;
      setError({ field, message: messageOf(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {subOrgs.length > 0 && (
        <select value={subOrgId ?? ''} onChange={(e) => setSubOrgId(e.target.value ? Number(e.target.value) : null)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg">
          {isOrgAdmin && <option value="">Organization default</option>}
          {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {inherited && subOrgId && <p className="text-xs text-fg-muted">Uses the organization default. Saving gives this sub-organization its own format.</p>}
      <div className="grid grid-cols-3 gap-3">
        <TextField label="Prefix" value={code.prefix} onChange={(v) => setCode({ ...code, prefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) })} error={err('code.prefix')} />
        <SelectField<string> label="Separator" value={code.separator} onChange={(v) => setCode({ ...code, separator: v ?? '' })} placeholder="None" options={[{ value: '-', label: 'Dash (-)' }, { value: '/', label: 'Slash (/)' }, { value: '_', label: 'Underscore (_)' }]} />
        <TextField label="Digits" type="number" min={1} max={10} value={String(code.digits)} onChange={(v) => setCode({ ...code, digits: Number(v) || 1 })} error={err('code.digits')} />
      </div>
      <p className="text-xs text-fg-muted">Format <b className="text-fg">{preview}</b> · next code <b className="text-fg">{next}</b></p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <OptionCard selected={code.editable} onClick={() => setCode({ ...code, editable: true })} title="HR can edit" description="Auto-filled, but HR can type another code" />
        <OptionCard selected={!code.editable} onClick={() => setCode({ ...code, editable: false })} title="Always automatic" description="Code is locked to the format" />
      </div>
      {error && !error.field && <p className="text-xs font-medium text-[var(--tt-danger)]">{error.message}</p>}
      <div className="flex justify-end">
        <button type="button" disabled={busy} onClick={save} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] disabled:opacity-40 sm:text-sm">Save format</button>
      </div>
    </div>
  );
}
