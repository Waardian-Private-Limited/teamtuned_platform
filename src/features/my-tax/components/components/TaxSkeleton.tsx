function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-bg-subtle ${className}`} />;
}

export function TaxSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Loading income tax">
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <Bar className="h-6 w-56" />
        <Bar className="mt-2 h-3 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
            <div className="h-9 w-9 rounded-lg bg-bg-subtle" />
            <div className="flex flex-col gap-2">
              <Bar className="h-3 w-24" />
              <Bar className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="h-40 rounded-xl border border-line bg-surface" />
          <div className="h-56 rounded-xl border border-line bg-surface" />
        </div>
        <div className="h-72 rounded-xl border border-line bg-surface" />
      </div>
    </div>
  );
}
