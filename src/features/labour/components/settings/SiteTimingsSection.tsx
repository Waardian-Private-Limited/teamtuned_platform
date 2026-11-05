'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Section } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { LabourTimings, SiteTimingsResponse, SiteTimingsRow } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { pickTimings, timingsProblems } from '../../utils/timings';
import { FormError, Pill, primaryBtn, secondaryBtn, td, th, trCls } from '../shared/Primitives';
import { TimingFields } from './TimingFields';

/**
 * Each site's labour clock: its own cutoff / standard / overtime / night, or the organization default. Pay and the work
 * day of every punch follow the clock of the labourer's site. `refreshKey` reloads after the default changes.
 */
export function SiteTimingsSection({ canEdit, refreshKey }: { canEdit: boolean; refreshKey: number }) {
  const [data, setData] = useState<SiteTimingsResponse | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SiteTimingsRow | null>(null);

  const load = useCallback(() => {
    api.getSiteTimings().then((r) => { setData(r); setError(''); }).catch((e) => setError(messageOf(e)));
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const reset = async (row: SiteTimingsRow) => {
    try {
      await api.resetSiteTimings(row.siteId);
      showSuccess(`${row.siteName} now follows the organization default`);
      load();
    } catch (e) { setError(messageOf(e)); }
  };

  return (
    <Section title="Site timings" description="A site with its own shift sets its own cutoff, standard, overtime and night times. Other sites follow the default above.">
      <FormError message={error} />
      {!data ? <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" /> : data.sites.length === 0 ? <p className="text-sm text-fg-muted">No sites.</p> : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0">
            <thead><tr><th className={th}>Site</th><th className={th}>Cutoff</th><th className={th}>Timings</th>{canEdit && <th className={th} />}</tr></thead>
            <tbody>
              {data.sites.map((row) => (
                <tr key={row.siteId} className={trCls}>
                  <td className={td}><div className="font-semibold">{row.siteName}</div>{row.override ? <Pill tone="dark">Own timings</Pill> : <Pill tone="neutral">Default</Pill>}</td>
                  <td className={`${td} tabular-nums`}>{row.effective.attendanceCutoff}</td>
                  <td className={`${td} text-xs`}>{row.effective.summary.replace(/^Cutoff [^·]+· /, '')}</td>
                  {canEdit && (
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <button type="button" className="text-xs font-semibold text-fg hover:underline" onClick={() => setEditing(row)}>{row.override ? 'Edit' : 'Set own'}</button>
                      {row.override && <button type="button" className="ml-3 text-xs font-semibold text-fg-muted hover:text-fg" onClick={() => reset(row)}>Use default</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && data && <EditDialog row={editing} base={data.default} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Section>
  );
}

function EditDialog({ row, base, onClose, onSaved }: { row: SiteTimingsRow; base: LabourTimings; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState<LabourTimings>(() => pickTimings(row.override || base));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const errs = timingsProblems(value);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.saveSiteTimings(row.siteId, value);
      showSuccess(`Timings saved for ${row.siteName}`);
      onSaved();
    } catch (err) {
      const p = placeError(err);
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Timings · ${row.siteName}`} maxWidthClassName="max-w-lg"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save timings'}</button></>}>
      <div className="space-y-3">
        <TimingFields value={value} onChange={(v) => { setValue(v); setErrors({}); }} errors={errors} />
        <p className="text-[11px] text-fg-muted">Pay in reports follows these times for every day, past ones too. The cutoff files new punches; punches already filed keep their day until they are re-filed.</p>
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
