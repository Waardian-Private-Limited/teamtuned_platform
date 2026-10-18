'use client';

const headerClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60';

const COLUMNS = ['Employee', 'Department', 'Primary site', 'Sites', 'Other locs', ''];

export function EmployeeSiteTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full overflow-hidden animate-pulse">
      {/* Mobile skeleton cards (< md) */}
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 rounded bg-bg-subtle" style={{ width: `${120 + (r % 3) * 40}px` }} />
                <div className="h-3 rounded bg-bg-subtle/70" style={{ width: `${160 + (r % 2) * 40}px` }} />
              </div>
              <div className="h-8 w-16 rounded-lg bg-bg-subtle" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3.5 w-24 rounded bg-bg-subtle/70" />
              <div className="h-3.5 w-14 rounded bg-bg-subtle/60" />
              <div className="h-3.5 w-24 rounded bg-bg-subtle/60" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop and tablet table skeleton (>= md) */}
      <table className="hidden w-full border-collapse md:table">
        <thead className="border-b border-line bg-bg-subtle/95">
          <tr>
            {COLUMNS.map((c, i) => (
              <th key={i} className={headerClass}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-line/60">
              <td className="px-3.5 py-3 sm:px-4 lg:px-5 2xl:px-6">
                <div className="h-4 rounded bg-bg-subtle" style={{ width: `${130 + (r % 3) * 30}px` }} />
                <div className="mt-1.5 h-3 rounded bg-bg-subtle/70" style={{ width: `${90 + (r % 2) * 30}px` }} />
              </td>
              <td className="px-3.5 py-3 sm:px-4 lg:px-5 2xl:px-6"><div className="h-3.5 w-24 rounded bg-bg-subtle/70" /></td>
              <td className="px-3.5 py-3 sm:px-4 lg:px-5 2xl:px-6"><div className="h-3.5 w-28 rounded bg-bg-subtle/70" /></td>
              <td className="px-3.5 py-3 sm:px-4 lg:px-5 2xl:px-6"><div className="h-3.5 w-6 rounded bg-bg-subtle/60" /></td>
              <td className="px-3.5 py-3 sm:px-4 lg:px-5 2xl:px-6"><div className="h-3.5 w-6 rounded bg-bg-subtle/60" /></td>
              <td className="px-3.5 py-3 sm:px-4 lg:px-5 2xl:px-6"><div className="ml-auto h-8 w-16 rounded-lg bg-bg-subtle" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
