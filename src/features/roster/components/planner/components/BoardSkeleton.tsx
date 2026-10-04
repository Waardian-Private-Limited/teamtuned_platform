export function BoardSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface" aria-busy="true">
      {label && (
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-fg border-t-transparent" />
          <p className="text-sm font-semibold text-fg">{label}</p>
        </div>
      )}
      <div className="animate-pulse space-y-1.5 p-3">
        {Array.from({ length: 12 }).map((_, r) => (
          <div key={r} className="flex items-center gap-1.5">
            <div className="h-7 w-40 shrink-0 rounded bg-bg-subtle" />
            {Array.from({ length: 21 }).map((__, c) => (
              <div key={c} className={`h-7 w-9 shrink-0 rounded bg-bg-subtle ${(r + c) % 5 === 0 ? 'opacity-40' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
