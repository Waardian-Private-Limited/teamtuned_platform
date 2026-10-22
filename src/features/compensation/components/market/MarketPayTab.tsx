'use client';

import React from 'react';
import { Trash2, Upload } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { csvRecords } from '@/lib/csv';
import { showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import * as api from '../../api/compensation.api';
import type { BenchmarkDto, MarketBand, MarketImportDto, MarketSurveyDto } from '../../types/compensation.dto';
import { date, inr } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { FilterTabs } from '../shared/FilterTabs';
import { Panel, Stat, Toolbar, td, th } from '../shared/Panel';
import { SearchBox } from '../shared/SearchBox';

type BandFilter = 'all' | MarketBand | 'unmatched';
const BAND_LABEL: Record<MarketBand, string> = { below_p25: 'Below P25', p25_p50: 'P25 to median', p50_p75: 'Median to P75', above_p75: 'Above P75' };
const FILTERS: { value: BandFilter; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'below_p25', label: 'Below P25' }, { value: 'p25_p50', label: 'Below median' },
  { value: 'p50_p75', label: 'Above median' }, { value: 'above_p75', label: 'Above P75' }, { value: 'unmatched', label: 'No market match' },
];

/** Each person's yearly package against the market survey HR imported: compa-ratio (1.00 = market median) and where they sit. */
export function MarketPayTab({ canEdit, canDelete, onOpenHistory }: { canEdit: boolean; canDelete: boolean; onOpenHistory: (employeeId: number) => void }) {
  const [surveys, setSurveys] = React.useState<MarketSurveyDto[] | null>(null);
  const [surveyId, setSurveyId] = React.useState<number | null>(null);
  const [band, setBand] = React.useState<BandFilter>('all');
  const [search, setSearch] = React.useState('');
  const [data, setData] = React.useState<BenchmarkDto | null>(null);
  const [error, setError] = React.useState('');
  const [importing, setImporting] = React.useState(false);

  const loadSurveys = React.useCallback(() => api.marketSurveys().then((d) => { setSurveys(d.surveys); setSurveyId((cur) => (cur && d.surveys.some((s) => s.id === cur) ? cur : d.surveys[0]?.id ?? null)); }).catch((e) => setError(messageOf(e))), []);
  React.useEffect(() => { loadSurveys(); }, [loadSurveys]);
  React.useEffect(() => {
    if (!surveyId) { setData(null); return undefined; }
    const t = setTimeout(() => { setError(''); api.marketBenchmark({ survey_id: surveyId, band: band === 'all' ? undefined : band, search: search.trim() || undefined }).then(setData).catch((e) => setError(messageOf(e))); }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [surveyId, band, search]);

  const remove = async () => {
    if (!surveyId) return;
    try { await api.deleteMarketSurvey(surveyId); showSuccess('Survey removed'); setSurveyId(null); loadSurveys(); } catch (e) { setError(messageOf(e)); }
  };
  const s = data?.summary;
  const survey = surveys?.find((x) => x.id === surveyId);

  return (
    <Panel>
      <Toolbar>
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl text-[11px] text-fg-muted sm:text-xs">Packages against your market survey. Compa-ratio 1.00 = market median.</p>
          <div className="flex flex-wrap items-center gap-2">
            {surveys && surveys.length > 0 && <div className="w-64"><SelectField<number> label="" numeric value={surveyId} onChange={setSurveyId} options={surveys.map((x) => ({ value: x.id, label: `${x.name} · ${date(x.effective_date)}` }))} /></div>}
            {canDelete && surveyId && <Btn variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remove}>Remove</Btn>}
            {canEdit && <Btn variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImporting(true)}>Import survey</Btn>}
          </div>
        </div>
        {data?.survey && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <Stat label="Median compa-ratio" value={s?.median_compa_ratio?.toFixed(2) ?? '—'} hint={survey ? `${survey.row_count} market rows` : undefined} />
              <Stat label="Below P25" value={s?.bands.below_p25 ?? 0} hint="Retention risk" />
              <Stat label="P25 to median" value={s?.bands.p25_p50 ?? 0} />
              <Stat label="Median to P75" value={s?.bands.p50_p75 ?? 0} />
              <Stat label="Above P75" value={s?.bands.above_p75 ?? 0} />
              <Stat label="No market match" value={s?.bands.unmatched ?? 0} hint="Check designations" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <FilterTabs options={FILTERS} value={band} onChange={setBand} />
              <SearchBox value={search} onChange={setSearch} placeholder="Search name, code or designation…" />
            </div>
          </>
        )}
      </Toolbar>
      {error && <p role="alert" className="border-b border-line p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {surveys === null && <TableSkeleton rows={5} columns={6} />}
      {surveys?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <EmptyState illustration={{ src: '/vectors/patterns.svg', width: 220, height: 160, alt: '' }} title="No market survey yet"
            description="Import the salary survey your company buys as a CSV with columns job, level, location, p25, p50, p75. Level and location are optional."
            action={canEdit ? { label: 'Import survey', onClick: () => setImporting(true) } : undefined} />
        </div>
      )}
      {surveyId && !data && !error && <TableSkeleton rows={5} columns={6} />}
      {data && data.rows.length === 0 && <p className="p-6 text-center text-sm text-fg-muted">Nobody matches these filters.</p>}
      {data && data.rows.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto tt-scroll-hidden">
          <table className="w-full min-w-[960px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>{['Employee', 'Job matched', 'Yearly package', 'Market P25 · median · P75', 'Compa-ratio', 'Position'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.employee_id} className="transition-colors hover:bg-bg-subtle/50">
                  <td className={td}>
                    <button type="button" onClick={() => onOpenHistory(r.employee_id)} className="text-left font-semibold hover:underline">{r.name}</button>
                    <span className="block text-[11px] text-fg-muted">{[r.employee_code, r.designation || r.role_name, r.grade, r.location].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className={`${td} text-fg-muted`}>{r.market ? <>{[r.market.job, r.market.level, r.market.location].filter(Boolean).join(' · ')}<span className="block text-[11px]">on {r.matched_on}</span></> : '—'}</td>
                  <td className={td}>{inr(r.ctc)}</td>
                  <td className={`${td} text-fg-muted`}>{r.market ? `${inr(r.market.p25)} · ${inr(r.market.p50)} · ${inr(r.market.p75)}` : '—'}</td>
                  <td className={td}><span className={`font-bold ${r.compa_ratio !== null && r.compa_ratio < 0.9 ? 'text-[var(--tt-danger)]' : ''}`}>{r.compa_ratio?.toFixed(2) ?? '—'}</span></td>
                  <td className={td}>{r.band ? <MarketBar pay={r.ctc} band={r.band} market={r.market} /> : <span className="text-[11px] text-fg-muted">{r.ctc ? 'No match' : 'No package'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={(r) => { setImporting(false); showSuccess(`Imported ${r.saved} rows${r.error_count ? `, ${r.error_count} skipped` : ''}`); setSurveyId(r.survey.id); loadSurveys(); }} />}
    </Panel>
  );
}

/** Where the package sits in the market range, P10/P25 to P75/P90, with the median marked. */
function MarketBar({ pay, band, market }: { pay: number | null; band: MarketBand; market: BenchmarkDto['rows'][number]['market'] }) {
  if (!market || !pay) return null;
  const lo = market.p10 ?? market.p25 ?? market.p50 * 0.7;
  const hi = market.p90 ?? market.p75 ?? market.p50 * 1.3;
  const at = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100))}%`;
  return (
    <div className="w-40" title={BAND_LABEL[band]}>
      <div className="relative h-2 rounded-full bg-bg-subtle">
        {market.p25 !== null && market.p75 !== null && <div className="absolute inset-y-0 rounded-full bg-line" style={{ left: at(market.p25), right: `calc(100% - ${at(market.p75)})` }} />}
        <div className="absolute inset-y-[-2px] w-px bg-fg-muted" style={{ left: at(market.p50) }} />
        <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-[var(--tt-primary)]" style={{ left: at(pay) }} />
      </div>
      <span className="mt-1 block text-[11px] text-fg-muted">{BAND_LABEL[band]}</span>
    </div>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: (r: MarketImportDto) => void }) {
  const [name, setName] = React.useState('');
  const [source, setSource] = React.useState('');
  const [effective, setEffective] = React.useState('');
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<MarketImportDto | null>(null);
  const [busy, setBusy] = React.useState(false);

  const read = async (file: File | undefined) => {
    if (!file) return;
    const { rows: r, error } = csvRecords(await file.text(), ['job', 'p50']);
    setRows(r);
    setErrors(error ? { file: error } : {});
  };
  const save = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Name the survey';
    if (!effective) e.effective = 'Choose the date of the data';
    if (!rows.length) e.file = errors.file || 'Choose the CSV file';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await api.importMarketSurvey({ name: name.trim(), source: source.trim() || undefined, effective_date: effective, rows });
      if (r.error_count) setResult(r); else onDone(r);
    } catch (err) { setErrors({ form: messageOf(err) }); } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title="Import a market salary survey" maxWidthClassName="max-w-xl"
      footer={result ? <Btn variant="primary" onClick={() => onDone(result)}>Done</Btn> : <><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Import</Btn></>}>
      {result ? (
        <div className="space-y-2 text-sm text-fg">
          <p>Saved {result.saved} rows. {result.error_count} not loaded:</p>
          <ul className="max-h-60 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-fg-muted">{result.errors.map((x) => <li key={x.row}>Row {x.row + 2}: {x.message}</li>)}</ul>
        </div>
      ) : (
        <div className="space-y-3">
          <TextField label="Survey name" required value={name} onChange={setName} placeholder="Aon 2026 India Technology" maxLength={150} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Source (optional)" value={source} onChange={setSource} maxLength={150} />
            <TextField label="Data as of" type="date" required value={effective} onChange={setEffective} error={errors.effective} />
          </div>
          <p className="rounded-lg bg-bg-subtle p-2 font-mono text-xs text-fg">job, level, location, p10, p25, p50, p75, p90</p>
          <p className="text-xs text-fg-muted">Annual amounts. <b>job</b> is matched with the designation (else the role name), <b>level</b> with the grade name or code, <b>location</b> with the work state. Only job and p50 are required.</p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => read(e.target.files?.[0])} className="block w-full text-sm text-fg" />
          {rows.length > 0 && <p className="text-xs text-fg-muted">{rows.length} rows read.</p>}
          {errors.file && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.file}</p>}
          {errors.form && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
        </div>
      )}
    </Dialog>
  );
}
