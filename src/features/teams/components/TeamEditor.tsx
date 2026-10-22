'use client';

import React from 'react';
import { fieldErrorsOf, messageOf } from '@/lib/api/errors';
import { useAuth } from '@/providers/auth-provider';
import { usePermission } from '@/lib/hooks/usePermission';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { PersonPicker } from '@/features/task-management/components/PersonPicker';
import type { PersonOption } from '@/features/task-management/types/tm.types';
import { Btn } from '@/features/performance/components/ui';
import * as api from '../api/teams.api';
import type { TeamForm } from '../api/teams.api';

type Errors = Partial<Record<'name' | 'description' | 'lead_ids' | 'member_ids' | 'sub_organization_id', string>>;

const toOption = (m: TeamForm['members'][number]): PersonOption => ({ id: m.employee_id, name: m.name, employee_code: m.employee_code });

/**
 * New or edit team. HR (`canManage`) picks the company; a manager's team is always in their own company and they
 * stay one of its leads (the server adds them).
 */
export function TeamEditor({ id, canManage, onClose, onSaved }: { id: number | null; canManage: boolean; onClose: () => void; onSaved: (t: TeamForm) => void }) {
  const { user } = useAuth();
  const { isOrgAdmin } = usePermission();
  const [loaded, setLoaded] = React.useState(id === null);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [subOrg, setSubOrg] = React.useState<number | null>(null);
  const [leads, setLeads] = React.useState<PersonOption[]>([]);
  const [members, setMembers] = React.useState<PersonOption[]>([]);
  const [errors, setErrors] = React.useState<Errors>({});
  const [general, setGeneral] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (id === null) return;
    api.get(id).then((t) => {
      setName(t.name); setDescription(t.description || ''); setSubOrg(t.sub_organization_id);
      setLeads(t.members.filter((m) => m.is_lead).map(toOption));
      setMembers(t.members.filter((m) => !m.is_lead).map(toOption));
      setLoaded(true);
    }).catch((e) => setGeneral(messageOf(e)));
  }, [id]);

  const search = React.useCallback((q: string) => api.people(q, canManage ? subOrg : null), [canManage, subOrg]);
  const leadIds = new Set(leads.map((l) => l.id));

  const save = async () => {
    setBusy(true); setErrors({}); setGeneral('');
    const body = {
      name, description, lead_ids: leads.map((l) => l.id), member_ids: members.filter((m) => !leadIds.has(m.id)).map((m) => m.id),
      ...(canManage ? { sub_organization_id: subOrg } : {}),
    };
    try {
      onSaved(id === null ? await api.create(body) : await api.update(id, body));
    } catch (e) {
      const r = fieldErrorsOf(e); setErrors(r.fields as Errors); setGeneral(r.general);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={id === null ? 'New team' : 'Edit team'} maxWidthClassName="max-w-xl"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!loaded} onClick={save}>{id === null ? 'Create team' : 'Save'}</Btn></>}>
      {!loaded ? (general ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{general}</p> : <div className="h-64 animate-pulse rounded-lg bg-bg-subtle" />) : (
        <div className="space-y-4">
          <TextField label="Name" required value={name} onChange={(v) => { setName(v); setErrors({ ...errors, name: undefined }); }} placeholder="e.g. Customer support" maxLength={120} error={errors.name} />
          <Textarea label="About this team" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} hint="Optional. What the team works on." />
          {canManage && (
            <div>
              <SubOrgPicker value={subOrg} onChange={(v) => { setSubOrg(v); setErrors({ ...errors, sub_organization_id: undefined }); }} allowShared={isOrgAdmin} />
              {errors.sub_organization_id && <p className="mt-1 text-xs text-[var(--tt-danger)]">{errors.sub_organization_id}</p>}
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg">Leads <span className="text-[var(--tt-danger)]">*</span></p>
            <PersonPicker multiple value={leads} onChange={(v) => { setLeads(v); setMembers(members.filter((m) => !v.some((l) => l.id === m.id))); setErrors({ ...errors, lead_ids: undefined }); }} search={search} invalid={!!errors.lead_ids} placeholder="Search a lead by name or code" />
            <p className={errors.lead_ids ? 'mt-1 text-xs text-[var(--tt-danger)]' : 'mt-1 text-[11px] text-fg-muted'}>
              {errors.lead_ids || (canManage ? 'Leads see times and leave types, and can edit the team if they may build teams.' : `You${user?.first_name ? ` (${user.first_name})` : ''} stay a lead of teams you build.`)}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg">Members <span className="font-normal text-fg-muted">· {members.length}</span></p>
            <PersonPicker multiple value={members} onChange={(v) => { setMembers(v.filter((m) => !leadIds.has(m.id))); setErrors({ ...errors, member_ids: undefined }); }} search={search} invalid={!!errors.member_ids} placeholder="Search people to add" />
            {errors.member_ids && <p className="mt-1 text-xs text-[var(--tt-danger)]">{errors.member_ids}</p>}
          </div>
          {general && <p role="alert" className="text-sm text-[var(--tt-danger)]">{general}</p>}
        </div>
      )}
    </Dialog>
  );
}
