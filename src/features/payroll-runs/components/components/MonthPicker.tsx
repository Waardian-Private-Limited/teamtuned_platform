import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthText, shiftMonth } from '../../utils/format';
import { IconButton } from './controls';

export function MonthPicker({ month, current, onChange }: { month: string; current: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <IconButton label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </IconButton>
      <span className="min-w-[9.5rem] text-center text-sm font-bold text-fg sm:text-base">{monthText(month)}</span>
      <IconButton label="Next month" onClick={() => onChange(shiftMonth(month, 1))} disabled={month >= shiftMonth(current, 1)}>
        <ChevronRight className="h-4 w-4" />
      </IconButton>
      {month !== current && (
        <button
          type="button"
          onClick={() => onChange(current)}
          className="ml-0.5 h-9 rounded-lg border border-line px-3 text-xs font-bold text-fg transition-colors hover:bg-bg-subtle"
        >
          This month
        </button>
      )}
    </div>
  );
}
