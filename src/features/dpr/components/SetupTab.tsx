'use client';

import React from 'react';
import { Building2, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { fieldErrorsOf, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Chip } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { Btn, Card, IconBtn } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { Location, Person, Role, Setup, Site } from '../api/dpr.api';
import { DateBox, DAYS, NumBox, PeoplePicker, ROLE_LABEL, TextBox } from './parts';

const ROLES: Role[] = ['reporter', 'reviewer', 'equipment_owner', 'material_owner', 'billing_reporter'];

function LevelsHelper({ onApply }: { onApply: (levels: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [c, setC] = React.useState({ basements: 0, plinths: 1, slabs: 10, terraces: 1 });
  const [busy, setBusy] = React.useState(false);
  if (!open) return <Btn variant="ghost" size="sm" icon={Wand2} onClick={() => setOpen(true)}>From counts</Btn>;
  const apply = async () => {
    setBusy(true);
    try { onApply((await api.levels(c)).levels); setOpen(false); } catch (e) { showError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-bg-subtle p-2">
      {(['basements', 'plinths', 'slabs', 'terraces'] as const).map((k) => (
        <label key={k} className="text-[11px] font-semibold capitalize text-fg-muted">{k}<NumBox value={c[k]} onChange={(v) => setC({ ...c, [k]: v ?? 0 })} ariaLabel={k} /></label>
      ))}
      <Btn size="sm" loading={busy} onClick={apply}>Use</Btn>
      <Btn size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
    </div>
  );
}

/** Where the site's work happens (towers and other areas with their levels), the concrete totals, report days, and who does what. */
export function SetupTab({ siteId, initial, onSaved }: { siteId: number; initial: { site: Site; setup: Setup; access: { plan: boolean } }; onSaved: () => void }) {
  const s = initial.setup;
  const edit = initial.access.plan;
  const [locations, setLocations] = React.useState<(Location & { levelsText?: string })[]>(s.locations.map((l) => ({ ...l, levelsText: l.levels.join(', ') })));
  const [totals, setTotals] = React.useState({ total: s.total_concrete_m3 || null, opening: s.opening_concrete_m3 || null });
  const [days, setDays] = React.useState(s.report_days);
  const [billing, setBilling] = React.useState(s.billing_enabled);
  const [people, setPeople] = React.useState<Record<Role, Person[]>>(s.people);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const setLoc = (i: number, patch: Partial<Location & { levelsText?: string }>) => setLocations((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const levelsOf = (l: { levelsText?: string; levels: string[] }) => (l.levelsText ?? l.levels.join(', ')).split(',').map((x) => x.trim()).filter(Boolean);
  const toggleDay = (i: number) => setDays((d) => d.split('').map((c, j) => (j === i ? (c === '1' ? '0' : '1') : c)).join(''));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      await api.saveSetup(siteId, {
        locations: locations.map((l) => ({ id: l.id, name: l.name, kind: l.kind, levels: levelsOf(l), start_on: l.start_on ?? null, end_on: l.end_on ?? null })),
        total_concrete_m3: totals.total ?? 0, opening_concrete_m3: totals.opening ?? 0, report_days: days, billing_enabled: billing,
        people: Object.fromEntries(ROLES.map((r) => [r, people[r].map((p) => p.employee_id)])) as Record<Role, number[]>,
      });
      showSuccess(s.ready ? 'Site saved' : 'Site set up. Plan the month next.');
      onSaved();
    } catch (e) { const f = fieldErrorsOf(e); setErrors(f.fields); showError(f.general || 'Check the highlighted fields'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3 pb-20 sm:space-y-4">
      <Card title="Locations" note="towers and other areas; levels become milestones" right={edit ? <div className="flex gap-1.5"><Btn variant="secondary" size="sm" icon={Building2} onClick={() => setLocations((ls) => [...ls, { id: '', name: '', kind: 'tower', levels: [], levelsText: '' }])}>Tower</Btn><Btn variant="secondary" size="sm" icon={Plus} onClick={() => setLocations((ls) => [...ls, { id: '', name: '', kind: 'area', levels: [], levelsText: '' }])}>Area</Btn></div> : undefined}>
        {!locations.length && <p className="text-xs text-fg-muted">No locations. Add the towers (with their slabs) and other areas such as a clubhouse or podium.</p>}
        <div className="space-y-2.5">
          {locations.map((l, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-2.5">
              <div className="grid grid-cols-[1fr_auto_auto] items-start gap-2">
                <TextBox value={l.name} onChange={(v) => setLoc(i, { name: v })} ariaLabel="Location name" placeholder={l.kind === 'tower' ? 'e.g. Tower A' : 'e.g. Clubhouse'} error={errors[`locations.${i}.name`]} disabled={!edit} />
                <select value={l.kind} disabled={!edit} onChange={(e) => setLoc(i, { kind: e.target.value as Location['kind'] })} aria-label="Kind" className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
                  <option value="tower">Tower</option><option value="area">Area</option>
                </select>
                {edit ? <IconBtn label="Remove location" onClick={() => setLocations((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></IconBtn> : <span />}
              </div>
              {l.kind === 'tower' && (
                <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                  <label className="text-[11px] font-semibold text-fg-muted">Start<DateBox value={l.start_on} onChange={(v) => setLoc(i, { start_on: v })} ariaLabel="Tower start" disabled={!edit} /></label>
                  <label className="text-[11px] font-semibold text-fg-muted">End<DateBox value={l.end_on} onChange={(v) => setLoc(i, { end_on: v })} ariaLabel="Tower end" error={errors[`locations.${i}.end_on`]} disabled={!edit} /></label>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <TextBox className="flex-1" value={l.levelsText} onChange={(v) => setLoc(i, { levelsText: v })} ariaLabel="Levels" placeholder={l.kind === 'tower' ? 'B1, Plinth, Slab 1, Slab 2, … Terrace' : 'Sub-zones, comma separated'} disabled={!edit} />
                {edit && l.kind === 'tower' && <LevelsHelper onApply={(lv) => setLoc(i, { levelsText: lv.join(', ') })} />}
              </div>
              <p className="text-[11px] text-fg-muted">{levelsOf(l).length} level{levelsOf(l).length === 1 ? '' : 's'}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card title="Concrete for the project">
          <div className="flex flex-wrap gap-4">
            <label className="text-xs font-semibold text-fg">Total (m³)<NumBox wide value={totals.total} onChange={(v) => setTotals({ ...totals, total: v })} ariaLabel="Total concrete" error={errors.total_concrete_m3} disabled={!edit} step={0.5} /></label>
            <label className="text-xs font-semibold text-fg">Poured before DPR (m³)<NumBox wide value={totals.opening} onChange={(v) => setTotals({ ...totals, opening: v })} ariaLabel="Poured before" error={errors.opening_concrete_m3} disabled={!edit} step={0.5} /></label>
          </div>
        </Card>
        <Card title="Reports">
          <p className="text-xs font-semibold text-fg">Report days</p>
          <div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => <Chip key={d} active={days[i] === '1'} disabled={!edit} onClick={() => toggleDay(i)}>{d}</Chip>)}</div>
          {errors.report_days && <p className="text-xs text-[var(--tt-danger)]">{errors.report_days}</p>}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div><p className="text-xs font-semibold text-fg">Billing report</p><p className="text-[11px] text-fg-muted">Bill targets, steel and concrete reconciliation, checklist, documents, vendors.</p></div>
            <Switch checked={billing} onChange={setBilling} disabled={!edit} label="Billing report" />
          </div>
        </Card>
      </div>

      <Card title="People" note="named per site">
        <div className="grid gap-4 md:grid-cols-2">
          {ROLES.filter((r) => r !== 'billing_reporter' || billing).map((r) => (
            <div key={r} className="space-y-1.5">
              <p className="text-xs font-semibold text-fg">{ROLE_LABEL[r]}</p>
              <PeoplePicker value={people[r]} onChange={(v) => setPeople({ ...people, [r]: v })} disabled={!edit} />
            </div>
          ))}
        </div>
        {errors.people && <p className="text-xs text-[var(--tt-danger)]">{errors.people}</p>}
        <p className="text-[11px] text-fg-muted">Reporters fill the daily report (any one of them). Reviewers see the site and hear when a day was missed. Equipment and material owners get breakdowns and material requests as actions in the site&apos;s monthly MOM meeting.</p>
      </Card>

      {edit && (
        <div className="sticky bottom-0 z-20 -mx-1 flex justify-end border-t border-line bg-bg/95 px-1 py-2.5 backdrop-blur">
          <Btn icon={Save} loading={saving} onClick={save}>{s.ready ? 'Save' : 'Set up site'}</Btn>
        </div>
      )}
    </div>
  );
}
