'use client';

import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { TeamsCatalog } from '../../../hooks/useTeamsCatalog';
import type { DemandDraft } from '../../../utils/teamDemand';
import { btnPrimary, btnSecondary, iconBtn, miniInput } from '../../catalog-shared/catalogUi';
import { WeekdayChips } from './WeekdayChips';

interface Props {
  row: DemandDraft;
  catalog: TeamsCatalog;
  error?: string;
  onChange: (patch: Partial<DemandDraft>) => void;
  onRemove: () => void;
  onCopy: (mask: number) => void;
}

function Labeled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('block min-w-0', className)}>
      <span className="mb-1 block text-[11px] font-semibold text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function Opt({ items, empty }: { items: { value: number; label: string }[]; empty: string }) {
  return (
    <>
      <option value="">{empty}</option>
      {items.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </>
  );
}

export function DemandRowEditor({ row, catalog, error, onChange, onRemove, onCopy }: Props) {
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [copyMask, setCopyMask] = React.useState(0);
  const num = (v: string) => (v === '' ? null : Number(v));
  const skillOpts = catalog.skills.map((s) => ({ value: s.id, label: s.name }));

  return (
    <li className={cx('rounded-lg border bg-surface p-3', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
        {row.kind === 'shift' ? (
          <Labeled label="Shift" className="col-span-2 md:col-span-2">
            <select value={row.shiftTemplateId ?? ''} onChange={(e) => onChange({ shiftTemplateId: num(e.target.value) })} className={miniInput}>
              <Opt items={catalog.shifts} empty="Choose a shift…" />
            </select>
          </Labeled>
        ) : (
          <>
            <Labeled label="From"><input type="time" value={row.startTime} onChange={(e) => onChange({ startTime: e.target.value })} className={miniInput} /></Labeled>
            <Labeled label="To"><input type="time" value={row.endTime} onChange={(e) => onChange({ endTime: e.target.value })} className={miniInput} /></Labeled>
          </>
        )}
        <Labeled label="Role (optional)">
          <select value={row.roleId ?? ''} onChange={(e) => onChange({ roleId: num(e.target.value) })} className={miniInput}><Opt items={catalog.roles} empty="Any role" /></select>
        </Labeled>
        <Labeled label="Skill (optional)">
          <select value={row.skillId ?? ''} onChange={(e) => onChange({ skillId: num(e.target.value) })} className={miniInput}><Opt items={skillOpts} empty="Any skill" /></select>
        </Labeled>
        {row.kind === 'shift' ? (
          <div className="col-span-2 grid grid-cols-3 gap-2.5 md:col-span-6 md:grid-cols-[repeat(3,minmax(0,8rem))]">
            <Labeled label="At least"><input type="number" min={0} value={row.min} onChange={(e) => onChange({ min: Math.max(0, Number(e.target.value)) })} className={miniInput} /></Labeled>
            <Labeled label="At most"><input type="number" min={0} value={row.max} placeholder="No limit" onChange={(e) => onChange({ max: e.target.value })} className={miniInput} /></Labeled>
            <Labeled label="Priority (1-9)"><input type="number" min={1} max={9} value={row.priority} onChange={(e) => onChange({ priority: Math.min(9, Math.max(1, Number(e.target.value) || 5)) })} className={miniInput} /></Labeled>
          </div>
        ) : (
          <Labeled label="People present (at least)"><input type="number" min={0} value={row.min} onChange={(e) => onChange({ min: Math.max(0, Number(e.target.value)) })} className={miniInput} /></Labeled>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <WeekdayChips mask={row.mask} disabled={Boolean(row.specificDate)} onChange={(mask) => onChange({ mask })} />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <input type="checkbox" checked={Boolean(row.specificDate)} onChange={(e) => onChange({ specificDate: e.target.checked ? new Date().toISOString().slice(0, 10) : '' })} />
              Only on one date
            </label>
            {row.specificDate && <input type="date" value={row.specificDate} onChange={(e) => onChange({ specificDate: e.target.value })} className={cx(miniInput, 'h-8 w-40')} />}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!row.specificDate && (
            <button type="button" onClick={() => { setCopyMask(0); setCopyOpen((o) => !o); }} className={iconBtn} aria-label="Copy to other days" title="Copy to other days"><Copy className="h-4 w-4" /></button>
          )}
          <button type="button" onClick={onRemove} className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')} aria-label="Remove row"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {copyOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-bg-subtle/60 p-2.5">
          <span className="text-xs font-semibold text-fg">Copy this row to:</span>
          <WeekdayChips mask={copyMask} onChange={setCopyMask} />
          <button type="button" disabled={copyMask === 0} onClick={() => { onCopy(copyMask); setCopyOpen(false); }} className={btnPrimary}>Copy</button>
          <button type="button" onClick={() => setCopyOpen(false)} className={btnSecondary}>Cancel</button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </li>
  );
}
