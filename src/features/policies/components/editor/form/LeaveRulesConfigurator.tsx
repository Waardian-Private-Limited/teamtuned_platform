'use client';

import React from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { LeaveTypeOption } from './SchemaForm';

export interface LeaveRuleConfig {
  leaveTypeId: number;
  entitlement?: {
    mode?: 'yearly' | 'monthly' | 'none' | 'unlimited';
    daysPerYear?: number;
    daysPerMonth?: number;
    creditTiming?: 'start_of_period' | 'end_of_period';
    rounding?: 'none' | 'up' | 'down' | 'nearest_half';
    maxBalance?: number;
  };
  leaveYear?: {
    basis?: 'calendar' | 'financial' | 'joining_anniversary' | 'custom';
    startMonth?: number;
    startDay?: number;
  };
  proration?: {
    joiningMonth?: 'prorate' | 'full' | 'none' | 'half_if_joined_after_cutoff';
    joiningCutoffDay?: number;
    exitMonth?: 'prorate' | 'full' | 'none' | 'half_if_left_before_cutoff';
    exitCutoffDay?: number;
  };
  carryForward?: {
    enabled?: boolean;
    maxDays?: number;
    expiryMonths?: number;
  };
  request?: {
    minDays?: number;
    maxDays?: number;
    maxRequestsPerMonth?: number;
    noticeDays?: number;
    maxBackdatedDays?: number;
    allowHalfDay?: boolean;
    attachmentAfterDays?: number;
  };
  whenExhausted?: {
    strategy?: 'reject' | 'loss_of_pay';
  };
  encashOnExit?: {
    enabled?: boolean;
    maxDays?: number;
    rateBasis?: 'basic' | 'basic_plus_da' | 'gross';
  };
}

interface LeaveRulesConfiguratorProps {
  rules: LeaveRuleConfig[];
  onChange: (rules: LeaveRuleConfig[]) => void;
  leaveTypeOptions?: LeaveTypeOption[];
}

export function createDefaultLeaveRule(leaveTypeId: number, daysPerYear = 12): LeaveRuleConfig {
  return {
    leaveTypeId,
    entitlement: {
      mode: 'yearly',
      daysPerYear,
      daysPerMonth: 1,
      creditTiming: 'start_of_period',
      rounding: 'none',
      maxBalance: 0,
    },
    leaveYear: {
      basis: 'calendar',
      startMonth: 1,
      startDay: 1,
    },
    proration: {
      joiningMonth: 'prorate',
      joiningCutoffDay: 15,
      exitMonth: 'prorate',
      exitCutoffDay: 15,
    },
    carryForward: {
      enabled: false,
      maxDays: 0,
      expiryMonths: 0,
    },
    request: {
      minDays: 0.5,
      maxDays: 0,
      maxRequestsPerMonth: 0,
      noticeDays: 0,
      maxBackdatedDays: 0,
      allowHalfDay: true,
      attachmentAfterDays: 0,
    },
    whenExhausted: {
      strategy: 'reject',
    },
    encashOnExit: {
      enabled: false,
      maxDays: 0,
      rateBasis: 'basic',
    },
  };
}

/**
 * High-Affordance Emerald Switch
 */
function VisualSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        checked ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'
      )}
    >
      <span
        className={cx(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export function LeaveRulesConfigurator({
  rules = [],
  onChange,
  leaveTypeOptions = [],
}: LeaveRulesConfiguratorProps) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  // Map known leave types
  const rulesByTypeId = React.useMemo(() => {
    const map = new Map<number, LeaveRuleConfig>();
    rules.forEach((r) => {
      if (r.leaveTypeId) map.set(r.leaveTypeId, r);
    });
    return map;
  }, [rules]);

  // All display cards: include known catalog options plus any custom rule configured
  const displayItems = React.useMemo(() => {
    const items: Array<{ id: number; name: string; isConfigured: boolean; rule?: LeaveRuleConfig }> = [];
    const seenIds = new Set<number>();

    // 1. Catalog items
    leaveTypeOptions.forEach((lt) => {
      seenIds.add(lt.id);
      const rule = rulesByTypeId.get(lt.id);
      items.push({
        id: lt.id,
        name: lt.name,
        isConfigured: Boolean(rule),
        rule,
      });
    });

    // 2. Custom rules not in catalog
    rules.forEach((r) => {
      if (!seenIds.has(r.leaveTypeId)) {
        items.push({
          id: r.leaveTypeId,
          name: `Custom Leave (${r.leaveTypeId || 'New'})`,
          isConfigured: true,
          rule: r,
        });
      }
    });

    return items;
  }, [leaveTypeOptions, rulesByTypeId, rules]);

  // Toggle enabling/disabling a leave type
  const toggleLeaveType = (id: number, currentName: string) => {
    const isConfigured = rulesByTypeId.has(id);
    if (isConfigured) {
      onChange(rules.filter((r) => r.leaveTypeId !== id));
      if (expandedId === id) setExpandedId(null);
    } else {
      const lower = currentName.toLowerCase();
      let defaultDays = 12;
      if (lower.includes('sick')) defaultDays = 10;
      else if (lower.includes('casual')) defaultDays = 12;
      else if (lower.includes('earned') || lower.includes('privilege') || lower.includes('annual')) defaultDays = 15;
      else if (lower.includes('maternity')) defaultDays = 182;
      else if (lower.includes('paternity')) defaultDays = 15;

      const newRule = createDefaultLeaveRule(id, defaultDays);
      onChange([...rules, newRule]);
    }
  };

  const updateRule = (id: number, updater: (prev: LeaveRuleConfig) => LeaveRuleConfig) => {
    const next = rules.map((r) => {
      if (r.leaveTypeId === id) {
        return updater(r);
      }
      return r;
    });
    onChange(next);
  };

  // Quick preset loader
  const loadStandardPresets = () => {
    if (leaveTypeOptions.length === 0) return;
    const nextRules: LeaveRuleConfig[] = leaveTypeOptions.map((lt) => {
      const lower = lt.name.toLowerCase();
      let days = 12;
      if (lower.includes('sick')) days = 10;
      else if (lower.includes('earned') || lower.includes('privilege') || lower.includes('annual')) days = 15;
      return createDefaultLeaveRule(lt.id, days);
    });
    onChange(nextRules);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar / Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
        <div>
          <h4 className="text-xs font-bold text-fg sm:text-sm">Leave Entitlements & Policies</h4>
          <p className="text-[11px] text-fg-muted sm:text-xs">
            Toggle which leaves employees on this policy can take, set quotas, and customize carry-forward rules.
          </p>
        </div>

        {leaveTypeOptions.length > 0 && (
          <button
            type="button"
            onClick={loadStandardPresets}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-bg-subtle px-3 text-xs font-semibold text-fg transition-all hover:bg-surface hover:border-line-strong hover:shadow-xs active:scale-95"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Enable Standard Allotted Leaves</span>
          </button>
        )}
      </div>

      {/* Empty State if no leave types exist in catalog */}
      {displayItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line p-8 text-center bg-surface">
          <Calendar className="h-8 w-8 text-fg-subtle mb-2" />
          <h5 className="text-xs font-semibold text-fg sm:text-sm">No Leave Types Found</h5>
          <p className="mt-1 max-w-sm text-[11px] text-fg-muted sm:text-xs">
            Your organization doesn’t have leave types set up yet. Add a custom rule below or configure leave types in your organization settings.
          </p>
          <button
            type="button"
            onClick={() => {
              const newId = (rules.length > 0 ? Math.max(...rules.map((r) => r.leaveTypeId || 0)) : 0) + 1;
              onChange([...rules, createDefaultLeaveRule(newId, 12)]);
            }}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-colors hover:bg-[var(--tt-primary-hover)]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Custom Leave Rule
          </button>
        </div>
      )}

      {/* Leave Type Cards List */}
      <div className="flex flex-col gap-3">
        {displayItems.map(({ id, name, isConfigured, rule }) => {
          const isExpanded = expandedId === id;
          const daysPerYear = rule?.entitlement?.daysPerYear ?? 12;
          const accrualMode = rule?.entitlement?.mode ?? 'yearly';
          const carryForward = rule?.carryForward?.enabled ?? false;
          const maxCarryDays = rule?.carryForward?.maxDays ?? 0;

          return (
            <div
              key={id}
              className={cx(
                'rounded-xl border transition-all duration-200 overflow-hidden',
                isConfigured
                  ? 'border-emerald-500/40 bg-surface shadow-xs ring-1 ring-emerald-500/10'
                  : 'border-line bg-surface/60 opacity-80 hover:opacity-100 hover:border-line-strong'
              )}
            >
              {/* Card Header Row */}
              <div
                onClick={() => toggleLeaveType(id, name)}
                className="flex cursor-pointer items-center justify-between gap-3 p-3.5 transition-colors hover:bg-bg-subtle/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-bold text-xs transition-all',
                      isConfigured
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-line bg-bg-subtle text-fg-subtle'
                    )}
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-fg sm:text-[13px] truncate">{name}</span>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          isConfigured
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-fg-subtle border border-line'
                        )}
                      >
                        {isConfigured ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-fg-muted truncate">
                      {isConfigured
                        ? `${daysPerYear} days/yr · ${accrualMode === 'monthly' ? 'Monthly Accrual' : 'Credited Upfront'} ${carryForward ? '· Carry-Forward Active' : ''}`
                        : 'Not allotted on this policy (click to enable)'}
                    </p>
                  </div>
                </div>

                {/* Right Action: Switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <VisualSwitch
                    checked={isConfigured}
                    onChange={() => toggleLeaveType(id, name)}
                    label={`Enable ${name}`}
                  />
                </div>
              </div>

              {/* Active Configuration Panel */}
              {isConfigured && rule && (
                <div className="border-t border-line/60 bg-bg-subtle/30 p-3.5 flex flex-col gap-3">
                  {/* Row 1: Quota & Accrual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                    {/* Days Quota Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-fg">Annual Quota (Days)</label>
                        <span className="text-[10px] text-fg-muted font-medium">days/year</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateRule(id, (r) => ({
                              ...r,
                              entitlement: {
                                ...r.entitlement,
                                daysPerYear: Math.max(0, (r.entitlement?.daysPerYear ?? 12) - 1),
                              },
                            }))
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg hover:bg-bg-subtle transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={daysPerYear}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            updateRule(id, (r) => ({
                              ...r,
                              entitlement: {
                                ...r.entitlement,
                                daysPerYear: val,
                              },
                            }));
                          }}
                          className="h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-center text-xs font-bold text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateRule(id, (r) => ({
                              ...r,
                              entitlement: {
                                ...r.entitlement,
                                daysPerYear: (r.entitlement?.daysPerYear ?? 12) + 1,
                              },
                            }))
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg hover:bg-bg-subtle transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Quick Quota Pills */}
                      <div className="mt-1.5 flex items-center gap-1">
                        {[6, 10, 12, 15, 18, 24].map((pill) => (
                          <button
                            key={pill}
                            type="button"
                            onClick={() =>
                              updateRule(id, (r) => ({
                                ...r,
                                entitlement: { ...r.entitlement, daysPerYear: pill },
                              }))
                            }
                            className={cx(
                              'rounded px-1.5 py-0.5 text-[10px] font-semibold transition-all',
                              daysPerYear === pill
                                ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] shadow-xs'
                                : 'bg-surface border border-line text-fg-muted hover:text-fg hover:border-line-strong'
                            )}
                          >
                            {pill}d
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accrual Mode */}
                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1.5">Credit Mode</label>
                      <select
                        value={accrualMode}
                        onChange={(e) => {
                          const mode = e.target.value as 'yearly' | 'monthly' | 'unlimited';
                          updateRule(id, (r) => ({
                            ...r,
                            entitlement: { ...r.entitlement, mode },
                          }));
                        }}
                        className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
                      >
                        <option value="yearly">Credited Yearly (Upfront)</option>
                        <option value="monthly">Accrued Monthly</option>
                        <option value="unlimited">Unlimited (No balance tracking)</option>
                      </select>
                      <p className="mt-1 text-[10px] text-fg-subtle">
                        {accrualMode === 'yearly'
                          ? 'All allotted days added at start of leave year'
                          : accrualMode === 'monthly'
                          ? `Earns ~${(daysPerYear / 12).toFixed(1)} days each month`
                          : 'Employees take as needed without balance caps'}
                      </p>
                    </div>

                    {/* Carry Forward Toggle & Days */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-fg">Carry Forward</label>
                        <span
                          className={cx(
                            'text-[10px] font-bold uppercase tracking-wider',
                            carryForward ? 'text-emerald-600' : 'text-fg-subtle'
                          )}
                        >
                          {carryForward ? 'Active' : 'Off'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            updateRule(id, (r) => ({
                              ...r,
                              carryForward: {
                                ...r.carryForward,
                                enabled: !carryForward,
                              },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              updateRule(id, (r) => ({
                                ...r,
                                carryForward: {
                                  ...r.carryForward,
                                  enabled: !carryForward,
                                },
                              }));
                            }
                          }}
                          className={cx(
                            'flex h-9 flex-1 cursor-pointer select-none items-center justify-between gap-2 rounded-lg border px-3 text-xs font-medium transition-all',
                            carryForward
                              ? 'border-emerald-500/40 bg-emerald-500/5 text-fg'
                              : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle'
                          )}
                        >
                          <span>{carryForward ? 'Carry Unused' : 'Expires at Year End'}</span>
                          <VisualSwitch
                            checked={carryForward}
                            onChange={(val) =>
                              updateRule(id, (r) => ({
                                ...r,
                                carryForward: { ...r.carryForward, enabled: val },
                              }))
                            }
                            label="Carry Forward"
                          />
                        </div>
                      </div>

                      {carryForward && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            placeholder="Max carry days"
                            value={maxCarryDays === 0 ? '' : maxCarryDays}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              updateRule(id, (r) => ({
                                ...r,
                                carryForward: { ...r.carryForward, maxDays: val },
                              }));
                            }}
                            className="h-8 w-full rounded-md border border-line bg-surface px-2 text-[11px] text-fg outline-none focus:border-[var(--tt-primary)]"
                          />
                          <span className="shrink-0 text-[10px] text-fg-muted">(0 = all)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progressive Disclosure: Advanced Settings Expander */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      <span>{isExpanded ? 'Hide Advanced Rules' : 'Customize Advanced Rules (Proration, Notice, Encashment)'}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 rounded-lg border border-line bg-surface p-3 space-y-3.5">
                        {/* Section A: Application Limits */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Clock className="h-3.5 w-3.5 text-fg-subtle" />
                            <h6 className="text-[11px] font-bold text-fg uppercase tracking-wide">Application Rules</h6>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-fg-muted mb-1">Notice Required (days)</label>
                              <input
                                type="number"
                                min={0}
                                value={rule.request?.noticeDays ?? 0}
                                onChange={(e) =>
                                  updateRule(id, (r) => ({
                                    ...r,
                                    request: { ...r.request, noticeDays: Math.max(0, Number(e.target.value)) },
                                  }))
                                }
                                className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-fg-muted mb-1">Min Days / Request</label>
                              <input
                                type="number"
                                step="0.5"
                                min={0.5}
                                value={rule.request?.minDays ?? 0.5}
                                onChange={(e) =>
                                  updateRule(id, (r) => ({
                                    ...r,
                                    request: { ...r.request, minDays: Math.max(0.5, Number(e.target.value)) },
                                  }))
                                }
                                className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg"
                              />
                            </div>
                            <div className="flex flex-col justify-end">
                              <label className="flex h-8 items-center justify-between rounded-md border border-line px-2 text-[11px] font-medium text-fg cursor-pointer hover:bg-bg-subtle">
                                <span>Allow Half Day</span>
                                <input
                                  type="checkbox"
                                  checked={rule.request?.allowHalfDay ?? true}
                                  onChange={(e) =>
                                    updateRule(id, (r) => ({
                                      ...r,
                                      request: { ...r.request, allowHalfDay: e.target.checked },
                                    }))
                                  }
                                  className="h-4 w-4 rounded accent-emerald-600"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Section B: Proration & Joiners */}
                        <div className="border-t border-line/60 pt-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <RefreshCw className="h-3.5 w-3.5 text-fg-subtle" />
                            <h6 className="text-[11px] font-bold text-fg uppercase tracking-wide">Proration (Joiners & Leavers)</h6>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-fg-muted mb-1">Joining Month Allocation</label>
                              <select
                                value={rule.proration?.joiningMonth ?? 'prorate'}
                                onChange={(e) =>
                                  updateRule(id, (r) => ({
                                    ...r,
                                    proration: {
                                      ...r.proration,
                                      joiningMonth: e.target.value as 'prorate' | 'full' | 'none',
                                    },
                                  }))
                                }
                                className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg"
                              >
                                <option value="prorate">Prorate proportionally</option>
                                <option value="full">Full allocation</option>
                                <option value="none">No leave in joining month</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-fg-muted mb-1">Exit Month Allocation</label>
                              <select
                                value={rule.proration?.exitMonth ?? 'prorate'}
                                onChange={(e) =>
                                  updateRule(id, (r) => ({
                                    ...r,
                                    proration: {
                                      ...r.proration,
                                      exitMonth: e.target.value as 'prorate' | 'full' | 'none',
                                    },
                                  }))
                                }
                                className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg"
                              >
                                <option value="prorate">Prorate proportionally</option>
                                <option value="full">Full allocation</option>
                                <option value="none">No leave in exit month</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Section C: Exit Encashment & Exhaustion */}
                        <div className="border-t border-line/60 pt-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Coins className="h-3.5 w-3.5 text-fg-subtle" />
                            <h6 className="text-[11px] font-bold text-fg uppercase tracking-wide">Encashment & Balance Exhaustion</h6>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-fg-muted mb-1">When Balance Runs Out</label>
                              <select
                                value={rule.whenExhausted?.strategy ?? 'reject'}
                                onChange={(e) =>
                                  updateRule(id, (r) => ({
                                    ...r,
                                    whenExhausted: {
                                      strategy: e.target.value as 'reject' | 'loss_of_pay',
                                    },
                                  }))
                                }
                                className="h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg"
                              >
                                <option value="reject">Reject further requests</option>
                                <option value="loss_of_pay">Allow as Loss of Pay (Unpaid)</option>
                              </select>
                            </div>
                            <div className="flex flex-col justify-end">
                              <label className="flex h-8 items-center justify-between rounded-md border border-line px-2 text-[11px] font-medium text-fg cursor-pointer hover:bg-bg-subtle">
                                <span>Encash Unused on Exit</span>
                                <input
                                  type="checkbox"
                                  checked={rule.encashOnExit?.enabled ?? false}
                                  onChange={(e) =>
                                    updateRule(id, (r) => ({
                                      ...r,
                                      encashOnExit: {
                                        ...r.encashOnExit,
                                        enabled: e.target.checked,
                                      },
                                    }))
                                  }
                                  className="h-4 w-4 rounded accent-emerald-600"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
