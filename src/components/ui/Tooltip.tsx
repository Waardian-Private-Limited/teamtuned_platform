'use client';

import React from 'react';
import { cx } from '@/theme/tokens';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  if (!content) return <>{children}</>;

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <div className={cx('group/tooltip relative inline-flex', className)}>
      {children}
      <div
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-[11px] font-medium text-bg shadow-md',
          'opacity-0 transition-all duration-150 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 scale-95 group-hover/tooltip:scale-100',
          sideClasses[side]
        )}
      >
        {content}
      </div>
    </div>
  );
}
