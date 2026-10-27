'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import type { FormBlock } from '../../../types/labour.types';
import { secondaryBtn } from '../../shared/Primitives';
import { PlaceholderField } from './PlaceholderField';

interface P { block: FormBlock; set: (patch: Partial<FormBlock>) => void; err: (path: string) => string | undefined }

type Row = Record<string, unknown>;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-fg sm:text-sm">{label}<Switch label={label} checked={checked} onChange={onChange} /></label>;
}
const AddBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => <button type="button" onClick={onClick} className={secondaryBtn}><Plus className="h-3.5 w-3.5" aria-hidden />{children}</button>;
const DelBtn = ({ onClick, label }: { onClick: () => void; label: string }) => <button type="button" onClick={onClick} aria-label={label} className="mt-6 shrink-0 rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Trash2 className="h-4 w-4" /></button>;
const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

export function BlockEditor(p: P) {
  const { block: b, set, err } = p;
  switch (b.type) {
    case 'header': {
      const meta = arr<Row>(b.meta);
      const upd = (i: number, patch: Row) => set({ meta: meta.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
      return (
        <div className="space-y-3">
          <PlaceholderField label="Title" required value={str(b.title)} error={err('title')} onChange={(title) => set({ title })} />
          <PlaceholderField label="Subtitle" value={str(b.subtitle)} error={err('subtitle')} onChange={(subtitle) => set({ subtitle })} />
          <SelectField label="Logo" value={str(b.logo) || 'company'} options={[{ value: 'company', label: 'Company logo' }, { value: 'contractor', label: 'Contractor logo' }, { value: 'none', label: 'No logo' }]} onChange={(logo) => set({ logo: logo || 'company' })} />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-fg">Details beside the title</p>
            {meta.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <PlaceholderField plain label="Label" value={str(m.label)} error={err(`meta.${i}.label`)} onChange={(label) => upd(i, { label })} />
                  <PlaceholderField label="Value" value={str(m.value)} error={err(`meta.${i}.value`)} onChange={(value) => upd(i, { value })} />
                </div>
                <DelBtn label="Remove detail" onClick={() => set({ meta: meta.filter((_, j) => j !== i) })} />
              </div>
            ))}
            {meta.length < 6 && <AddBtn onClick={() => set({ meta: [...meta, { label: '', value: '' }] })}>Add detail</AddBtn>}
          </div>
        </div>
      );
    }
    case 'photo':
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Side" value={str(b.align) || 'right'} options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} onChange={(align) => set({ align: align || 'right' })} />
          <TextField label="Width (50–120)" inputMode="numeric" value={str(b.width)} error={err('width')} onChange={(v) => set({ width: num(v) })} />
          <TextField label="Height (60–150)" inputMode="numeric" value={str(b.height)} error={err('height')} onChange={(v) => set({ height: num(v) })} />
        </div>
      );
    case 'heading':
      return (
        <div className="space-y-3">
          <PlaceholderField label="Heading" required value={str(b.text)} error={err('text')} onChange={(text) => set({ text })} />
          <SegmentedControl options={[{ value: 'center', label: 'Centered' }, { value: 'left', label: 'Left' }]} value={(str(b.align) || 'center') as 'center' | 'left'} onChange={(align) => set({ align })} />
        </div>
      );
    case 'fields': {
      const rows = arr<Row>(b.rows);
      const upd = (i: number, patch: Row) => set({ rows: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
      return (
        <div className="space-y-3">
          <SegmentedControl options={[{ value: '1', label: '1 column' }, { value: '2', label: '2 columns' }]} value={b.columns === 2 ? '2' : '1'} onChange={(v) => set({ columns: Number(v) })} />
          {err('rows') && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{err('rows')}</p>}
          {rows.map((r, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <PlaceholderField plain label="Label" required value={str(r.label)} error={err(`rows.${i}.label`)} onChange={(label) => upd(i, { label })} />
                  <PlaceholderField label="Value" value={str(r.value)} error={err(`rows.${i}.value`)} onChange={(value) => upd(i, { value })} hint="Empty leaves a blank line to write on." />
                </div>
                <DelBtn label="Remove row" onClick={() => set({ rows: rows.filter((_, j) => j !== i) })} />
              </div>
              <div className="mt-2 grid items-center gap-2 sm:grid-cols-2">
                <TextField label="Character boxes (0 = none)" inputMode="numeric" value={str(r.boxes ?? 0)} onChange={(v) => upd(i, { boxes: num(v) })} />
                <Toggle label="Full width" checked={r.wide === true} onChange={(wide) => upd(i, { wide })} />
              </div>
            </div>
          ))}
          <AddBtn onClick={() => set({ rows: [...rows, { label: '', value: '', boxes: 0, wide: false }] })}>Add row</AddBtn>
        </div>
      );
    }
    case 'checkboxes': {
      const options = arr<string>(b.options);
      return (
        <div className="space-y-3">
          <PlaceholderField label="Question" required value={str(b.label)} error={err('label')} onChange={(label) => set({ label })} />
          <PlaceholderField label="Ticked option" value={str(b.value)} error={err('value')} onChange={(value) => set({ value })} hint="Optional: an option text or placeholder that is pre-ticked." />
          <PlaceholderField plain multiline label="Options (one per line)" value={options.join('\n')} error={err('options')} onChange={(v) => set({ options: v.split('\n').map((x) => x.trim()).filter(Boolean) })} />
          <TextField label="Columns" inputMode="numeric" value={str(b.columns)} onChange={(v) => set({ columns: num(v) })} />
        </div>
      );
    }
    case 'text':
      return (
        <div className="space-y-3">
          <PlaceholderField multiline label="Text" required value={str(b.text)} error={err('text')} onChange={(text) => set({ text })} hint="Hindi and other Indian scripts are supported." />
          <div className="grid items-center gap-2 sm:grid-cols-3">
            <Toggle label="Bold" checked={b.bold === true} onChange={(bold) => set({ bold })} />
            <TextField label="Size (7–14)" inputMode="numeric" value={b.size ? str(b.size) : ''} onChange={(v) => set({ size: v ? num(v) : null })} />
            <SelectField label="Align" value={str(b.align) || 'left'} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]} onChange={(align) => set({ align: align || 'left' })} />
          </div>
        </div>
      );
    case 'table': {
      const cols = arr<Row>(b.columns);
      const rows = arr<string[]>(b.rows);
      const updCol = (i: number, patch: Row) => set({ columns: cols.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-fg">Columns</p>
          {err('columns') && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{err('columns')}</p>}
          {cols.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-[1fr_6rem] gap-2">
                <PlaceholderField plain label="Name" value={str(c.label)} error={err(`columns.${i}.label`)} onChange={(label) => updCol(i, { label })} />
                <TextField label="Width %" inputMode="numeric" value={str(c.width)} onChange={(v) => updCol(i, { width: num(v) })} />
              </div>
              <DelBtn label="Remove column" onClick={() => set({ columns: cols.filter((_, j) => j !== i), rows: rows.map((r) => r.filter((_, j) => j !== i)) })} />
            </div>
          ))}
          {cols.length < 8 && <AddBtn onClick={() => set({ columns: [...cols, { label: `Column ${cols.length + 1}`, width: 20 }] })}>Add column</AddBtn>}
          <p className="pt-1 text-xs font-semibold text-fg">Pre-filled rows</p>
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, cols.length)}, minmax(0, 1fr))` }}>
                {cols.map((_, k) => <PlaceholderField key={k} label={`Cell ${k + 1}`} value={str(r[k])} error={err(`rows.${i}.${k}`)} onChange={(v) => set({ rows: rows.map((x, j) => (j === i ? cols.map((__, kk) => (kk === k ? v : str(x[kk]))) : x)) })} />)}
              </div>
              <DelBtn label="Remove row" onClick={() => set({ rows: rows.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-3">
            <AddBtn onClick={() => set({ rows: [...rows, cols.map(() => '')] })}>Add row</AddBtn>
            <div className="w-40"><TextField label="Blank rows to write on" inputMode="numeric" value={str(b.blankRows ?? 0)} onChange={(v) => set({ blankRows: num(v) })} /></div>
          </div>
        </div>
      );
    }
    case 'signatures': {
      const boxes = arr<Row>(b.boxes);
      return (
        <div className="space-y-3">
          <Toggle label="Draw a box around each signature" checked={b.boxed === true} onChange={(boxed) => set({ boxed })} />
          {err('boxes') && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{err('boxes')}</p>}
          {boxes.map((x, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1"><PlaceholderField plain label={`Signature ${i + 1}`} value={str(x.label)} error={err(`boxes.${i}.label`)} onChange={(label) => set({ boxes: boxes.map((y, j) => (j === i ? { label } : y)) })} /></div>
              <DelBtn label="Remove signature" onClick={() => set({ boxes: boxes.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {boxes.length < 4 && <AddBtn onClick={() => set({ boxes: [...boxes, { label: 'Signature' }] })}>Add signature</AddBtn>}
        </div>
      );
    }
    case 'spacer':
      return <SegmentedControl options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }]} value={(str(b.size) || 'md') as 'sm' | 'md' | 'lg'} onChange={(size) => set({ size })} />;
    default:
      return <p className="text-xs text-fg-muted">The next block starts on a new page. Nothing to set.</p>;
  }
}
