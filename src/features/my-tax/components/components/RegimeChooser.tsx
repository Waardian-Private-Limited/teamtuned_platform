import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Regime, RegimeComparison } from '../../types/myTax.model';
import { money } from '../../utils/format';
import { errorClass } from './TaxFields';

const REGIMES: Array<{ key: Regime; title: string; line: string }> = [
  { key: 'new', title: 'New regime', line: 'Lower rates, almost no deductions.' },
  { key: 'old', title: 'Old regime', line: 'Claim HRA, 80C, 80D and home loan.' },
];

export const REGIME_ANCHOR = 'tax-regime';

export function RegimeChooser({
  value,
  onChange,
  comparison,
  locked,
  disabled,
  error,
}: {
  value: Regime;
  onChange: (regime: Regime) => void;
  comparison: RegimeComparison | null;
  locked: boolean;
  /** Declaration window closed: shown, not changeable. */
  disabled?: boolean;
  error?: string;
}) {
  return (
    <section id={REGIME_ANCHOR} className="scroll-mt-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-sm font-bold text-fg sm:text-base">Tax regime</h2>
      <p className="mt-0.5 text-xs text-fg-muted">Estimates use what you last saved.</p>
      <div role="radiogroup" aria-label="Tax regime" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REGIMES.map((r) => {
          const selected = value === r.key;
          const side = comparison?.[r.key];
          const cheaper = comparison?.cheaper === r.key && comparison.saving > 0;
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked || disabled}
              onClick={() => onChange(r.key)}
              className={cx(
                'flex min-w-0 flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed',
                selected ? 'border-fg ring-1 ring-fg' : error ? 'border-[var(--tt-danger)]' : 'border-line hover:bg-bg-subtle',
                (locked || disabled) && !selected && 'opacity-50'
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-fg bg-fg text-fg-inverted' : 'border-line-strong'
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="text-sm font-bold text-fg">{r.title}</span>
                </span>
                {cheaper && (
                  <span className="shrink-0 rounded-full bg-fg px-2 py-0.5 text-[11px] font-semibold text-fg-inverted">
                    Saves {money(comparison!.saving)}
                  </span>
                )}
              </span>
              <span className="text-xs text-fg-muted">{r.line}</span>
              <span className="text-xs text-fg-muted">
                Estimated tax <span className="text-sm font-bold tabular-nums text-fg">{side ? money(side.annualTax) : '—'}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className={errorClass}>{error}</p>
      ) : locked ? (
        <p className="mt-2 text-xs text-fg-muted">
          Your regime is fixed for this year because TDS was already deducted. Ask payroll to change it.
        </p>
      ) : comparison?.cheaper === 'equal' ? (
        <p className="mt-2 text-xs text-fg-muted">Both regimes cost the same for you this year.</p>
      ) : null}
    </section>
  );
}
