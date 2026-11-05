'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel } from '@/components/ui/FormControls';
import type { Category, ContractorTrade } from '../../types/labour.types';

const box = (on: boolean | 'some') => cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong');

/**
 * The categories / subcategories a contractor supplies. Ticking a category takes the whole category (its subcategories,
 * including ones added later); ticking single subcategories takes only those. Nothing ticked = every trade.
 */
export function TradePicker({ categories, value, onChange, error }: { categories: Category[]; value: ContractorTrade[]; onChange: (v: ContractorTrade[]) => void; error?: string }) {
  const shown = categories.filter((c) => c.isActive || value.some((t) => t.categoryId === c.id));
  const whole = (id: number) => value.some((t) => t.categoryId === id && t.subcategoryId === null);
  const subOn = (c: number, s: number) => whole(c) || value.some((t) => t.categoryId === c && t.subcategoryId === s);
  const others = (c: number) => value.filter((t) => t.categoryId !== c);

  const toggleCategory = (c: Category) => onChange(whole(c.id) || value.some((t) => t.categoryId === c.id) ? others(c.id) : [...others(c.id), { categoryId: c.id, subcategoryId: null }]);
  const toggleSub = (c: Category, s: number) => {
    const subs = c.subcategories.filter((x) => x.isActive || subOn(c.id, x.id)).map((x) => x.id);
    const picked = subs.filter((x) => subOn(c.id, x));
    const next = picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s];
    // Every subcategory ticked = the whole category.
    const mine: ContractorTrade[] = next.length && next.length === subs.length ? [{ categoryId: c.id, subcategoryId: null }] : next.map((x) => ({ categoryId: c.id, subcategoryId: x }));
    onChange([...others(c.id), ...mine]);
  };

  return (
    <div>
      <FieldLabel label="Trades" aside={<span className="text-[11px] text-fg-muted">{value.length ? `${value.length} selected` : 'Every trade'}</span>} />
      <div className={cx('max-h-72 overflow-auto tt-scroll-hidden rounded-lg border bg-surface p-1', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
        {shown.length === 0 && <p className="px-3 py-3 text-xs text-fg-muted">No categories yet. Add them under Categories.</p>}
        {shown.map((c) => {
          const subs = c.subcategories.filter((s) => s.isActive || subOn(c.id, s.id));
          const any = value.some((t) => t.categoryId === c.id);
          const state: boolean | 'some' = whole(c.id) ? true : any ? 'some' : false;
          return (
            <div key={c.id} className="py-0.5">
              <button type="button" onClick={() => toggleCategory(c)} aria-pressed={state === true} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-bg-subtle sm:text-sm">
                <span className={box(state)}>{state === true ? <Check className="h-3 w-3" aria-hidden /> : state === 'some' ? <Minus className="h-3 w-3" aria-hidden /> : null}</span>
                <span className="truncate">{c.name}</span>
                {subs.length > 0 && <span className="ml-auto shrink-0 text-[11px] font-normal text-fg-muted">{whole(c.id) ? 'All subcategories' : `${subs.filter((s) => subOn(c.id, s.id)).length} of ${subs.length}`}</span>}
              </button>
              {subs.length > 0 && (
                <div className="ml-6">
                  {subs.map((s) => {
                    const on = subOn(c.id, s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleSub(c, s.id)} aria-pressed={on} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1 text-left text-xs hover:bg-bg-subtle sm:text-sm">
                        <span className={box(on)}>{on && <Check className="h-3 w-3" aria-hidden />}</span>
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-1 text-[11px] text-[var(--tt-danger)]">{error}</p> : <p className="mt-1 text-[11px] text-fg-muted">Tick a category for all of it, or single subcategories. Leave all empty if the contractor supplies every trade.</p>}
    </div>
  );
}
