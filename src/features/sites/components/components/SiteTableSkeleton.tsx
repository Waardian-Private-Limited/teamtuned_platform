'use client';

export function SiteTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden animate-pulse">
      {/* Mobile Skeleton Cards (< md) */}
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 rounded bg-bg-subtle" style={{ width: `${120 + (r % 3) * 40}px` }} />
                <div className="h-3 rounded bg-bg-subtle/70" style={{ width: `${180 + (r % 2) * 50}px` }} />
              </div>
              <div className="h-5 w-16 rounded-full bg-bg-subtle" />
            </div>
            <div className="h-3.5 w-28 rounded bg-bg-subtle/60" />
            <div className="flex justify-end gap-1.5 pt-1">
              <div className="h-7 w-7 rounded-md bg-bg-subtle" />
              <div className="h-7 w-7 rounded-md bg-bg-subtle" />
              <div className="h-7 w-7 rounded-md bg-bg-subtle" />
              <div className="h-7 w-7 rounded-md bg-bg-subtle" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop & Tablet Table Skeleton (>= md) */}
      <table className="hidden md:table w-full min-w-[680px] lg:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className="px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60 first:rounded-tl-xl border-b border-line">
              Site
            </th>
            <th className="px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60 border-b border-line">
              Location
            </th>
            <th className="px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 w-40 sm:w-48 lg:w-56 2xl:w-64 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60 border-b border-line">
              Budget
            </th>
            <th className="px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 w-28 sm:w-32 lg:w-36 2xl:w-44 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60 border-b border-line">
              Status
            </th>
            <th className="px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 w-28 sm:w-32 lg:w-36 2xl:w-44 text-right text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted/60 last:rounded-tr-xl border-b border-line">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="h-14 2xl:h-16">
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="h-3.5 2xl:h-4 rounded bg-bg-subtle" style={{ width: `${110 + (r % 3) * 35}px` }} />
                <div className="mt-1.5 h-2.5 2xl:h-3 rounded bg-bg-subtle/70" style={{ width: `${160 + (r % 2) * 60}px` }} />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="h-3 2xl:h-3.5 rounded bg-bg-subtle" style={{ width: `${80 + (r % 2) * 30}px` }} />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="h-3 2xl:h-3.5 rounded bg-bg-subtle w-24" />
                <div className="mt-1.5 h-1.5 w-28 rounded-full bg-bg-subtle/70" />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="h-5 2xl:h-6 w-16 2xl:w-20 rounded-full bg-bg-subtle" />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-md bg-bg-subtle" />
                  <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-md bg-bg-subtle" />
                  <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-md bg-bg-subtle" />
                  <div className="h-7 w-7 2xl:h-8 2xl:w-8 rounded-md bg-bg-subtle" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
