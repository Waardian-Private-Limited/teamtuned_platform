'use client';

import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/theme/tokens';

/**
 * One card of the declaration form, styled like My profile's sections. With `prompt`
 * it starts folded behind that question until opened (or `defaultOpen`).
 */
export function TaxSection({
  title,
  icon: Icon,
  description,
  prompt,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: LucideIcon;
  description?: ReactNode;
  prompt?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || !prompt);
  const header = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-fg sm:text-base">{open || !prompt ? title : prompt}</span>
        {description && (open || !prompt) && <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>}
      </span>
    </>
  );

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      {prompt ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-start gap-2 text-left"
        >
          {header}
          <ChevronDown className={cx('mt-2 h-4 w-4 shrink-0 text-fg-muted transition-transform', open && 'rotate-180')} />
        </button>
      ) : (
        <header className="flex items-start gap-2">{header}</header>
      )}
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}
