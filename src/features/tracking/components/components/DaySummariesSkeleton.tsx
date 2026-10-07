'use client';

export function DaySummariesSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full overflow-hidden animate-pulse">
      {/* Mobile Skeleton Cards (< md) */}
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 rounded bg-bg-subtle" style={{ width: `${130 + (r % 3) * 35}px` }} />
                <div className="h-3 rounded bg-bg-subtle/70" style={{ width: `${80 + (r % 2) * 20}px` }} />
              </div>
              <div className="h-5 w-16 rounded-full bg-bg-subtle" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="h-3 rounded bg-bg-subtle/70" />
              <div className="h-3 rounded bg-bg-subtle/70" />
              <div className="h-3 rounded bg-bg-subtle/70" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop & Tablet Table Skeleton (>= md) */}
      <table className="hidden md:table w-full border-collapse">
        <thead className="border-b border-line bg-bg-subtle/95">
          <tr>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Employee
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Distance
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              At site
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Away
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              At site after check-in
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Away after check-in
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Moving
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Standing
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              No signal / off
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted/60">
              Flags
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="h-12">
              <td className="px-3 py-2.5">
                <div className="h-3.5 rounded bg-bg-subtle" style={{ width: `${110 + (r % 3) * 30}px` }} />
                <div className="mt-1 h-2.5 rounded bg-bg-subtle/70" style={{ width: '60px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: `${40 + (r % 2) * 20}px` }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '45px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '45px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3.5 rounded bg-bg-subtle" style={{ width: '50px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '50px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '40px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '40px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: '55px' }} />
              </td>
              <td className="px-3 py-2.5">
                <div className="h-4 w-14 rounded-full bg-bg-subtle" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
