'use client';

import React from 'react';
import { Clock, Plus, Sun } from 'lucide-react';
import { WEEKDAYS } from '../../../constants/roster.constants';
import { blankDemand, newKey, toDrafts, toInputs, validateDrafts, weekdaySummary, type DemandDraft } from '../../../utils/teamDemand';
import { btnSecondary } from '../../catalog-shared/catalogUi';
import type { TeamDetailTabProps } from './TeamTabProps';
import { DemandRowEditor } from './DemandRowEditor';
import { TabFooter } from './TabFooter';

export function DemandTab({ editor, detail, catalog }: TeamDetailTabProps) {
  const [rows, setRows] = React.useState<DemandDraft[]>(() => toDrafts(detail.demands));
  const [showErrors, setShowErrors] = React.useState(false);
  const problems = validateDrafts(rows);
  const summary = weekdaySummary(rows);

  const patch = (key: string, p: Partial<DemandDraft>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const copy = (row: DemandDraft, mask: number) => setRows((r) => {
    const i = r.findIndex((x) => x.key === row.key);
    const next = [...r];
    next.splice(i + 1, 0, { ...row, key: newKey(), mask });
    return next;
  });

  const save = async () => {
    setShowErrors(true);
    if (Object.keys(problems).length) return;
    await editor.saveDemandList(toInputs(rows));
  };

  const block = (kind: 'shift' | 'interval', title: string, hint: string, icon: React.ReactNode) => {
    const list = rows.filter((r) => r.kind === kind);
    return (
      <section>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-fg">{icon}{title}</h4>
            <p className="text-[11px] text-fg-muted">{hint}</p>
          </div>
          <button type="button" onClick={() => setRows((r) => [...r, blankDemand(kind)])} className={btnSecondary}><Plus className="h-3.5 w-3.5" /> Add</button>
        </div>
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-fg-muted">Nothing here yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {list.map((row) => (
              <DemandRowEditor
                key={row.key}
                row={row}
                catalog={catalog}
                error={showErrors ? problems[row.key] : undefined}
                onChange={(p) => patch(row.key, p)}
                onRemove={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                onCopy={(mask) => copy(row, mask)}
              />
            ))}
          </ul>
        )}
      </section>
    );
  };

  const hasPeak = summary.peak.some((n) => n > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-bg-subtle/60 px-4 py-3">
        <p className="text-xs font-semibold text-fg">People required per weekday</p>
        <p className="mt-1 text-xs text-fg-muted">
          {WEEKDAYS.map((d, i) => `${d} ${summary.shift[i]}`).join('  ·  ')}
          {hasPeak && <span className="block mt-0.5">Hourly cover peaks: {WEEKDAYS.map((d, i) => `${d} ${summary.peak[i]}`).join('  ·  ')}</span>}
        </p>
        <p className="mt-1 text-[11px] text-fg-muted">The roster generator tries to meet these numbers. Where it cannot, it leaves an open shift for you to fill.</p>
      </div>
      {block('shift', 'Shift demand', 'How many people each shift needs, on which days. Good for factories, hospitals and fixed-shift sites.', <Sun className="h-4 w-4" />)}
      {block('interval', 'Hourly demand', 'How many people must be present during a time window. Good for retail and call centres; the generator picks the shifts.', <Clock className="h-4 w-4" />)}
      <TabFooter
        label="Save demand"
        saving={editor.saving === 'demand'}
        error={showErrors && Object.keys(problems).length ? 'Fix the highlighted rows first.' : editor.errors.demand?.message}
        onSave={save}
      />
    </div>
  );
}
