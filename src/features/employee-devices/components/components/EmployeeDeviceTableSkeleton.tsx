'use client';

export function EmployeeDeviceTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full animate-pulse overflow-hidden">
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="space-y-2.5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 rounded bg-bg-subtle" style={{ width: `${120 + (r % 3) * 40}px` }} />
                <div className="h-3 rounded bg-bg-subtle/70" style={{ width: `${150 + (r % 2) * 50}px` }} />
              </div>
              <div className="h-5 w-20 rounded-md bg-bg-subtle" />
            </div>
            <div className="h-3 w-40 rounded bg-bg-subtle/70" />
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <div className="h-10 border-b border-line bg-bg-subtle/95" />
        <div className="divide-y divide-line/60">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex h-16 items-center gap-6 px-5">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded bg-bg-subtle" style={{ width: `${110 + (r % 3) * 35}px` }} />
                <div className="h-2.5 rounded bg-bg-subtle/70" style={{ width: `${160 + (r % 2) * 50}px` }} />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded bg-bg-subtle" style={{ width: `${100 + (r % 2) * 30}px` }} />
                <div className="h-2.5 w-20 rounded bg-bg-subtle/70" />
              </div>
              <div className="h-4 w-24 rounded bg-bg-subtle/70" />
              <div className="h-5 w-24 rounded-md bg-bg-subtle" />
              <div className="h-3 w-24 rounded bg-bg-subtle/70" />
              <div className="h-7 w-7 rounded-md bg-bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
