'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, FieldLabel } from '@/components/ui/FormControls';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LABOUR_ILLUSTRATIONS as ILL, LABOUR_PAYABLE_PERMS } from '../../constants/labour.constants';
import { useContractorOptions, useLabourSites } from '../../hooks/useLabourLists';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { Payable, PayableContractor, PayableLine, PayableTotals } from '../../types/labour.types';
import { parseLabourError, placeError } from '../../utils/errors';
import { fmtDate, fmtDateTime, fmtMinutes, money, thisMonth, today } from '../../utils/format';
import { basisLabel, hajriLabel } from '../../utils/pay';
import { Block, DateFilter, EmptyPanel, FilterBar, FilterGrid, FormError, Gate, PageHeader, Pill, Stat, primaryBtn, secondaryBtn, selectCls, td, th, trCls } from '../shared/Primitives';

type Mode = 'month' | 'range';
interface Query { mode: Mode; month: string; from: string; to: string; siteId: number | null; contractorId: number | null }

/** What is owed to contractors for a period: attendance (hourly / hajri) priced with each day's rate plus approved measurements. */
export function PayablePage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_PAYABLE_PERMS)} what="the payable report"><PayableReport /></Gate>;
}

const periodOf = (q: Query): api.PayableQuery => (q.mode === 'month' ? { month: q.month } : { from: q.from, to: q.to });

function PayableReport() {
  const { sites, all, first, loaded } = useLabourSites();
  const contractors = useContractorOptions();
  const [q, setQ] = useState<Query>({ mode: 'month', month: thisMonth(), from: `${thisMonth()}-01`, to: today(), siteId: null, contractorId: null });
  const [data, setData] = useState<Payable | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const patch = (p: Partial<Query>) => setQ((x) => ({ ...x, ...p }));

  // A scoped supervisor sees one site at a time: default to their first so the server never asks for one.
  useEffect(() => {
    if (loaded && !all && q.siteId == null && first != null) setQ((x) => ({ ...x, siteId: first }));
  }, [loaded, all, first, q.siteId]);

  useEffect(() => {
    if (!loaded || (!all && q.siteId == null)) return;
    if (q.mode === 'month' ? !q.month : !q.from || !q.to) return;
    let off = false;
    setLoading(true);
    setError('');
    api.getPayable({ ...periodOf(q), siteId: q.siteId, contractorId: q.contractorId })
      .then((r) => { if (!off) setData(r); })
      .catch((e) => { if (!off) { setData(null); setError(parseLabourError(e).message); } })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [q, loaded, all]);

  const t = data?.totals;
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Payable" description="What is owed to contractors: attendance at each day’s rate (hourly or hajri) plus approved measurement entries. Computed live, nothing is stored.">
        <button type="button" className={secondaryBtn} onClick={() => setExporting(true)}><Download className="h-3.5 w-3.5" aria-hidden />Export</button>
      </PageHeader>
      <FilterBar>
        <SegmentedControl options={[{ value: 'month' as const, label: 'Month' }, { value: 'range' as const, label: 'Date range' }]} value={q.mode} onChange={(mode) => patch({ mode })} fitText />
        <FilterGrid>
          {q.mode === 'month' ? (
            <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
              Month<input type="month" value={q.month} max={thisMonth()} onChange={(e) => patch({ month: e.target.value })} className={cx(selectCls, 'min-w-0 flex-1 md:w-40')} />
            </label>
          ) : (
            <>
              <DateFilter label="From" value={q.from} onChange={(from) => patch({ from })} />
              <DateFilter label="To" value={q.to} onChange={(to) => patch({ to })} />
            </>
          )}
          <SearchableFilterDropdown label="Site" allLabel="All sites" hideAll={!all} value={q.siteId} options={sites} onChange={(siteId) => patch({ siteId })} className="md:w-44" />
          <SearchableFilterDropdown label="Contractor" allLabel="All contractors" value={q.contractorId} options={contractors} onChange={(contractorId) => patch({ contractorId })} className="md:w-48" />
        </FilterGrid>
      </FilterBar>

      {error && <FormError message={error} className="rounded-xl border border-line bg-surface px-4 py-3" />}
      {loading && !data ? <Block className="h-64 rounded-xl" /> : data && t && (
        <div className={cx('flex flex-col gap-3 transition-opacity', loading ? 'opacity-70' : '')}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat label="Hourly" value={money(t.hourlyAmount)} note={`${fmtMinutes(t.minutes)} worked · ${t.days} days`} />
            <Stat label="Hajri" value={money(t.hajriAmount)} note={`${hajriLabel(t.hajriUnits)} hajri`} />
            <Stat label="Measurement" value={money(t.measurementAmount)} note={`${t.measurementEntries} approved entr${t.measurementEntries === 1 ? 'y' : 'ies'}`} />
            <Stat label="Total payable" value={money(t.total)} note={`${t.contractors} contractor${t.contractors === 1 ? '' : 's'} · ${t.labourers} labour`} />
          </div>
          {t.noRateDays > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-[var(--tt-warning)]/40 bg-surface px-4 py-3 text-xs text-fg sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t.noRateDays} attended day{t.noRateDays === 1 ? '' : 's'} had no rate and are not paid. Set the contractor’s rates (or a personal rate) and they are counted on the next look.
            </p>
          )}
          <p className="text-[11px] text-fg-muted">{fmtDate(data.from)} – {fmtDate(data.to)} · worked out {fmtDateTime(data.generatedAt)}. Today’s open days count up to now; a past day with a missed OUT earns nothing until regularized.</p>

          {data.contractors.length === 0 ? (
            <EmptyPanel illustration={ILL.payable} title="Nothing payable in this period" text="No attendance with a rate and no approved measurements for these filters." />
          ) : (
            <section className="space-y-2" aria-label="By contractor">
              {data.contractors.map((c) => <ContractorBlock key={c.contractorId} c={c} defaultOpen={data.contractors.length === 1} />)}
            </section>
          )}

          {data.sites.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <h2 className="border-b border-line px-4 py-3 text-sm font-bold text-fg">By site</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-separate border-spacing-0">
                  <thead><tr><th className={th}>Site</th><Heads /></tr></thead>
                  <tbody>{data.sites.map((s) => <tr key={s.siteId} className={trCls}><td className={cx(td, 'font-semibold')}>{s.siteName}</td><Cells t={s.totals} /></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
      {exporting && <ExportDialog q={q} onClose={() => setExporting(false)} />}
    </div>
  );
}

function Heads() {
  return (
    <>
      <th className={cx(th, 'text-right')}>Days</th><th className={cx(th, 'text-right')}>Hours</th><th className={cx(th, 'text-right')}>Hourly</th>
      <th className={cx(th, 'text-right')}>Hajri</th><th className={cx(th, 'text-right')}>Hajri ₹</th><th className={cx(th, 'text-right')}>Measurement</th><th className={cx(th, 'text-right')}>Total</th>
    </>
  );
}
const num = cx(td, 'text-right tabular-nums');
function Cells({ t, bold }: { t: PayableTotals; bold?: boolean }) {
  return (
    <>
      <td className={num}>{t.days}{t.noRateDays > 0 && <span className="block text-[11px] text-fg-muted" title="Attended days with no rate (not paid)">{t.noRateDays} no rate</span>}</td>
      <td className={num}>{fmtMinutes(t.minutes)}</td>
      <td className={num}>{t.hourlyAmount ? money(t.hourlyAmount) : '—'}</td>
      <td className={num}>{t.hajriUnits ? hajriLabel(t.hajriUnits) : '—'}</td>
      <td className={num}>{t.hajriAmount ? money(t.hajriAmount) : '—'}</td>
      <td className={num}>{t.measurementAmount ? money(t.measurementAmount) : '—'}{t.measurementEntries > 0 && <span className="block text-[11px] text-fg-muted">{t.measurementEntries} entr{t.measurementEntries === 1 ? 'y' : 'ies'}</span>}</td>
      <td className={cx(num, bold ? 'font-extrabold' : 'font-bold')}>{money(t.total)}</td>
    </>
  );
}

function ContractorBlock({ c, defaultOpen }: { c: PayableContractor; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const name = (l: PayableLine) => (l.labourerId ? l.name : 'Gang (whole contractor team)');
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-subtle/60">
        <span className="flex min-w-0 items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-fg">{c.contractorName}</span>
            <span className="block text-[11px] text-fg-muted">
              {c.totals.labourers} labour · {[c.totals.hourlyAmount ? `hourly ${money(c.totals.hourlyAmount)}` : '', c.totals.hajriAmount ? `hajri ${money(c.totals.hajriAmount)}` : '', c.totals.measurementAmount ? `measurement ${money(c.totals.measurementAmount)}` : ''].filter(Boolean).join(' · ') || 'nothing earned'}
              {c.totals.noRateDays > 0 ? ` · ${c.totals.noRateDays} days without a rate` : ''}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-base font-extrabold tabular-nums text-fg">{money(c.totals.total)}</span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[52rem] border-separate border-spacing-0">
            <thead><tr><th className={th}>Labourer</th><th className={th}>Site</th><th className={th}>Pay</th><Heads /></tr></thead>
            <tbody>
              {c.lines.map((l, i) => (
                <tr key={`${l.labourerId ?? 'gang'}-${l.siteId}-${i}`} className={trCls}>
                  <td className={td}><div className="font-semibold text-fg">{name(l)}</div>{l.code && <div className="text-[11px] text-fg-muted">{l.code}</div>}</td>
                  <td className={td}>{l.siteName || '—'}</td>
                  <td className={td}><Pill tone={l.payBasis ? 'neutral' : 'warn'}>{basisLabel(l.payBasis)}</Pill></td>
                  <Cells t={l} />
                </tr>
              ))}
              <tr className="bg-bg-subtle/60"><td className={cx(td, 'font-bold')} colSpan={3}>Subtotal</td><Cells t={c.totals} bold /></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExportDialog({ q, onClose }: { q: Query; onClose: () => void }) {
  const { track } = useDownloadCenter();
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      track(await api.exportPayable({ format, ...periodOf(q), siteId: q.siteId, contractorId: q.contractorId }));
      showSuccess('The payable report is being prepared. Find it in Downloads.');
      onClose();
    } catch (err) {
      setError(placeError(err).error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Export payable" maxWidthClassName="max-w-md"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={submit}>{busy ? 'Queuing…' : 'Export'}</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">{q.mode === 'month' ? `Month ${q.month}` : `${fmtDate(q.from)} – ${fmtDate(q.to)}`} with the filters on the page. The Excel file adds a sheet of every approved measurement entry.</p>
        <div>
          <FieldLabel label="Format" />
          <div className="flex gap-2">
            <Chip active={format === 'excel'} onClick={() => setFormat('excel')}>Excel (.xlsx)</Chip>
            <Chip active={format === 'pdf'} onClick={() => setFormat('pdf')}>PDF (.pdf)</Chip>
          </div>
        </div>
        <FormError message={error} />
      </div>
    </Dialog>
  );
}
