'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField, FieldLabel } from '@/components/ui/FormControls';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import type { Pattern, PatternPreset } from '../../../types/roster.types';
import type { ShiftOpt } from '../../../hooks/useTeamsCatalog';
import type { PatternSaveInput } from '../../../hooks/usePatternsList';
import type { CycleCell } from '../../../utils/patternCycle';
import { btnPrimary, btnSecondary } from '../../catalog-shared/catalogUi';
import { Spinner } from '../../catalog-shared/Spinner';
import { CycleBuilder } from './CycleBuilder';
import { PresetGallery } from './PresetGallery';
import { RotationBuilder } from './RotationBuilder';

interface Props {
  open: boolean;
  pattern: Pattern | null;
  presets: PatternPreset[];
  shifts: ShiftOpt[];
  saving: boolean;
  error: { field?: string; message: string } | null;
  onClose: () => void;
  onSave: (input: PatternSaveInput) => void;
}

export function PatternDialog({ open, pattern, presets, shifts, saving, error, onClose, onSave }: Props) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [cycle, setCycle] = React.useState<CycleCell[]>(['OFF']);
  const [status, setStatus] = React.useState<'active' | 'inactive'>('active');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(pattern?.name ?? '');
    setCycle(pattern?.cycle ?? [shifts[0]?.value ?? 'OFF', shifts[0]?.value ?? 'OFF', 'OFF']);
    setStatus(pattern?.status ?? 'active');
    setSubOrgId(pattern?.sub_organization_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pattern]);

  const hasShift = cycle.some((c) => c !== 'OFF');
  const cycleError = error?.field === 'cycle' ? error.message : undefined;
  const submit = () => onSave({ name: name.trim(), cycle, status, sub_organization_id: subOrgId });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">{pattern ? 'Edit rotation pattern' : 'New rotation pattern'}</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">A repeating sequence of shifts and days off that people follow.</p>
        </div>
      }
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="button" disabled={saving || !name.trim() || !hasShift} onClick={submit} className={btnPrimary}>
            {saving ? <Spinner /> : <Check className="h-3.5 w-3.5" />}
            <span>{pattern ? 'Save changes' : 'Create pattern'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Pattern name" required value={name} onChange={setName} placeholder="e.g. 4 on 4 off, Night crew A" error={error?.field === 'name' ? error.message : undefined} />
        <RotationBuilder shifts={shifts} onBuilt={(n, c) => { if (!name.trim()) setName(n); setCycle(c); }} />
        <PresetGallery presets={presets} shifts={shifts} onBuilt={(n, c) => { if (!name.trim()) setName(n); setCycle(c); }} />
        <div>
          <FieldLabel label="Cycle" required />
          <CycleBuilder cycle={cycle} shifts={shifts} error={cycleError} onChange={setCycle} />
        </div>
        {!pattern && <SubOrgPicker value={subOrgId} onChange={setSubOrgId} allowShared={isOrgAdmin} />}
        {pattern && (
          <div>
            <FieldLabel label="Status" />
            <div className="flex gap-2">
              {(['active', 'inactive'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s}
                  className={`h-8 rounded-lg border px-3 text-xs font-semibold ${status === s ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-surface text-fg hover:bg-bg-subtle'}`}>
                  {s === 'active' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && !error.field && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error.message}</p>}
      </div>
    </Dialog>
  );
}
