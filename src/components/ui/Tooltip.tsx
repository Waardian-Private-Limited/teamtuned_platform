'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/theme/tokens';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'start' | 'end';
  className?: string;
}

const GAP = 6;
const EDGE = 8;

function place(anchor: DOMRect, tip: DOMRect, side: TooltipProps['side'], align: TooltipProps['align']) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let s = side;
  if (s === 'top' && anchor.top - tip.height - GAP < EDGE) s = 'bottom';
  else if (s === 'bottom' && anchor.bottom + tip.height + GAP > vh - EDGE) s = 'top';
  else if (s === 'left' && anchor.left - tip.width - GAP < EDGE) s = 'right';
  else if (s === 'right' && anchor.right + tip.width + GAP > vw - EDGE) s = 'left';

  let top;
  let left;
  if (s === 'top' || s === 'bottom') {
    top = s === 'top' ? anchor.top - tip.height - GAP : anchor.bottom + GAP;
    left = align === 'end' ? anchor.right - tip.width : align === 'start' ? anchor.left : anchor.left + anchor.width / 2 - tip.width / 2;
  } else {
    left = s === 'left' ? anchor.left - tip.width - GAP : anchor.right + GAP;
    top = align === 'end' ? anchor.bottom - tip.height : align === 'start' ? anchor.top : anchor.top + anchor.height / 2 - tip.height / 2;
  }
  return {
    top: Math.min(Math.max(EDGE, top), vh - tip.height - EDGE),
    left: Math.min(Math.max(EDGE, left), vw - tip.width - EDGE),
  };
}

export function Tooltip({ content, children, side = 'top', align = 'center', className }: TooltipProps) {
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tipRef.current) return;
    const update = () => {
      if (!anchorRef.current || !tipRef.current) return;
      setPos(place(anchorRef.current.getBoundingClientRect(), tipRef.current.getBoundingClientRect(), side, align));
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, side, align, content]);

  if (!content) return <>{children}</>;

  const show = () => setOpen(true);
  const hide = () => {
    setOpen(false);
    setPos(null);
  };

  return (
    <div
      ref={anchorRef}
      className={cx('relative inline-flex [&_button:disabled]:pointer-events-none', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 10050 }}
          className={cx(
            'pointer-events-none max-w-xs whitespace-normal rounded-md bg-fg px-2 py-1 text-[11px] font-medium text-bg shadow-md transition-opacity duration-150',
            pos ? 'opacity-100' : 'opacity-0'
          )}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}
