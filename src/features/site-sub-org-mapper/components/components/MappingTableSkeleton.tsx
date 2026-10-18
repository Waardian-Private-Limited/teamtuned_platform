'use client';

const headerClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60';
const cellClass = 'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4';

export function MappingTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full overflow-hidden animate-pulse">
      {/* Mobile skeleton cards (< md) */}
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="space-y-3 p-4">
            <div className="space-y-1.5">
              <div className="h-4 rounded bg-bg-subtle" style={{ width: `${120 + (r % 3) * 40}px` }} />
              <div className="h-3 rounded bg-bg-subtle/70" style={{ width: `${90 + (r % 2) * 40}px` }} />
            </div>
            <div className="h-3.5 w-40 rounded bg-bg-subtle/70" />
            <div className="h-3 w-24 rounded bg-bg-subtle/70" />
          </div>
        ))}
      </div>

      {/* Desktop & tablet table skeleton (>= md) */}
      <table className="hidden w-full border-collapse md:table">
        <thead className="border-b border-line bg-bg-subtle/95">
          <tr>
            <th className={`${headerClass} w-[42%]`}>Site</th>
            <th className={headerClass}>Sub-organization</th>
            <th className={`${headerClass} w-36 lg:w-40 2xl:w-48`}>Added on</th>
            <th className={`${headerClass} w-20 text-right lg:w-24 2xl:w-28`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="h-14 2xl:h-16">
              <td className={cellClass}>
                <div className="h-3.5 rounded bg-bg-subtle 2xl:h-4" style={{ width: `${110 + (r % 3) * 35}px` }} />
                <div className="mt-1.5 h-2.5 rounded bg-bg-subtle/70 2xl:h-3" style={{ width: `${70 + (r % 2) * 30}px` }} />
              </td>
              <td className={cellClass}>
                <div className="h-3 rounded bg-bg-subtle 2xl:h-3.5" style={{ width: `${120 + (r % 2) * 30}px` }} />
              </td>
              <td className={cellClass}>
                <div className="h-3 w-20 rounded bg-bg-subtle 2xl:h-3.5" />
              </td>
              <td className={cellClass}>
                <div className="flex items-center justify-end">
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
