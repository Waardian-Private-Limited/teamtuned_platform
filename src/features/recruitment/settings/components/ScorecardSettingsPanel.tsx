'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Section, SelectField, FieldMessage } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, fieldOf } from '../../interviews/lib/ui';
import * as api from '../api/settings.api';

const MODE_OPTIONS = [
  { value: 'show', label: 'Always show' },
  { value: 'hide', label: 'Hide' },
  { value: 'ask', label: 'Ask when scheduling' },
] as const;

const MODE_HINT: Record<api.PanelMode, string> = {
  show: 'Every interviewer sees it.',
  hide: 'Only HR and the hiring manager see it.',
  ask: 'HR chooses for each interview in the schedule dialog.',
};

const ORG = 0;

/**
 * Recruitment settings → Scorecards. Per organization, and per sub-organization on top of it:
 * the rating criteria interviewers score (required or optional) and whether the panel sees the
 * candidate's test results and earlier rounds' feedback (always, never, or HR decides per interview).
 */
export function ScorecardSettingsPanel() {
  const { subOrgs } = useManageableSubOrgs();
  const [level, setLevel] = useState<number>(ORG);
  const [data, setData] = useState<api.ScorecardSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const subOrganizationId = level === ORG ? null : level;

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const res = await api.getScorecardSettings(subOrganizationId);
      if (mine === seq.current) setData(res);
    } catch (err) {
      if (mine === seq.current) showError(messageOf(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [subOrganizationId]);

  useEffect(() => { load(); }, [load]);

  /** Runs a change and shows the settings it returns. */
  async function run(change: () => Promise<api.ScorecardSettingsDto>, done?: string) {
    setBusy(true);
    try {
      setData(await change());
      if (done) showSuccess(done);
      return true;
    } catch (err) {
      showError(messageOf(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const vis = data?.visibility;
  const inherited = Boolean(vis?.inherited);
  const levelName = level === ORG ? 'the whole organization' : subOrgs.find((s) => s.id === level)?.name || 'this sub-organization';

  function setMode(key: 'tests_mode' | 'rounds_mode', value: api.PanelMode) {
    if (!vis) return;
    const body = { tests_mode: vis.testsMode, rounds_mode: vis.roundsMode, [key]: value };
    run(() => api.saveScorecardVisibility(subOrganizationId, body), 'Saved');
  }

  return (
    <div className="space-y-3">
      <Section
        title="Scorecards"
        description="What interviewers rate and what they see. A sub-organization adds its own criteria to the organization's and can use its own visibility."
        aside={
          subOrgs.length > 0 ? (
            <div className="w-56">
              <SelectField<number>
                label=""
                numeric
                value={level}
                onChange={(v) => setLevel(v ?? ORG)}
                options={[{ value: ORG, label: 'Whole organization' }, ...subOrgs.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </div>
          ) : undefined
        }
      >
        {loading && !data ? (
          <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />
        ) : data && vis ? (
          <div className={cx('space-y-5 transition-opacity', (loading || busy) && 'opacity-70')}>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted">What the interview panel sees</h4>
              {subOrganizationId && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-fg sm:text-sm">Use the organization&apos;s settings</p>
                    <p className="text-[11px] text-fg-muted sm:text-xs">Turn off to set {levelName}&apos;s own.</p>
                  </div>
                  <Switch
                    checked={inherited}
                    disabled={busy}
                    label="Use the organization's settings"
                    onChange={(on) => run(
                      () => api.saveScorecardVisibility(subOrganizationId, on ? { inherit: true } : { tests_mode: vis.testsMode, rounds_mode: vis.roundsMode }),
                      on ? 'Using the organization settings' : 'Saved'
                    )}
                  />
                </div>
              )}
              <div className="mt-2 grid gap-3 lg:grid-cols-2">
                {([
                  { key: 'tests_mode', title: "Candidate's test results", hint: 'Test name, score and result. Answers and integrity details always stay with HR.', value: vis.testsMode },
                  { key: 'rounds_mode', title: "Earlier rounds' feedback", hint: 'Recommendations, ratings and notes from the candidate\'s earlier interviews.', value: vis.roundsMode },
                ] as const).map((row) => (
                  <div key={row.key} className="rounded-lg border border-line p-3">
                    <p className="text-sm font-semibold text-fg">{row.title}</p>
                    <p className="mb-2.5 text-[11px] text-fg-muted sm:text-xs">{row.hint}</p>
                    <SegmentedControl options={MODE_OPTIONS} value={row.value} disabled={busy || inherited} onChange={(v) => setMode(row.key, v)} />
                    <p className="mt-1.5 text-[11px] text-fg-subtle">{MODE_HINT[row.value]}{inherited ? ' (from the organization)' : ''}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Rating criteria</h4>
              <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
                Interviewers rate each 1–5. Required ones must be rated; optional ones may be skipped. Interviews already scheduled keep their list.
              </p>
              {data.organizationCriteria.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-fg-subtle">From the organization</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.organizationCriteria.map((c) => (
                      <span key={c.id} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-bg-subtle px-2 text-xs font-medium text-fg">
                        {c.name}
                        <span className="text-[10px] font-semibold text-fg-subtle">{c.required ? 'Required' : 'Optional'}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {subOrganizationId && <p className="mb-1.5 mt-3 text-[11px] font-semibold text-fg-subtle">Only for {levelName}</p>}
              <ul className="mt-2 divide-y divide-line/70 rounded-lg border border-line">
                {data.criteria.map((c) => (
                  <CriterionRow key={c.id} criterion={c} busy={busy} onSave={(body) => run(() => api.updateScorecardCriterion(c.id, body), 'Criterion saved')} onDelete={() => run(() => api.deleteScorecardCriterion(c.id), 'Criterion removed')} />
                ))}
                {data.criteria.length === 0 && (
                  <li className="px-3 py-3 text-xs text-fg-muted">{subOrganizationId ? 'No criteria of its own yet; the organization’s apply.' : 'No criteria yet. Interviews then use an overall rating only.'}</li>
                )}
              </ul>
              <AddCriterion busy={busy} onAdd={(body) => run(() => api.createScorecardCriterion(subOrganizationId, body), 'Criterion added')} />
            </div>
          </div>
        ) : null}
      </Section>
    </div>
  );
}

function CriterionRow({ criterion, busy, onSave, onDelete }: {
  criterion: api.ScorecardCriterionRowDto;
  busy: boolean;
  onSave: (body: { name?: string; required?: boolean }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(criterion.name);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setName(criterion.name); }, [criterion.name]);

  async function saveName() {
    const v = name.trim();
    if (!v) { setError('Enter a name'); return; }
    if (v === criterion.name) { setEditing(false); return; }
    if (await onSave({ name: v })) { setEditing(false); setError(null); }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              maxLength={60}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditing(false); setName(criterion.name); } }}
              aria-label="Criterion name"
              aria-invalid={Boolean(error)}
              className={cx('h-8 w-full max-w-xs rounded-md border bg-surface px-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)]', error ? 'border-[var(--tt-danger)]' : 'border-line')}
            />
            <button type="button" onClick={saveName} disabled={busy} aria-label="Save name" className={btn.icon}><Check className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setEditing(false); setName(criterion.name); setError(null); }} aria-label="Cancel" className={btn.icon}><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <p className="truncate text-sm font-medium text-fg">{criterion.name}</p>
        )}
        {error && <p className="mt-0.5 text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-fg-muted">{criterion.required ? 'Required' : 'Optional'}</span>
        <Switch checked={criterion.required} disabled={busy} onChange={(v) => onSave({ required: v })} label={`${criterion.name} required`} />
        {!editing && <button type="button" onClick={() => setEditing(true)} aria-label={`Rename ${criterion.name}`} className={btn.icon}><Pencil className="h-4 w-4" /></button>}
        <button type="button" onClick={onDelete} disabled={busy} aria-label={`Remove ${criterion.name}`} className={btn.icon}><Trash2 className="h-4 w-4" /></button>
      </div>
    </li>
  );
}

function AddCriterion({ busy, onAdd }: { busy: boolean; onAdd: (body: { name: string; required: boolean }) => Promise<boolean> }) {
  const [name, setName] = useState('');
  const [required, setRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const v = name.trim();
    if (!v) { setError('Enter a name'); return; }
    if (await onAdd({ name: v, required })) { setName(''); setRequired(true); setError(null); }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          maxLength={60}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="New criterion, e.g. System design"
          aria-label="New criterion name"
          aria-invalid={Boolean(error)}
          className={cx('h-9 min-w-0 flex-1 rounded-lg border bg-surface px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-[var(--tt-primary)] sm:max-w-sm', error ? 'border-[var(--tt-danger)]' : 'border-line')}
        />
        <span className="flex items-center gap-2 text-xs text-fg-muted">
          Required <Switch checked={required} onChange={setRequired} label="New criterion required" />
        </span>
        <button type="button" onClick={add} disabled={busy} className={btn.primary}><Plus className="h-4 w-4" /> Add</button>
      </div>
      <FieldMessage error={error ?? undefined} />
    </div>
  );
}
