'use client';

import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_KEY, monthLabel, shiftMonth } from '../../utils/format';

interface MonthStepperProps {
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
}

const stepClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 2xl:h-10 2xl:w-10';

export function MonthStepper({ value, onChange, disabled }: MonthStepperProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <div className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-line bg-surface 2xl:h-10">
      <button type="button" aria-label="Previous month" disabled={disabled} onClick={() => onChange(shiftMonth(value, -1))} className={stepClass}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="relative flex items-center border-x border-line">
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className="inline-flex h-full min-w-[9.5rem] items-center justify-center gap-2 px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm 2xl:text-base"
        >
          <CalendarDays className="h-3.5 w-3.5 text-fg-muted" />
          {monthLabel(value)}
        </button>
        <input
          ref={inputRef}
          type="month"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          onChange={(e) => MONTH_KEY.test(e.target.value) && onChange(e.target.value)}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </div>
      <button type="button" aria-label="Next month" disabled={disabled} onClick={() => onChange(shiftMonth(value, 1))} className={stepClass}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
