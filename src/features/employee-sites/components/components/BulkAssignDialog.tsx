'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as employeeSitesApi from '../../api/employeeSites.api';

interface BulkAssignDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  departments: FilterOption[];
  sites: FilterOption[];
}

const MODE_OPTIONS = [
  { value: 'add', label: 'Add to current sites' },
  { value: 'replace', label: 'Replace current sites' },
] as const;

// Pick-many control: the dropdown adds an option, chips show and remove them.
function MultiPick({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const remaining = options.filter((o) => !selected.includes(o.value));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-fg-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-subtle px-2 py-1 text-xs font-medium text-fg">
            {options.find((o) => o.value === id)?.label ?? `#${id}`}
            <button type="button" aria-label="Remove" onClick={() => onChange(selected.filter((x) => x !== id))}>
              <X className="h-3 w-3 text-fg-subtle" />
            </button>
          </span>
        ))}
        {remaining.length > 0 && (
          <SearchableFilterDropdown
            label={label}
            allLabel="Add…"
            value={null}
            options={remaining}
            onChange={(id) => id && onChange([...selected, id])}
            searchPlaceholder={`Search ${label.toLowerCase()}…`}
          />
        )}
      </div>
    </div>
  );
}

export function BulkAssignDialog({ open, onClose, onDone, departments, sites }: BulkAssignDialogProps) {
  const [roles, setRoles] = React.useState<FilterOption[]>([]);
  const [departmentIds, setDepartmentIds] = React.useState<number[]>([]);
  const [roleIds, setRoleIds] = React.useState<number[]>([]);
  const [currentSiteIds, setCurrentSiteIds] = React.useState<number[]>([]);
  const [unassignedOnly, setUnassignedOnly] = React.useState(false);
  const [siteIds, setSiteIds] = React.useState<number[]>([]);
  const [primaryId, setPrimaryId] = React.useState<number | null>(null);
  const [mode, setMode] = React.useState<'add' | 'replace'>('add');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [failures, setFailures] = React.useState<Array<{ name: string; message: string }>>([]);

  React.useEffect(() => {
    if (!open || roles.length) return;
    employeeSitesApi.listRoleOptions()
      .then((dto) => setRoles((dto.roles || []).map((r) => ({ value: r.id, label: r.name }))))
      .catch(() => {});
  }, [open, roles.length]);

  const reset = () => {
    setDepartmentIds([]); setRoleIds([]); setCurrentSiteIds([]); setUnassignedOnly(false);
    setSiteIds([]); setPrimaryId(null); setMode('add'); setError(''); setFailures([]);
  };

  const hasTarget = departmentIds.length > 0 || roleIds.length > 0 || currentSiteIds.length > 0 || unassignedOnly;
  const needsPrimary = mode === 'replace' && siteIds.length > 1 && !primaryId;
  const canSubmit = hasTarget && siteIds.length > 0 && !needsPrimary;

  const submit = async () => {
    setSaving(true);
    setError('');
    setFailures([]);
    try {
      const result = await employeeSitesApi.bulkAssignSites({
        site_ids: siteIds,
        primary_site_id: primaryId && siteIds.includes(primaryId) ? primaryId : null,
        mode,
        department_ids: departmentIds,
        role_ids: roleIds,
        current_site_ids: currentSiteIds,
        unassigned_only: unassignedOnly,
      });
      onDone();
      if (result.failed.length === 0) {
        showSuccess(`Sites assigned to ${result.updated} employee${result.updated === 1 ? '' : 's'}`);
        reset();
        onClose();
      } else {
        showSuccess(`${result.updated} of ${result.matched} updated`);
        setFailures(result.failed);
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  };

  const close = () => { if (!saving) { reset(); onClose(); } };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Bulk assign sites"
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>Close</Button>
          <Button onClick={submit} loading={saving} loadingLabel="Assigning…" disabled={!canSubmit}>Assign</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <Alert message={error} tone="error" />}
        {failures.length > 0 && (
          <Alert
            tone="error"
            message={`Could not update: ${failures.slice(0, 5).map((f) => `${f.name} (${f.message})`).join('; ')}${failures.length > 5 ? ` and ${failures.length - 5} more` : ''}`}
          />
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-fg">Who (Active employees only)</h3>
          <p className="text-xs text-fg-muted">Pick one or more filters. An employee must match every filter you choose.</p>
          <MultiPick label="Departments" options={departments} selected={departmentIds} onChange={setDepartmentIds} />
          <MultiPick label="Roles" options={roles} selected={roleIds} onChange={setRoleIds} />
          <MultiPick label="Currently at site" options={sites} selected={currentSiteIds} onChange={setCurrentSiteIds} />
          <label className="flex items-center gap-2 text-xs font-medium text-fg">
            <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
            Only employees with no site yet
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-fg">Sites to assign</h3>
          <MultiPick
            label="Sites"
            options={sites}
            selected={siteIds}
            onChange={(ids) => { setSiteIds(ids); if (primaryId && !ids.includes(primaryId)) setPrimaryId(null); }}
          />
          {siteIds.length > 0 && (
            <SearchableFilterDropdown
              label="Primary site"
              allLabel={mode === 'add' ? 'Keep current primary' : 'Choose primary site'}
              value={primaryId}
              options={sites.filter((s) => siteIds.includes(s.value))}
              onChange={setPrimaryId}
            />
          )}
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
          <p className="text-xs text-fg-muted">
            {mode === 'add'
              ? 'Employees keep their current sites. Those with no primary site get the first chosen one.'
              : 'Each employee ends up with only the sites chosen here.'}
          </p>
        </section>
      </div>
    </Dialog>
  );
}
