'use client';

import React from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { Lock } from 'lucide-react';
import { TextField } from '@/components/ui/FormControls';
import * as api from '../api/perf.api';
import { measureLabel, SCORE_BASIS_LABEL, SOURCE_LABEL, UNIT_LABEL } from '../constants/perf.constants';
import { Btn, Progress } from './ui';
import { errorsOf } from '../hooks/useResource';
import { fmt } from '../lib';
import type { Scorecard, ScoreItem } from '../types/perf.types';

interface Draft { value: string; note: string }
const SOURCE_NOTE = { auto: 'Computed', manual: 'Typed in', import: 'From a file', override: 'Changed by hand' } as const;

/** Progress of an approved goal sheet: target, actual and score per goal, and the boxes to type values into where the viewer is allowed to. */
export function ScorecardPanel({ sheetId }: { sheetId: number }) {
  const [card, setCard] = React.useState<Scorecard | null>(null);
  const [error, setError] = React.useState('');
  const [open, setOpen] = React.useState<number | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { api.getScorecard(sheetId).then(setCard).catch((e) => setError(messageOf(e))); }, [sheetId]);
  if (!card) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />;

  const key = (itemId: number, periodId: number | null) => `${itemId}:${periodId ?? 0}`;
  const windows = card.periods.length ? card.periods.map((p) => ({ id: p.id as number | null, label: `${p.label} (${p.period_start} to ${p.period_end})`, closed: Boolean(p.closed_at) })) : [{ id: null as number | null, label: 'Whole cycle', closed: false }];
  const byBreak = card.basis !== 'whole_cycle';
  const cellOf = (item: ScoreItem, periodId: number | null) => item.cells[periodId ?? 0];
  const draftOf = (item: ScoreItem, periodId: number | null): Draft => drafts[key(item.id, periodId)] || { value: cellOf(item, periodId)?.value === null || cellOf(item, periodId) === undefined ? '' : String(cellOf(item, periodId).value), note: cellOf(item, periodId)?.note || '' };
  const setDraft = (item: ScoreItem, periodId: number | null, patch: Partial<Draft>) => setDrafts({ ...drafts, [key(item.id, periodId)]: { ...draftOf(item, periodId), ...patch } });
  const dirty = Object.keys(drafts).length > 0;

  const save = async () => {
    setSaving(true); setError('');
    const entries = Object.entries(drafts).map(([k, d]) => {
      const [itemId, periodId] = k.split(':').map(Number);
      return { item_id: itemId, period_id: periodId || null, value: d.value.trim() === '' ? null : Number(d.value), note: d.note };
    });
    try {
      setCard(await api.enterActuals(sheetId, entries));
      setDrafts({});
      showSuccess('Values saved');
    } catch (err) { setError(errorsOf(err, 'entries').entries || messageOf(err)); } finally { setSaving(false); }
  };

  const o = card.overall;
  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-fg sm:text-[13px]">Progress</p>
          <p className="mt-1 flex items-baseline gap-2 text-fg"><span className="text-3xl font-extrabold leading-none">{fmt(o.score)}</span><span className="text-[11px] text-fg-muted">score so far</span>{card.band && <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold">{card.band.label}</span>}</p>
          {card.periods.length > 0 && <p className="mt-1 text-[11px] text-fg-muted">Year-end score: {SCORE_BASIS_LABEL[card.basis]}</p>}
        </div>
        <div className="w-full max-w-xs space-y-1">
          <p className="text-[11px] text-fg-muted">{card.sections.kpi.coverage}% of goal weight has a value{o.pending_sections.length ? ` · ${o.pending_sections.join(', ')} not rated yet` : ''}</p>
          <Progress value={card.sections.kpi.coverage} total={100} />
        </div>
      </div>
      {card.breaks.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {card.breaks.map((b) => (
            <div key={b.period_id} className="rounded-lg border border-line px-2.5 py-2">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-fg-muted">{b.label}{b.closed && <Lock className="h-3 w-3" aria-label="Closed" />}</p>
              <p className="text-lg font-bold leading-tight text-fg">{fmt(b.score)}</p>
              <p className="text-[10px] text-fg-muted">{b.score === null ? 'No values yet' : `${b.coverage}% filled`}</p>
            </div>
          ))}
        </div>
      )}
      <ul className="divide-y divide-line/60 rounded-lg border border-line">
        {card.items.map((item) => (
          <li key={item.id} className="px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{item.name}<span className="ml-2 text-[11px] font-normal text-fg-muted">Weight {item.weight}%</span></p>
                <p className="text-[11px] text-fg-muted">{[item.kra_name, item.unit ? UNIT_LABEL[item.unit] : null, item.source ? SOURCE_LABEL[item.source] : null, item.source && item.source_config?.measure ? measureLabel(item.source, item.source_config.measure) : null, item.source_config?.linked_only ? 'linked tasks only' : null].filter(Boolean).join(' · ')}</p>
                {item.linked_tasks && <p className="text-[11px] text-fg-muted">Linked tasks: {item.linked_tasks.done} done, {item.linked_tasks.open} open</p>}
              </div>
              <div className="flex items-center gap-4 text-sm text-fg">
                <span><span className="text-[11px] text-fg-muted">Target </span>{fmt(item.target)}</span>
                <span><span className="text-[11px] text-fg-muted">Actual </span><span className="font-semibold">{fmt(item.actual)}</span></span>
                <span><span className="text-[11px] text-fg-muted">Score </span><span className="font-semibold">{fmt(item.score)}</span></span>
                {item.right && <Btn type="button" variant="secondary" size="sm" onClick={() => setOpen(open === item.id ? null : item.id)}>{item.right === 'override' ? 'Change' : 'Enter values'}</Btn>}
              </div>
            </div>
            {item.periods.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.periods.map((p, n) => (
                  <span key={p.period_id} className="rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] text-fg-muted">
                    {card.periods[n]?.label}: <span className="font-semibold text-fg">{fmt(p.value)}</span>{byBreak && <> / {fmt(p.target)} · <span className="font-semibold text-fg">{fmt(p.score)}</span></>}
                  </span>
                ))}
              </div>
            )}
            {item.right && open === item.id && (
              <div className="mt-3 space-y-2 rounded-lg bg-bg-subtle p-3">
                {item.right === 'override' && <p className="text-xs text-fg-muted">This value is computed. Typing a value replaces it; give a reason. Clear the box to go back to the computed value.</p>}
                {windows.map((w) => {
                  const cell = cellOf(item, w.id);
                  const d = draftOf(item, w.id);
                  return (
                    <div key={w.id ?? 'cycle'} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_8rem_1fr]">
                      <p className="pt-2 text-xs text-fg">{w.label}{cell && <span className="block text-[11px] text-fg-muted">{SOURCE_NOTE[cell.source]}{cell.source === 'override' && cell.auto_value !== null ? ` · computed ${fmt(cell.auto_value)}` : ''}</span>}</p>
                      <TextField label="" type="number" aria-label={`Value for ${w.label}`} value={d.value} onChange={(v) => setDraft(item, w.id, { value: v })} disabled={w.closed} />
                      <TextField label="" aria-label="Note" placeholder={w.closed ? 'This break is closed' : item.right === 'override' || item.evidence_required ? 'Reason or source (required)' : 'Note (optional)'} value={d.note} onChange={(v) => setDraft(item, w.id, { note: v })} maxLength={500} disabled={w.closed} />
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      {dirty && <div className="flex justify-end"><Btn type="button" onClick={save} loading={saving}>Save values</Btn></div>}
    </div>
  );
}
