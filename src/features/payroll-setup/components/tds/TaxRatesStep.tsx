'use client';

import React from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/payrollSetup.api';
import type { TaxConfigDto } from '../../types/payroll-setup.dto';
import { messageOf } from '../../utils/asyncAction';
import { formatCurrency } from '../../utils/validators';

const REGIME_LABEL: Record<string, string> = { old: 'Old regime', new: 'New regime' };
const AGE_BAND_LABEL: Record<string, string> = {
  default: 'Below 60',
  senior: 'Senior (60-79)',
  super_senior: 'Super senior (80+)',
};

function slabRange(slabs: Array<[number | null, number]>, index: number): string {
  const from = index === 0 ? 0 : (slabs[index - 1][0] ?? 0);
  const to = slabs[index][0];
  if (to === null) return `Above ${formatCurrency(from)}`;
  return `${formatCurrency(from)} – ${formatCurrency(to)}`;
}

/**
 * Income-tax rates for the year.
 *
 * Rates are national and shared by every tenant, so only a superadmin may change them.
 * Everyone else sees them read-only — an HR user still needs to know what is applied
 * and, when a year is missing, who to ask.
 */
export function TaxRatesStep({
  financialYear,
  configuredYears,
  onChanged,
}: {
  financialYear: string;
  configuredYears: string[];
  onChanged: () => void;
}) {
  const { role } = useAuth();
  const canEditRates = String(role || '').toLowerCase() === 'superadmin';

  const [configs, setConfigs] = React.useState<TaxConfigDto[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [copySource, setCopySource] = React.useState('');
  const [isCopying, setIsCopying] = React.useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const dto = await api.listTaxConfig(financialYear);
      setConfigs(dto.configs);
    } catch (err) {
      setError(messageOf(err));
      setConfigs(null);
    } finally {
      setIsLoading(false);
    }
  }, [financialYear]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    setCopySource(configuredYears.find((y) => y !== financialYear) ?? '');
  }, [configuredYears, financialYear]);

  const copyForward = async () => {
    if (!copySource) return;
    setIsCopying(true);
    try {
      await api.copyTaxConfig(financialYear, copySource);
      showSuccess(`Rates copied from FY ${copySource}`);
      await load();
      onChanged();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />;
  }

  return (
    <div className="space-y-3">
      {error && <Alert message={error} tone="error" />}

      {configs && configs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {configs.map((config) => (
              <div key={config.regime} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-fg">{REGIME_LABEL[config.regime]}</span>
                  {config.is_provisional && (
                    <span className="rounded-full bg-[var(--tt-danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-danger)]">
                      Provisional
                    </span>
                  )}
                </div>

                <dl className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                  <dt className="text-fg-subtle">Standard deduction</dt>
                  <dd className="tabular-nums text-fg">{formatCurrency(config.standard_deduction)}</dd>
                  <dt className="text-fg-subtle">Cess</dt>
                  <dd className="tabular-nums text-fg">{(config.cess_rate * 100).toFixed(0)}%</dd>
                  {config.rebate && (
                    <>
                      <dt className="text-fg-subtle">Rebate 87A</dt>
                      <dd className="tabular-nums text-fg">
                        up to {formatCurrency(config.rebate.max)} below {formatCurrency(config.rebate.limit)}
                      </dd>
                    </>
                  )}
                  {config.surcharge && config.surcharge.bands.length > 0 && (
                    <>
                      <dt className="text-fg-subtle">Surcharge</dt>
                      <dd className="tabular-nums text-fg">
                        {config.surcharge.bands.map((b) => `${(b.rate * 100).toFixed(0)}%`).join(' / ')}
                        {config.surcharge.cap !== null && ` (max ${(config.surcharge.cap * 100).toFixed(0)}%)`}
                      </dd>
                    </>
                  )}
                </dl>

                {Object.entries(config.slabs_by_age).map(([band, slabs]) => (
                  <div key={band} className="mt-2.5">
                    {Object.keys(config.slabs_by_age).length > 1 && (
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                        {AGE_BAND_LABEL[band] ?? band}
                      </div>
                    )}
                    <div className="overflow-hidden rounded-md border border-line">
                      {slabs.map((slab, i) => (
                        <div
                          key={i}
                          className={cx(
                            'flex items-center justify-between gap-2 px-2 py-1 text-[11px]',
                            i % 2 === 1 && 'bg-bg-subtle/50'
                          )}
                        >
                          <span className="tabular-nums text-fg-muted">{slabRange(slabs, i)}</span>
                          <span className="font-semibold tabular-nums text-fg">{slab[1]}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {configs.some((c) => c.is_provisional) && (
            <p className="text-[11px] font-medium text-[var(--tt-danger)]">
              These rates are marked provisional — they were carried forward from another year. Check them against the
              Budget before relying on the TDS they produce.
            </p>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-[var(--tt-danger)] bg-surface p-3">
          <p className="text-xs font-semibold text-fg">No rates configured for FY {financialYear}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
            Slab rates, the 87A rebate and surcharge bands change with each Budget, so every financial year has to be
            set up once. Until this year is configured, any payroll run that includes a TDS rule will stop with an
            error rather than deduct against the wrong year&apos;s rates.
            {!canEditRates && ' Ask your TeamTuned administrator to add them.'}
          </p>
        </div>
      )}

      {canEditRates && configuredYears.length > 0 && (
        <div className="rounded-lg border border-line bg-bg-subtle/50 p-3">
          <div className="text-[11px] font-semibold text-fg">Start FY {financialYear} from an existing year</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
            Copies every rate across and marks them provisional. Correct whatever the Budget changed, then clear the
            provisional flag.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={copySource}
              onChange={(e) => setCopySource(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg outline-none focus:border-[var(--tt-primary)] sm:max-w-[200px]"
            >
              {configuredYears.filter((y) => y !== financialYear).map((year) => (
                <option key={year} value={year}>FY {year}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={copyForward}
              disabled={!copySource || isCopying}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
            >
              {isCopying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
              <span>Copy to FY {financialYear}</span>
            </button>
          </div>
        </div>
      )}

      {!canEditRates && (
        <p className="text-[11px] text-fg-muted">
          Tax rates are set by TeamTuned for all organisations and cannot be edited here.
        </p>
      )}
    </div>
  );
}
