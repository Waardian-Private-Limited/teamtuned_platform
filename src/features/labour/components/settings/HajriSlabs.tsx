'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldMessage } from '@/components/ui/FormControls';
import { MAX_HAJRI_SLABS } from '../../constants/labour.constants';
import type { HajriSlab } from '../../types/labour.types';
import { hajriFor, hajriLabel } from '../../utils/pay';
import { secondaryBtn, selectCls, td, th, trCls } from '../shared/Primitives';

/** 0 to 4 in steps of 0.25, written the site way. */
const UNIT_OPTIONS = Array.from({ length: 17 }, (_, i) => i / 4);
const SAMPLE_HOURS = [3, 4, 6, 8, 10, 12, 16];

interface Row { key: number; minHours: string; units: number }
const rowsOf = (slabs: HajriSlab[]): Row[] => slabs.map((s, i) => ({ key: i, minHours: String(s.minHours), units: s.units }));
const slabsOf = (rows: Row[]): HajriSlab[] => rows.map((r) => ({ minHours: r.minHours.trim() === '' ? NaN : Number(r.minHours), units: r.units }));

/**
 * The hajri slab table: rows "from N hours worked -> units". A day gets the units of the last slab it reaches.
 * Shows a live preview of what common day lengths come to.
 */
export function HajriSlabs({ value, onChange, error, disabled }: { value: HajriSlab[]; onChange: (s: HajriSlab[]) => void; error?: string; disabled?: boolean }) {
  const [rows, setRows] = useState<Row[]>(() => rowsOf(value));
  const [tryHours, setTryHours] = useState('9');
  const sent = useRef(value);
  // A reload (or another company chosen) replaces the table; our own edits come back unchanged and are ignored.
  useEffect(() => {
    if (value !== sent.current) { setRows(rowsOf(value)); sent.current = value; }
  }, [value]);

  const push = (next: Row[]) => {
    setRows(next);
    const s = slabsOf(next);
    sent.current = s;
    onChange(s);
  };
  const patch = (key: number, p: Partial<Row>) => push(rows.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const add = () => {
    const last = rows[rows.length - 1];
    const h = last ? (Number(last.minHours) || 0) + 4 : 0;
    push([...rows, { key: Math.max(-1, ...rows.map((r) => r.key)) + 1, minHours: String(Math.min(24, h)), units: Math.min(4, (last?.units ?? 0) + 0.5) }]);
  };

  const valid = slabsOf(rows).filter((s) => Number.isFinite(s.minHours));
  const preview = Array.from(new Set([...SAMPLE_HOURS, ...valid.map((s) => s.minHours)])).filter((h) => h > 0 && h <= 24).sort((a, b) => a - b);
  const tried = Number(tryHours);

  return (
    <div className="space-y-3">
      <div className={cx('overflow-hidden rounded-xl border', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <table className="w-full border-separate border-spacing-0 text-xs sm:text-sm">
          <thead>
            <tr>
              <th className={th}>From hours worked</th><th className={th}>Hajri</th><th className={th}><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className={trCls}>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <input aria-label={`Slab ${i + 1} hours`} inputMode="decimal" value={r.minHours} disabled={disabled} onChange={(e) => patch(r.key, { minHours: e.target.value.replace(/[^\d.]/g, '') })}
                      className={cx(selectCls, 'w-20 font-normal tabular-nums')} />
                    <span className="text-fg-muted">h</span>
                  </div>
                </td>
                <td className={td}>
                  <select aria-label={`Slab ${i + 1} hajri units`} value={r.units} disabled={disabled} onChange={(e) => patch(r.key, { units: Number(e.target.value) })} className={cx(selectCls, 'w-32')}>
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u === 0 ? '0 (not paid)' : `${hajriLabel(u)} hajri`}</option>)}
                  </select>
                </td>
                <td className={cx(td, 'text-right')}>
                  {!disabled && rows.length > 1 && (
                    <button type="button" aria-label={`Remove slab ${i + 1}`} onClick={() => push(rows.filter((x) => x.key !== r.key))} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FieldMessage error={error} hint="A day gets the hajri of the last row it reaches. Hours must go up row by row and hajri may not go down." />
      {!disabled && rows.length < MAX_HAJRI_SLABS && <button type="button" className={secondaryBtn} onClick={add}><Plus className="h-3.5 w-3.5" aria-hidden />Add slab</button>}

      <div className="rounded-xl bg-bg-subtle p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Preview</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {preview.map((h) => (
            <li key={h} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs tabular-nums text-fg">
              {h}h → <span className="font-bold">{hajriFor(h * 60, valid) ? `${hajriLabel(hajriFor(h * 60, valid))} hajri` : 'nothing'}</span>
            </li>
          ))}
        </ul>
        <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          Try a day of
          <input aria-label="Hours worked to try" inputMode="decimal" value={tryHours} onChange={(e) => setTryHours(e.target.value.replace(/[^\d.]/g, ''))} className={cx(selectCls, 'w-16 font-normal tabular-nums')} />
          hours:
          <span className="font-bold text-fg">{Number.isFinite(tried) && tryHours !== '' ? (hajriFor(tried * 60, valid) ? `${hajriLabel(hajriFor(tried * 60, valid))} hajri` : 'no hajri') : '—'}</span>
        </label>
      </div>
    </div>
  );
}
