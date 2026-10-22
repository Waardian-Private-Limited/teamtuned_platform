'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { StatusPill } from '@/components/ui/StatusPill';
import * as api from '../api/perf.api';
import { FINAL_STATUS_LABEL } from '../constants/perf.constants';
import { errorsOf, type FieldErrors } from '../hooks/useResource';
import { fmt } from '../lib';
import type { Band, CalibrationMember, CalibrationView, SpreadBlock } from '../types/perf.types';
import { SpreadOverrideDialog, spreadBlockOf } from './SpreadOverride';
import { Btn, Card, PageHead, Table, td } from './ui';

const name = (bands: Band[], code: string | null) => (code ? bands.find((b) => b.code === code)?.label || code : '—');

/** One calibration session: the spread of ratings against the guide, everyone's rating, and the log of changes. */
export function CalibrationPage({ id, basePath }: { id: number; basePath: string }) {
  const [view, setView] = React.useState<CalibrationView | null>(null);
  const [error, setError] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [target, setTarget] = React.useState<CalibrationMember | null>(null);
  const [band, setBand] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [spread, setSpread] = React.useState<SpreadBlock | null>(null);

  React.useEffect(() => { api.getCalibration(id).then(setView).catch((e) => setError(messageOf(e))); }, [id]);
  if (!view) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  const open = (m: CalibrationMember) => { setTarget(m); setBand(''); setReason(''); setErrors({}); };
  const save = async () => {
    if (!target) return;
    setBusy(true); setErrors({});
    try { setView(await api.adjustCalibration(id, { sheet_id: target.sheet_id, to_band: band, reason })); setTarget(null); showSuccess('Rating changed'); } catch (e) { setErrors(errorsOf(e, 'reason')); } finally { setBusy(false); }
  };
  const close = async (reason?: string) => {
    try { setView(await api.closeCalibration(id, reason)); setSpread(null); showSuccess('Session closed'); } catch (e) { const b = spreadBlockOf(e); if (b) setSpread(b); else { setSpread(null); setError(messageOf(e)); } }
  };
  const maxCount = Math.max(1, ...view.distribution.rows.map((r) => r.count));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        help={HELP.calibration}
        title={<><Link href={`${basePath}/cycles/${view.session.cycle_id}`} aria-label={`Back to ${view.session.cycle_name}`} className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>{view.session.name}<StatusPill label={view.session.status === 'open' ? 'Open' : 'Closed'} tone={view.session.status === 'open' ? 'active' : 'terminated'} /></>}
        count={view.members.length}
        subtitle={[`Calibration in ${view.session.cycle_name}`, view.session.cycle_status !== 'calibration' ? 'ratings can be changed while the cycle is in calibration' : null, view.mixed_scales ? 'people here use different rating scales, so the spread counts ratings by code' : null].filter(Boolean).join(' · ')}
        actions={view.session.status === 'open' && view.can_adjust ? <Btn variant="secondary" icon={Lock} onClick={() => setConfirm({ title: 'Close this session?', body: <p className="text-sm text-fg">Ratings in it can no longer be changed here. All sessions must be closed before ratings are released.</p>, cta: 'Close session', run: () => close() })}>Close session</Btn> : undefined}
      >
        {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
      </PageHead>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto tt-scroll-hidden">
        <Card title="Spread of ratings" note={`${view.distribution.total} rated${view.guide ? ` · guide with ${view.tolerance} points of slack` : ' · no guide set in Settings'}`}>
          {view.distribution.rows.map((r) => (
            <div key={r.code} className="grid grid-cols-[7rem_1fr] items-center gap-2 text-xs text-fg sm:grid-cols-[9rem_1fr_11rem]">
              <span className="truncate">{name(view.bands, r.code)}</span>
              <div className="relative h-4 rounded bg-bg-subtle">
                <div className="h-4 rounded bg-[var(--tt-primary)]" style={{ width: `${(r.count / maxCount) * 100}%` }} />
              </div>
              <span className={`col-span-2 sm:col-span-1 ${r.flag ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted'}`}>{r.count} · {r.percent}%{r.target !== null ? ` (aim ${r.target}%${r.flag ? `, ${r.flag === 'over' ? 'too many' : 'too few'}` : ''})` : ''}</span>
            </div>
          ))}
        </Card>

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {view.members.length === 0 ? (
            <EmptyState compact illustration={{ src: '/vectors/employees.svg', width: 220, height: 160, alt: '' }} title="Nobody to compare yet" description="Nobody in this session has approved goals." />
          ) : (
            <Table minWidth={820} head={[{ label: 'Employee' }, { label: 'Score', className: 'w-20' }, { label: 'System', className: 'w-32' }, { label: 'Manager', className: 'w-32' }, { label: 'Now', className: 'w-32' }, ...(view.can_adjust ? [{ label: 'Actions', className: 'w-28 text-right' }] : [])]}>
              {view.members.map((m) => (
                <tr key={m.sheet_id} className="transition-colors hover:bg-bg-subtle/50">
                  <td className={td}>
                    <span className="font-semibold">{m.employee_name}</span>{m.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{m.employee_code}</span>}
                    <span className="mt-0.5 block text-[11px] text-fg-muted">Reviewer: {m.reviewer_name || 'None'} · {FINAL_STATUS_LABEL[m.final_status]}{m.released ? ' · Released' : ''}</span>
                    {m.calibrated_band && m.calibration_reason && <span className="mt-0.5 block text-[11px] text-fg-muted">Calibrated: {m.calibration_reason}</span>}
                  </td>
                  <td className={td}>{fmt(m.score)}</td>
                  <td className={`${td} text-fg-muted`}>{name(view.bands, m.system_band)}</td>
                  <td className={`${td} text-fg-muted`}>{m.chosen_band ? name(view.bands, m.chosen_band) : '—'}</td>
                  <td className={td}><span className="font-semibold">{name(view.bands, m.band)}</span></td>
                  {view.can_adjust && <td className={`${td} text-right`}><Btn variant="secondary" size="sm" disabled={!m.adjustable} onClick={() => open(m)}>Change</Btn></td>}
                </tr>
              ))}
            </Table>
          )}
        </div>

        {view.changes.length > 0 && (
          <Card title="Changes" note={`${view.changes.length}`}>
            <div className="divide-y divide-line/60">
              {view.changes.map((c) => <p key={c.id} className="py-1.5 text-xs text-fg"><span className="font-semibold">{c.employee_name}:</span> {name(view.bands, c.from_band)} to {name(view.bands, c.to_band)} · {c.reason}<span className="text-fg-muted"> · {c.changed_by_name || 'Someone'}</span></p>)}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} title={target ? `Change rating for ${target.employee_name}` : ''}
        footer={<><Btn type="button" variant="secondary" onClick={() => setTarget(null)}>Cancel</Btn><Btn type="button" loading={busy} onClick={save}>Change rating</Btn></>}>
        {target && (
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">Now: {name(view.bands, target.band)}. Putting it back to {name(view.bands, target.original_band)} removes the calibration.</p>
            <SelectField<string> label="New rating" required value={band || null} onChange={(v) => setBand(v || '')} options={view.bands.map((b) => ({ value: b.code, label: b.label }))} error={errors.to_band} />
            <TextField label="Reason" required value={reason} onChange={setReason} error={errors.reason} maxLength={500} />
          </div>
        )}
      </Dialog>
      <SpreadOverrideDialog block={spread} action="Close session" bandName={(c) => name(view.bands, c)} onClose={() => setSpread(null)} onConfirm={(r) => close(r)} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
