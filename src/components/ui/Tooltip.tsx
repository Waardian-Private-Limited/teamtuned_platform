'use client';

import React from 'react';
import { cx } from '@/theme/tokens';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'start' | 'end';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', align = 'center', className }: TooltipProps) {
  if (!content) return <>{children}</>;

  let positionClass = '';

  if (side === 'top' || side === 'bottom') {
    const vertical = side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';
    const horizontal =
      align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2';
    positionClass = `${vertical} ${horizontal}`;
  } else {
    const horizontal = side === 'left' ? 'right-full mr-1.5' : 'left-full ml-1.5';
    const vertical =
      align === 'end' ? 'bottom-0' : align === 'start' ? 'top-0' : 'top-1/2 -translate-y-1/2';
    positionClass = `${horizontal} ${vertical}`;
  }

  return (
    <div className={cx('group/tooltip relative inline-flex', className)}>
      {children}
      <div
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-[11px] font-medium text-bg shadow-md',
          'opacity-0 transition-all duration-150 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 scale-95 group-hover/tooltip:scale-100',
          positionClass
        )}
      >
        {content}
      </div>
    </div>
  );
}
