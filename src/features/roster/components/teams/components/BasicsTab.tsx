'use client';

import React from 'react';
import { TextField, SelectField, FieldLabel } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { cx } from '@/theme/tokens';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import { describeChain, parentChoices } from '../../../utils/teamTree';
import type { TeamTabProps } from './TeamTabProps';
import { TabFooter } from './TabFooter';

export function BasicsTab({ editor, units }: TeamTabProps) {
  const { detail, saving, errors } = editor;
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState(detail?.name ?? '');
  const [description, setDescription] = React.useState(detail?.description ?? '');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(detail?.sub_organization_id ?? null);
  const [parentId, setParentId] = React.useState<number | null>(detail?.parent_unit_id ?? null);
  const [status, setStatus] = React.useState<'active' | 'inactive'>(detail?.status ?? 'active');
  const err = errors.basics;

  const choices = React.useMemo(() => parentChoices(units, subOrgId, detail?.id ?? null), [units, subOrgId, detail?.id]);
  React.useEffect(() => {
    if (parentId !== null && !choices.some((c) => c.value === parentId)) setParentId(null);
  }, [choices, parentId]);

  const parent = units.find((u) => u.id === parentId) ?? null;

  const save = async () => {
    const body: Parameters<typeof editor.saveBasics>[0] = { name, description: description.trim() || null, status };
    if (!detail || (detail.sub_organization_id ?? null) !== subOrgId) body.sub_organization_id = subOrgId;
    if (!detail || (detail.parent_unit_id ?? null) !== parentId) body.parent_unit_id = parentId;
    await editor.saveBasics(body);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <TextField
          label="Team name"
          required
          value={name}
          onChange={setName}
          placeholder="e.g. Ward 3 Nursing, Pune Warehouse, Night Crew"
          error={err?.field === 'name' ? err.message : undefined}
          autoFocus
        />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this team covers (optional)" rows={2} />
        <SubOrgPicker value={subOrgId} onChange={setSubOrgId} allowShared={isOrgAdmin} />
        <SelectField
          label="Part of"
          numeric
          value={parentId}
          onChange={setParentId}
          options={choices}
          placeholder="Top level (not inside another team)"
          hint="Nest this team inside another one, for example a ward inside a hospital. Only teams in the same sub-organization are listed."
        />
        <div>
          <FieldLabel label="Status" />
          <div className="grid grid-cols-2 gap-2.5">
            {(['active', 'inactive'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setStatus(o)}
                className={cx(
                  'rounded-lg border p-2.5 text-left transition-all',
                  status === o ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]' : 'border-line bg-surface hover:bg-bg-subtle'
                )}
              >
                <div className="text-xs font-semibold text-fg">{o === 'active' ? 'Active' : 'Inactive'}</div>
                <div className="text-[11px] text-fg-muted">{o === 'active' ? 'Can be rostered' : 'Kept for history, not rostered'}</div>
              </button>
            ))}
          </div>
        </div>
        <TabFooter
          label={detail ? 'Save changes' : 'Create team'}
          saving={saving === 'basics'}
          disabled={!name.trim()}
          error={err && err.field !== 'name' ? err.message : undefined}
          onSave={save}
        />
      </div>

      <aside className="h-fit rounded-xl border border-line bg-bg-subtle/60 p-4 text-xs leading-relaxed text-fg-muted">
        <h4 className="text-sm font-bold text-fg">{parent ? `Inherited from ${parent.name}` : 'How teams work'}</h4>
        {parent ? (
          <div className="mt-2 space-y-2">
            <p>This team starts with its parent&apos;s settings. You can override them in the Rules and Approvals tabs.</p>
            <p><span className="font-semibold text-fg">Approvals:</span> {describeChain(parent.effective_approval_chain)}</p>
            <p><span className="font-semibold text-fg">Managers and demand</span> set on the parent also apply here.</p>
            <p>People in this team also show up in {parent.name}.</p>
          </div>
        ) : (
          <ul className="mt-2 list-disc space-y-1.5 pl-4">
            <li>A team is any group you roster together: a site, ward, department or crew.</li>
            <li>Teams can nest. Sub-teams inherit settings, approvals and managers, and their people roll up into the parent.</li>
            <li>A team belongs to one sub-organization at most. Its sub-teams share that sub-organization.</li>
            {!detail && <li>After you save, the Members, Managers, Demand, Approvals and Rules tabs unlock.</li>}
          </ul>
        )}
      </aside>
    </div>
  );
}
