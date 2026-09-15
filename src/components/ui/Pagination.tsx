'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx, text } from '@/theme/tokens';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

function pageButtonClass(active: boolean) {
  return cx(
    'rounded-[var(--tt-radius-sm)] px-2 py-1 text-xs transition-colors',
    active
      ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]'
      : 'border border-line text-fg-muted hover:bg-bg-subtle'
  );
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  startPage = Math.max(1, Math.min(startPage, endPage - maxVisible + 1));
  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className={text.caption}>
        Showing <span className="font-medium text-fg">{start}</span>
        {'–'}
        <span className="font-medium text-fg">{end}</span> of{' '}
        <span className="font-medium text-fg">{totalItems}</span>
      </p>
      {/* flex-wrap: the page-number row never forces horizontal scroll on a
          narrow phone — it wraps to a second line instead. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-[var(--tt-radius-sm)] border border-line bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-[var(--tt-primary)]"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="rounded-[var(--tt-radius-sm)] border border-line p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {startPage > 1 && (
            <>
              <button type="button" onClick={() => onPageChange(1)} className={pageButtonClass(currentPage === 1)}>
                1
              </button>
              {startPage > 2 && <span className="px-1 text-fg-subtle">…</span>}
            </>
          )}
          {pages.map((p) => (
            <button key={p} type="button" onClick={() => onPageChange(p)} className={pageButtonClass(p === currentPage)}>
              {p}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-1 text-fg-subtle">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className={pageButtonClass(currentPage === totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="rounded-[var(--tt-radius-sm)] border border-line p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
