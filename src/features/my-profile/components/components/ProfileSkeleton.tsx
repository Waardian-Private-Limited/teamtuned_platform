function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-bg-subtle ${className}`} />;
}

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-bg-subtle" />
        <Bar className="h-4 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Bar className="h-3 w-24" />
            <Bar className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Loading profile">
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-20 w-20 rounded-full bg-bg-subtle sm:h-24 sm:w-24" />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Bar className="h-6 w-48" />
            <Bar className="h-3 w-32" />
            <div className="flex gap-2">
              <Bar className="h-5 w-16 rounded-full" />
              <Bar className="h-5 w-16 rounded-full" />
            </div>
            <Bar className="h-3 w-40" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
            <div className="h-9 w-9 rounded-lg bg-bg-subtle" />
            <div className="flex flex-col gap-2">
              <Bar className="h-3 w-16" />
              <Bar className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={2} />
        </div>
        <div className="flex flex-col gap-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
