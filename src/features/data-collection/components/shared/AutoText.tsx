'use client';

import { useLayoutEffect, useRef } from 'react';
import { inputCls } from './Ui';

/**
 * A text box that grows to show all of its text on as many lines as it needs. Enter does not add a line
 * (labels and options are one value), the text just wraps.
 */
export function AutoText({ value, onChange, placeholder, ariaLabel, multiline = false, className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string; multiline?: boolean; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(40, el.scrollHeight + 2)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(multiline ? e.target.value : e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => { if (!multiline && e.key === 'Enter') e.preventDefault(); }}
      className={`${inputCls()} !h-auto min-h-10 resize-none overflow-hidden whitespace-pre-wrap break-words py-2 leading-snug ${className}`}
    />
  );
}
