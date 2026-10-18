/** Empty state inside a detail tab. */
export function DetailEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-4 py-12 text-center">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-muted">{description}</p>}
    </div>
  );
}
