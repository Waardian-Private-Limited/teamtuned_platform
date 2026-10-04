'use client';

import React from 'react';
import { buildPreset } from '../../../api/roster.api';
import type { PatternPreset } from '../../../types/roster.types';
import type { ShiftOpt } from '../../../hooks/useTeamsCatalog';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import { btnPrimary, miniInput } from '../../catalog-shared/catalogUi';
import { Spinner } from '../../catalog-shared/Spinner';
import type { CycleCell } from '../../../utils/patternCycle';

interface Props {
  presets: PatternPreset[];
  shifts: ShiftOpt[];
  onBuilt: (name: string, cycle: CycleCell[]) => void;
}

export function PresetGallery({ presets, shifts, onBuilt }: Props) {
  const [key, setKey] = React.useState<string | null>(null);
  const [morning, setMorning] = React.useState<number | null>(null);
  const [evening, setEvening] = React.useState<number | null>(null);
  const [night, setNight] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  if (presets.length === 0) return null;
  const options = (empty: string) => (
    <>
      <option value="">{empty}</option>
      {shifts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </>
  );

  const apply = async () => {
    if (!key || !morning) return;
    setBusy(true);
    setError('');
    try {
      const built = await buildPreset({ key, morningId: morning, eveningId: evening, nightId: night });
      onBuilt(built.name, built.cycle);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-bg-subtle/50 p-3">
      <p className="text-xs font-semibold text-fg">Start from a common pattern</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p.key} type="button" onClick={() => setKey(key === p.key ? null : p.key)} aria-pressed={key === p.key}
            className={cx('h-8 rounded-lg border px-3 text-xs font-semibold transition-colors', key === p.key ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-surface text-fg hover:bg-bg-subtle')}>
            {p.name}
          </button>
        ))}
      </div>
      {key && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] text-fg-muted">Which of your shifts should play each role? Evening and Night are only needed for patterns that use them.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select value={morning ?? ''} onChange={(e) => setMorning(e.target.value ? Number(e.target.value) : null)} className={miniInput} aria-label="Morning shift">{options('Morning shift…')}</select>
            <select value={evening ?? ''} onChange={(e) => setEvening(e.target.value ? Number(e.target.value) : null)} className={miniInput} aria-label="Evening shift">{options('Evening shift (optional)')}</select>
            <select value={night ?? ''} onChange={(e) => setNight(e.target.value ? Number(e.target.value) : null)} className={miniInput} aria-label="Night shift">{options('Night shift (optional)')}</select>
          </div>
          <button type="button" disabled={!morning || busy} onClick={apply} className={cx(btnPrimary, 'mt-2.5')}>
            {busy && <Spinner />} Fill in the cycle
          </button>
          {error && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
        </div>
      )}
    </div>
  );
}
