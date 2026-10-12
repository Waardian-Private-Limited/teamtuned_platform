'use client';

import Image from 'next/image';
import { RotateCcw } from 'lucide-react';

interface PayrollEmptyStateProps {
  image: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: 'reset' };
}

export function PayrollEmptyState({ image, title, description, action }: PayrollEmptyStateProps) {
  return (
    <div className="tt-fade-in flex flex-1 flex-col items-center justify-center p-6 text-center sm:p-8 2xl:p-12">
      <div className="mb-4 w-32 select-none sm:w-40 md:w-44 2xl:w-56">
        <Image src={image} alt="" aria-hidden width={480} height={400} className="h-auto w-full object-contain" />
      </div>
      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-muted sm:text-sm">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:text-sm"
        >
          {action.icon === 'reset' && <RotateCcw className="h-3.5 w-3.5 text-fg-muted" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
