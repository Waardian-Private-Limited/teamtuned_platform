"use client";

import React from "react";
import * as api from "@/features/payroll-setup/api/payrollSetup.api";
import { TaxRatesStep } from "@/features/payroll-setup/components/tds/TaxRatesStep";
import { currentFinancialYear } from "@/features/payroll-setup/constants/payroll-setup.constants";

function fyOptions(configured: string[]): string[] {
    const current = currentFinancialYear();
    const start = Number(current.split("-")[0]);
    const window = [1, 0, -1, -2].map(
        (delta) => `${start + delta}-${String((start + delta + 1) % 100).padStart(2, "0")}`
    );
    return Array.from(new Set([...window, ...configured])).sort().reverse();
}

export default function SuperadminTaxRatesPage() {
    const [financialYear, setFinancialYear] = React.useState(currentFinancialYear());
    const [configuredYears, setConfiguredYears] = React.useState<string[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const loadYears = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const dto = await api.listTaxYears();
            setConfiguredYears(dto.financial_years || []);
        } catch {
            setConfiguredYears([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadYears();
    }, [loadYears]);

    const isConfigured = configuredYears.includes(financialYear);

    return (
        <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
                <div className="min-w-0">
                    <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Income Tax Rates</h1>
                    <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
                        Slabs, rebate and surcharge for every organization. Set once per financial year.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg outline-none focus:border-[var(--tt-primary)] 2xl:h-10 2xl:text-sm"
                    >
                        {fyOptions(configuredYears).map((fy) => (
                            <option key={fy} value={fy}>
                                FY {fy}
                                {configuredYears.includes(fy) ? "" : " — not configured"}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-surface p-3.5 shadow-xs sm:p-4 tt-scroll-hidden">
                {isLoading ? (
                    <div className="space-y-3">
                        <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />
                        <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />
                    </div>
                ) : (
                    <>
                        {!isConfigured && (
                            <p className="mb-3 text-[11px] leading-relaxed text-fg-muted">
                                Payroll refuses to compute TDS for a year with no rates rather than reuse another
                                year&apos;s law, so any payroll run including a TDS rule will stop until FY {financialYear}{" "}
                                is configured.
                            </p>
                        )}
                        <TaxRatesStep
                            financialYear={financialYear}
                            configuredYears={configuredYears}
                            onChanged={loadYears}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
