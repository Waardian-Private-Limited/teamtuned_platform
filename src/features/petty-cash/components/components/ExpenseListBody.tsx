'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ILLUSTRATIONS } from '../../constants/petty-cash.constants';
import type { useExpenseList } from '../../hooks/useExpenseList';
import { ExpenseCardList } from './ExpenseCardList';
import { ExpenseTable, type ExpenseSelection } from './ExpenseTable';

type Illustration = (typeof ILLUSTRATIONS)[keyof typeof ILLUSTRATIONS];

interface Props {
  list: ReturnType<typeof useExpenseList>;
  href: (id: number) => string;
  selection?: ExpenseSelection;
  showSpender?: boolean;
  showInward?: boolean;
  /** The employee's own list: cards on every width. */
  cardsOnly?: boolean;
  audience?: 'hr' | 'me';
  /** Column sorting (off for the inward register, which the server orders). */
  sortable?: boolean;
  empty: { illustration: Illustration; title: string; description: string; action?: { label: string; onClick: () => void } };
  /** Rendered above the rows (e.g. the bulk bar). */
  children?: React.ReactNode;
}

/** The list card: loading skeleton, empty states, table (md+) or cards, and the pager. */
export function ExpenseListBody({ list, href, selection, showSpender = true, showInward, cardsOnly, audience = 'hr', sortable = true, empty, children }: Props) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
      {children}
      {list.error && (
        <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">
          {list.error}
        </p>
      )}
      {list.isInitialLoading ? (
        <div className="flex-1 overflow-hidden">
          <TableSkeleton rows={8} columns={6} />
        </div>
      ) : list.rows.length === 0 ? (
        <div className={cx('flex flex-1 flex-col items-center justify-center p-4 transition-opacity duration-200 sm:p-6', list.isFetching ? 'opacity-70' : 'opacity-100')}>
          {list.hasActiveFilters ? (
            <EmptyState illustration={ILLUSTRATIONS.search} title="No matching expenses" description="Nothing matches the current search or filters." action={{ label: 'Clear filters', onClick: list.clearFilters, variant: 'link' }} />
          ) : (
            <EmptyState illustration={empty.illustration} title={empty.title} description={empty.description} action={empty.action} />
          )}
        </div>
      ) : (
        <>
          {!cardsOnly && (
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <ExpenseTable rows={list.rows} sort={list.sort} onSort={sortable ? list.toggleSort : undefined} href={href} selection={selection} showSpender={showSpender} showInward={showInward} />
            </div>
          )}
          <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden', !cardsOnly && 'md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
            <ExpenseCardList rows={list.rows} href={href} showSpender={showSpender} audience={audience} />
          </div>
          <div className="border-t border-line bg-surface px-4 py-2.5">
            <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} pageSizeOptions={[25, 50, 100]} />
          </div>
        </>
      )}
    </div>
  );
}

/** The bar over a list with rows checked. Hidden on phones, where cards carry no checkboxes. */
export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="hidden flex-wrap items-center gap-2 border-b border-line bg-bg-subtle/60 px-4 py-2 md:flex">
      <span className="text-xs font-semibold text-fg sm:text-sm">{count} selected</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
        <button type="button" onClick={onClear} className="text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline">
          Clear
        </button>
      </div>
    </div>
  );
}
