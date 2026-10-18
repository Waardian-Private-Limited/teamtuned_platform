'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RotateCcw } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { cx } from '@/theme/tokens';
import { useRecruitmentAccess } from '../../shared/hooks/useRecruitmentAccess';
import { useRecruitmentBase } from '../../shared/hooks/useRecruitmentBase';
import { useRecruitmentOptions } from '../../shared/hooks/useRecruitmentOptions';
import type { Position } from '../../shared/types/recruitment.model';
import { usePositionList } from '../hooks/usePositionList';
import { usePositionStatusActions, type PositionStatusAction } from '../hooks/usePositionStatusActions';
import { PositionsToolbar } from './PositionsToolbar';
import { PositionCardList, PositionTable, PositionTableSkeleton } from './PositionTable';
import { ClosePositionDialog } from './ClosePositionDialog';

function EmptyPositions({ filtered, forbidden, canAdd, onAdd, onClear }: {
  filtered: boolean; forbidden: boolean; canAdd: boolean; onAdd: () => void; onClear: () => void;
}) {
  const title = forbidden ? 'No positions to show' : filtered ? 'No matching positions' : 'Open your first position';
  const description = forbidden
    ? 'You do not have recruitment access, and you are not the hiring manager of any position.'
    : filtered
      ? 'Nothing matches these filters. Try clearing them.'
      : 'A position is a job you are hiring for: its pipeline, interview plan and careers listing live here.';
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center lg:p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/vectors/employees.svg" alt="" width={960} height={667} className="mb-4 h-auto w-36 select-none object-contain sm:w-44 lg:w-52" />
      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-muted sm:text-sm">{description}</p>
      {!forbidden && (filtered ? (
        <button type="button" onClick={onClear} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">
          <RotateCcw className="h-3.5 w-3.5 text-fg-muted" />Clear filters
        </button>
      ) : canAdd && (
        <button type="button" onClick={onAdd} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] sm:text-sm">
          <Plus className="h-3.5 w-3.5" />New position
        </button>
      ))}
    </div>
  );
}

export function PositionsPage() {
  const access = useRecruitmentAccess();
  const base = useRecruitmentBase();
  const router = useRouter();
  // Hiring managers without RECRUIT_* only see their own positions.
  const list = usePositionList(!access.canView);
  const { options } = useRecruitmentOptions();
  const status = usePositionStatusActions(list.refetch);
  const [closing, setClosing] = React.useState<Position | null>(null);

  const departments = options.departments.map((d) => ({ value: d.id as number, label: d.name }));
  const onAdd = () => router.push(`${base}/positions/new`);
  const onStatus = (p: Position, action: PositionStatusAction) => {
    if (action === 'close') setClosing(p);
    else status.run(p, action);
  };
  const tableProps = { positions: list.positions, base, canManage: access.canManage, busyId: status.busyId, onStatus };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PositionsToolbar
        total={list.total}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        departments={departments}
        departmentId={list.departmentId}
        onDepartmentChange={list.setDepartmentId}
        mine={list.mine}
        onMineChange={list.setMine}
        canAdd={access.canManage}
        onAdd={onAdd}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden"><PositionTableSkeleton /></div>
        ) : list.positions.length === 0 ? (
          <EmptyPositions filtered={list.hasActiveFilters} forbidden={list.forbidden} canAdd={access.canManage} onAdd={onAdd} onClear={list.clearFilters} />
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity md:block', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <PositionTable {...tableProps} />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden transition-opacity md:hidden', list.isFetching ? 'opacity-75' : 'opacity-100')}>
              <PositionCardList {...tableProps} />
            </div>
            {list.total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={list.page}
                  totalPages={list.totalPages}
                  totalItems={list.total}
                  pageSize={list.pageSize}
                  onPageChange={list.setPage}
                  onPageSizeChange={list.setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ClosePositionDialog
        open={Boolean(closing)}
        title={closing?.title || ''}
        busy={status.busyId === closing?.id}
        onClose={() => setClosing(null)}
        onConfirm={async () => { if (closing && (await status.run(closing, 'close'))) setClosing(null); }}
      />
    </div>
  );
}
