'use client';

const headerClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60 border-b border-line';
const cellClass =
  'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4';

export function SubOrganizationTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden animate-pulse">
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 rounded bg-bg-subtle" style={{ width: `${130 + (r % 3) * 40}px` }} />
                <div className="h-3 rounded bg-bg-subtle/70" style={{ width: `${90 + (r % 2) * 30}px` }} />
              </div>
              <div className="h-5 w-16 rounded-full bg-bg-subtle" />
            </div>
            <div className="h-3.5 w-36 rounded bg-bg-subtle/60" />
            <div className="flex gap-1.5 pt-1">
              <div className="h-7 w-24 rounded-lg bg-bg-subtle" />
              <div className="h-7 w-16 rounded-lg bg-bg-subtle" />
            </div>
          </div>
        ))}
      </div>

      <table className="hidden w-full min-w-[680px] border-separate border-spacing-0 md:table md:min-w-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={`${headerClass} first:rounded-tl-xl`}>Entity</th>
            <th className={`${headerClass} w-32 sm:w-36 lg:w-40`}>Code</th>
            <th className={`${headerClass} hidden lg:table-cell`}>GST</th>
            <th className={`${headerClass} w-28 sm:w-32`}>Status</th>
            <th className={`${headerClass} w-28 sm:w-32 text-right last:rounded-tr-xl`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="h-14 2xl:h-16">
              <td className={cellClass}>
                <div className="h-3.5 rounded bg-bg-subtle 2xl:h-4" style={{ width: `${120 + (r % 3) * 35}px` }} />
                <div className="mt-1.5 h-2.5 rounded bg-bg-subtle/70 2xl:h-3" style={{ width: `${170 + (r % 2) * 55}px` }} />
              </td>
              <td className={cellClass}>
                <div className="h-3 rounded bg-bg-subtle 2xl:h-3.5" style={{ width: `${70 + (r % 2) * 25}px` }} />
              </td>
              <td className={`${cellClass} hidden lg:table-cell`}>
                <div className="h-3 w-28 rounded bg-bg-subtle/70 2xl:h-3.5" />
              </td>
              <td className={cellClass}>
                <div className="h-5 w-16 rounded-full bg-bg-subtle 2xl:h-6 2xl:w-20" />
              </td>
              <td className={`${cellClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <div className="h-7 w-7 rounded-md bg-bg-subtle 2xl:h-8 2xl:w-8" />
                  <div className="h-7 w-7 rounded-md bg-bg-subtle 2xl:h-8 2xl:w-8" />
                  <div className="h-7 w-7 rounded-md bg-bg-subtle 2xl:h-8 2xl:w-8" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
