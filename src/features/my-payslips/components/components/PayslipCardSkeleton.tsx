export function PayslipCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-line bg-surface p-4">
          <div className="h-4 w-28 rounded bg-bg-subtle" />
          <div className="mt-2 h-3 w-40 rounded bg-bg-subtle" />
          <div className="mt-5 h-7 w-32 rounded bg-bg-subtle" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-3 rounded bg-bg-subtle" />
            <div className="h-3 rounded bg-bg-subtle" />
            <div className="h-3 rounded bg-bg-subtle" />
            <div className="h-3 rounded bg-bg-subtle" />
          </div>
          <div className="mt-5 h-9 rounded-lg bg-bg-subtle" />
        </div>
      ))}
    </>
  );
}
