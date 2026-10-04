'use client';

import { cx } from '@/theme/tokens';
import type { Holiday } from '../types/holidays';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Twelve small month grids; a day with a holiday is filled (half holidays show half).
export function HolidayCalendar({ year, holidays, onPick }: { year: number; holidays: Holiday[]; onPick: (h: Holiday) => void }) {
  const byDate = new Map<string, Holiday[]>();
  for (const h of holidays) byDate.set(h.date, [...(byDate.get(h.date) ?? []), h]);

  return (
    <div className="grid gap-4 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {MONTHS.map((label, m) => {
        const first = new Date(Date.UTC(year, m, 1)).getUTCDay();
        const days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
        const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
        return (
          <div key={label} className="rounded-lg border border-line p-3">
            <p className="mb-2 text-sm font-bold text-fg">{label}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-fg-subtle">{d}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const hs = byDate.get(key);
                const h = hs?.[0];
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!h}
                    title={hs?.map((x) => x.name).join(', ')}
                    onClick={() => h && onPick(h)}
                    className={cx(
                      'relative h-7 rounded-md text-xs',
                      h ? (h.status === 'inactive' ? 'border border-dashed border-line-strong text-fg-muted' : 'bg-[var(--tt-primary)] font-semibold text-[var(--tt-on-primary)]') : 'text-fg'
                    )}
                  >
                    {d}
                    {h && h.session !== 'full' && <span className={cx('absolute inset-x-0 h-1/2 bg-surface/50', h.session === 'first_half' ? 'bottom-0' : 'top-0')} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
