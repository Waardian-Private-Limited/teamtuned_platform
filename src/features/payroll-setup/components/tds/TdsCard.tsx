import React from 'react';

/** A titled card on the Income Tax (TDS) pages. */
export function TdsCard({
  title,
  intent,
  action,
  children,
}: {
  title: string;
  intent: string;
  /** Top-right control, e.g. a financial-year select. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-2 p-3.5 sm:p-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-fg">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted sm:text-xs">{intent}</p>
        </div>
        {action}
      </header>
      <div className="border-t border-line px-3.5 pb-4 pt-3.5 sm:px-4">{children}</div>
    </section>
  );
}
