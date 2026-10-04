'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function MonthHeader({ year, month, onPrev, onNext, onToday }: Props) {
  const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1)));
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-fg sm:text-lg">{label}</h2>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="!h-9 !w-9 !px-0" onClick={onPrev} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="secondary" className="!h-9 !w-auto !px-3 !text-[13px]" onClick={onToday}>Today</Button>
        <Button variant="secondary" className="!h-9 !w-9 !px-0" onClick={onNext} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
