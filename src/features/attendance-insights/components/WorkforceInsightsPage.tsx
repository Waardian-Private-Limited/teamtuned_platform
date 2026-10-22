'use client';

import { RefreshCw } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useInsights } from '../hooks/useInsights';
import { InsightsToolbar } from './InsightsToolbar';
import { InsightBoards, InsightKpis, TrendPanel } from './InsightsPanels';
import { InsightsTable } from './InsightsTable';
import { PersonDrawer } from './PersonDrawer';

/**
 * Workforce insights for audits and performance reviews: over a week, month, quarter or year,
 * how consistently people attend, their overtime, night overtime and work on days off, by site,
 * department or person. Any person opens their own review sheet.
 */
export function WorkforceInsightsPage() {
  const s = useInsights();
  const d = s.data;
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Workforce insights</h1>
          <p className="text-sm text-fg-muted">Consistency, overtime, night OT and days off worked, for audits and reviews</p>
        </div>
        {s.refreshing && d && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg-muted">
            <RefreshCw className={cx('h-3.5 w-3.5 animate-spin')} /> Updating
          </span>
        )}
      </header>

      <InsightsToolbar filters={s.filters} options={s.options} data={d} onChange={s.update} onReset={s.reset} narrowed={s.narrowed} />
      {s.error && <p className="text-sm text-[var(--tt-danger)]">{s.error}</p>}

      <InsightKpis totals={d?.totals ?? null} headcount={d?.headcount ?? 0} formula={d?.formula ?? null} loading={s.loading} />
      <TrendPanel trend={d?.trend ?? null} unit={d?.unit ?? null} loading={s.loading} />
      <InsightBoards boards={d?.boards ?? null} loading={s.loading} onOpen={s.openPerson} />
      <InsightsTable data={d} group={s.group} onGroup={s.setGroup} sort={s.sort} onSort={s.toggleSort} searchInput={s.searchInput} onSearch={s.setSearchInput}
        page={s.page} onPage={s.setPage} loading={s.loading} refreshing={s.refreshing} onOpen={s.openPerson} allEmployees={s.allEmployees} />

      <PersonDrawer open={s.personId !== null} onClose={s.closePerson} data={s.person} error={s.personError} />
    </div>
  );
}
