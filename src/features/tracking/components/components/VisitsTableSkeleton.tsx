'use client';

export function VisitsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full overflow-hidden animate-pulse">
      {/* Mobile Skeleton Cards (< md) */}
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 rounded bg-bg-subtle" style={{ width: `${120 + (r % 3) * 30}px` }} />
                <div className="h-3 rounded bg-bg-subtle/70" style={{ width: '80px' }} />
              </div>
              <div className="h-5 w-16 rounded-full bg-bg-subtle" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="h-3 rounded bg-bg-subtle/70 w-20" />
              <div className="h-3.5 rounded bg-bg-subtle w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop & Tablet Table Skeleton (>= md) */}
      <table className="hidden md:table w-full border-collapse">
        <thead className="border-b border-line bg-bg-subtle/95">
          <tr>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Date
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Employee
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Vehicle
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Distance
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Amount
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Status
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Flags
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="h-12">
              <td className="px-3.5 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '70px' }} />
              </td>
              <td className="px-3.5 py-2.5">
                <div className="h-3.5 rounded bg-bg-subtle" style={{ width: `${110 + (r % 3) * 35}px` }} />
                <div className="mt-1 h-2.5 rounded bg-bg-subtle/70" style={{ width: '50px' }} />
              </td>
              <td className="px-3.5 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '55px' }} />
              </td>
              <td className="px-3.5 py-2.5">
                <div className="h-3.5 rounded bg-bg-subtle" style={{ width: '45px' }} />
              </td>
              <td className="px-3.5 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '50px' }} />
              </td>
              <td className="px-3.5 py-2.5">
                <div className="h-5 w-18 rounded-full bg-bg-subtle" />
              </td>
              <td className="px-3.5 py-2.5">
                <div className="h-4 w-12 rounded-full bg-bg-subtle" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
