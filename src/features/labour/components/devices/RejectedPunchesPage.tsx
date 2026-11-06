'use client';

import React, { useRef, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/labour.api';
import { LABOUR_ILLUSTRATIONS as ILL } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { useLabourSites } from '../../hooks/useLabourLists';
import { usePagedList } from '../../hooks/usePagedList';
import type { RejectReason, RejectedPunch, RejectedPunchPage } from '../../types/labour.types';
import { fmtDateTime, today } from '../../utils/format';
import { DateFilter, FilterBar, FilterGrid, FilterSelect, Gate, ListShell, PageHeader, Pill, SearchBox, secondaryBtn, td, th } from '../shared/Primitives';

const REASONS: Array<{ value: RejectReason; label: string; tone: 'bad' | 'warn' | 'neutral'; todo: string }> = [
  { value: 'other_site', label: 'Registered at another site', tone: 'warn', todo: 'Import them to this site, or they punch at their own site' },
  { value: 'not_recognized', label: 'Face not recognised', tone: 'neutral', todo: 'Register the face again; add the attendance if they worked' },
  { value: 'contractor_inactive', label: 'Contractor inactive', tone: 'bad', todo: 'Activate the contractor' },
  { value: 'labour_inactive', label: 'Labourer inactive', tone: 'bad', todo: 'Activate the labourer' },
];
const META = Object.fromEntries(REASONS.map((r) => [r.value, r])) as Record<RejectReason, (typeof REASONS)[number]>;

interface Filters extends Record<string, unknown> { search?: string; from: string; to: string; reason: string; siteId: string }
const INITIAL: Filters = { from: today(), to: today(), reason: '', siteId: '' };
const EXPORT_PAGE = 500;
const EXPORT_MAX = 5000;

const timeOnly = (iso: string) => fmtDateTime(iso).replace(/^.*?(\d{1,2}:\d{2}(\s?[AP]M)?)$/i, '$1');

const csvCell = (v: unknown) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

/** Refused machine punches (org admins): who was turned away, where and why, with the photo, to pass on to the people concerned. */
export function RejectedPunchesPage() {
  const { enabled } = useLabourAccess();
  const { isOrgAdmin } = usePermission();
  return <Gate enabled={enabled} allowed={isOrgAdmin} what="rejected punches"><RejectedPunches /></Gate>;
}

function RejectedPunches() {
  const { sites } = useLabourSites();
  const [summary, setSummary] = useState<RejectedPunchPage['summary'] | null>(null);
  const [summaryTruncated, setTruncated] = useState(false);
  const [photo, setPhoto] = useState<RejectedPunch | null>(null);
  const [exporting, setExporting] = useState(false);
  const query = (f: Filters) => ({ from: f.from || undefined, to: f.to || undefined, reason: f.reason || undefined, siteId: f.siteId ? Number(f.siteId) : undefined, search: f.search || undefined });
  const list = usePagedList<RejectedPunch, Filters>(
    (f, page, pageSize) => api.listRejectedPunches({ ...query(f), page, pageSize }).then((r) => { setSummary(r.summary); setTruncated(!!r.truncated); return r; }),
    INITIAL, { pageSize: 50 },
  );
  const f = list.filters;
  const filtersRef = useRef(f);
  filtersRef.current = f;

  /** Every row of the current filters (not only this page), oldest first, for the file or the message. */
  const everything = async () => {
    const out: RejectedPunch[] = [];
    for (let page = 1; out.length < EXPORT_MAX; page += 1) {
      const r = await api.listRejectedPunches({ ...query(filtersRef.current), page, pageSize: EXPORT_PAGE });
      out.push(...r.items);
      if (page >= r.pages) break;
    }
    return out.reverse();
  };

  const download = async () => {
    setExporting(true);
    try {
      const rows = await everything();
      const head = ['First try', 'Last try', 'Tries', 'Name', 'Code', 'Phone', 'Reason', 'Tried at site', 'Site guessed', 'Machine', 'Registered at', 'Contractor', 'What to do'];
      const body = rows.map((r) => [fmtDateTime(r.firstAt), fmtDateTime(r.at), r.tries, r.labourer?.name || 'Unknown face', r.labourer?.code || '', r.labourer?.phone || '', r.reason ? META[r.reason].label : r.message,
        r.site.name || '', r.siteGuessed ? 'yes' : '', r.deviceName || '', r.labourer?.registeredSite || '', r.labourer?.contractorName || '', r.reason ? META[r.reason].todo : ''].map(csvCell).join(','));
      const blob = new Blob([[head.join(','), ...body].join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rejected-punches-${f.from}${f.to !== f.from ? `-to-${f.to}` : ''}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setExporting(false);
    }
  };

  /** One line per person and reason, ready to paste in a message to the site. */
  const copy = async () => {
    setExporting(true);
    try {
      const rows = await everything();
      const people = new Map<string, { r: RejectedPunch; n: number; last: string }>();
      for (const r of rows) {
        const key = `${r.labourer?.id ?? `face-${r.id}`}|${r.reason}|${r.site.id}`;
        const g = people.get(key);
        if (g) { g.n += r.tries; g.last = r.at; } else people.set(key, { r, n: r.tries, last: r.at });
      }
      const lines = [...people.values()].filter((g) => g.r.labourer).map(({ r, n, last }) => {
        const who = `${r.labourer!.name} (${r.labourer!.code})`;
        const why = r.reason ? META[r.reason].label : r.message;
        const where = r.reason === 'other_site' ? ` at ${r.site.name || 'a site'}; registered at ${r.labourer!.registeredSite || 'another site'}` : ` at ${r.site.name || 'a site'}`;
        return `• ${who}: ${why}${where}, ${n} ${n === 1 ? 'try' : 'tries'}, last ${fmtDateTime(last)}. ${r.reason ? META[r.reason].todo : ''}`;
      });
      const title = `Rejected labour punches ${f.from}${f.to !== f.from ? ` to ${f.to}` : ''}`;
      await navigator.clipboard.writeText([title, ...lines].join('\n'));
      showSuccess(`Copied ${lines.length} ${lines.length === 1 ? 'person' : 'people'}`);
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader title="Rejected punches" description="People a machine turned away, why, and what to do. Share it with the sites and contractors concerned.">
        <div className="flex gap-2">
          <button type="button" className={secondaryBtn} disabled={exporting || list.total === 0} onClick={copy}><Copy className="h-3.5 w-3.5" /> Copy list</button>
          <button type="button" className={secondaryBtn} disabled={exporting || list.total === 0} onClick={download}><Download className="h-3.5 w-3.5" /> Download CSV</button>
        </div>
      </PageHeader>

      {summary && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <button key={r.value} type="button" onClick={() => list.update({ reason: f.reason === r.value ? '' : r.value })}
              className={cx('rounded-xl border bg-surface p-3 text-left transition-colors hover:bg-bg-subtle', f.reason === r.value ? 'border-fg' : 'border-line')}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{r.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-fg">{summary[r.value].people} <span className="text-xs font-normal text-fg-muted">{r.value === 'not_recognized' ? 'known people' : 'people'}, {summary[r.value].tries} tries</span></p>
            </button>
          ))}
        </div>
      )}

      {list.total > 0 && summaryTruncated && <p className="rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs text-fg-muted">Too many tries in this range to show them all: pick fewer days.</p>}
      <FilterBar>
        <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Search name, code, phone…" />
        <FilterGrid>
          <DateFilter label="From" value={f.from} onChange={(from) => list.update({ from, to: f.to < from ? from : f.to })} />
          <DateFilter label="To" value={f.to} onChange={(to) => list.update({ to })} />
          <FilterSelect label="Reason" value={f.reason} onChange={(reason) => list.update({ reason })} anyLabel="All reasons" options={REASONS.map((r) => ({ value: r.value, label: r.label }))} />
          <FilterSelect label="Site" value={f.siteId} onChange={(siteId) => list.update({ siteId })} anyLabel="All sites" options={sites.map((s) => ({ value: String(s.value), label: s.label }))} />
        </FilterGrid>
      </FilterBar>

      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={list.hasActiveFilters} onClear={list.clear}
        emptyIllustration={ILL.events} emptyTitle="No rejected punches" emptyText="No machine turned anyone away in this range." minH="min-h-[260px]"
        page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr><th className={th}>Time</th><th className={th}>Labourer</th><th className={th}>Reason</th><th className={th}>Tried at</th><th className={cx(th, 'hidden lg:table-cell')}>Registered at</th><th className={cx(th, 'hidden xl:table-cell')}>What to do</th><th className={th}><span className="sr-only">Photo</span></th></tr>
            </thead>
            <tbody>
              {list.rows.map((r) => (
                <tr key={r.id}>
                  <td className={cx(td, 'whitespace-nowrap text-fg-muted')}>
                    {r.tries > 1 ? <>{fmtDateTime(r.firstAt)} – {timeOnly(r.at)}<div className="text-[11px]">{r.tries} tries</div></> : fmtDateTime(r.at)}
                  </td>
                  <td className={td}>
                    {r.labourer ? (
                      <>
                        <div className="font-semibold text-fg">{r.labourer.name}</div>
                        <div className="text-[11px] text-fg-muted">{[r.labourer.code, r.labourer.phone].filter(Boolean).join(' · ')}</div>
                      </>
                    ) : <span className="text-fg-muted">Unknown face</span>}
                  </td>
                  <td className={td}>{r.reason ? <Pill tone={META[r.reason].tone}>{META[r.reason].label}</Pill> : <span className="text-fg-muted">{r.message}</span>}</td>
                  <td className={td}>
                    <div className="text-fg">{r.site.name || '-'}</div>
                    <div className="text-[11px] text-fg-muted">{r.siteGuessed ? 'Site guessed (from the face server)' : r.deviceName}</div>
                  </td>
                  <td className={cx(td, 'hidden lg:table-cell')}>
                    {r.labourer ? (
                      <>
                        <div className="text-fg">{r.labourer.registeredSite || '-'}</div>
                        <div className="text-[11px] text-fg-muted">{r.labourer.contractorName}{r.labourer.contractorStatus && r.labourer.contractorStatus !== 'active' ? ` (${r.labourer.contractorStatus})` : ''}</div>
                      </>
                    ) : '-'}
                  </td>
                  <td className={cx(td, 'hidden max-w-[16rem] text-fg-muted xl:table-cell')}>{r.reason ? META[r.reason].todo : ''}</td>
                  <td className={cx(td, 'w-14')}>
                    {r.imageUrl && (
                      <button type="button" onClick={() => setPhoto(r)} aria-label="Open the photo" className="h-11 w-11 overflow-hidden rounded-lg border border-line bg-bg-subtle">
                        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link */}
                        <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListShell>

      {photo && (
        <Dialog open onClose={() => setPhoto(null)} title={`${photo.labourer?.name || 'Unknown face'} · ${fmtDateTime(photo.at)}`} maxWidthClassName="max-w-xl">
          <div className="flex items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link (refresh the list if it has expired) */}
            <img src={photo.imageUrl || ''} alt={photo.message} className="max-h-[70vh] w-full object-contain" />
          </div>
          <p className="mt-2 text-xs text-fg-muted">{photo.message}{photo.site.name ? ` · ${photo.site.name}` : ''}</p>
        </Dialog>
      )}
    </div>
  );
}
