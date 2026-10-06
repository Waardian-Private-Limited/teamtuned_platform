'use client';

import React from 'react';
import { Edit2, Power, PowerOff, Shield, Smartphone } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { StatusPill } from '@/components/ui/StatusPill';
import { STATE_LABEL } from '../../constants/tracking.constants';
import type { TrackedEmployeeDto, TrackingPolicyDto } from '../../types/tracking.dto';

interface TrackingAssignmentTableProps {
  rows: TrackedEmployeeDto[];
  policies: TrackingPolicyDto[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  canAssign: boolean;
  onQuickToggle: (employeeId: number, enable: boolean) => void;
  onEditPolicy: (employee: TrackedEmployeeDto) => void;
  togglingId: number | null;
}

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const ago = (iso: string | null) => {
  if (!iso) return 'Never';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1
    ? 'Just now'
    : m < 60
    ? `${m}m ago`
    : m < 1440
    ? `${Math.floor(m / 60)}h ago`
    : `${Math.floor(m / 1440)}d ago`;
};

const th =
  'border-b border-line bg-bg-subtle px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted select-none';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 align-middle';

export function TrackingAssignmentTable({
  rows,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  allSelected,
  canAssign,
  onQuickToggle,
  onEditPolicy,
  togglingId,
}: TrackingAssignmentTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(th, 'w-10 first:rounded-tl-xl')}>
              {canAssign && (
                <input
                  type="checkbox"
                  checked={allSelected && rows.length > 0}
                  onChange={onToggleAll}
                  aria-label="Select all employees"
                  className="h-4 w-4 rounded border-line text-[var(--tt-primary)] focus:ring-[var(--tt-primary)]"
                />
              )}
            </th>
            <th className={th}>Employee</th>
            <th className={cx(th, 'w-32')}>Tracking</th>
            <th className={cx(th, 'w-48')}>Policy</th>
            <th className={cx(th, 'w-32')}>Consent</th>
            <th className={cx(th, 'w-40')}>Device</th>
            <th className={cx(th, 'w-44')}>Last Signal</th>
            <th className={cx(th, 'w-28 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const isSelected = selectedIds.has(r.employee_id);
            const isTogglingThis = togglingId === r.employee_id;

            return (
              <tr
                key={r.employee_id}
                className={cx(
                  'group transition-colors',
                  isSelected ? 'bg-bg-subtle/80' : 'hover:bg-bg-subtle/50'
                )}
              >
                {/* Checkbox */}
                <td className={td}>
                  {canAssign && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(r.employee_id)}
                      aria-label={`Select ${r.name}`}
                      className="h-4 w-4 rounded border-line text-[var(--tt-primary)] focus:ring-[var(--tt-primary)]"
                    />
                  )}
                </td>

                {/* Employee Profile (Matches EmployeeIdentity.tsx) */}
                <td className={td}>
                  <div className="flex min-w-0 items-center gap-3">
                    {r.photo_url ? (
                      <img
                        src={r.photo_url}
                        alt={r.name}
                        className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-[11px] font-bold text-fg">
                        {getInitials(r.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-fg sm:text-sm">
                        {r.name}
                      </p>
                      <div className="truncate text-[11px] text-fg-muted">
                        {[r.employee_code, r.battery !== null ? `${r.battery}% battery` : null]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Tracking Status */}
                <td className={td}>
                  <StatusPill
                    label={r.enabled ? 'Active' : 'Off'}
                    tone={r.enabled ? 'active' : 'neutral'}
                  />
                </td>

                {/* Assigned Policy */}
                <td className={td}>
                  <button
                    type="button"
                    disabled={!canAssign}
                    onClick={() => onEditPolicy(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-bg-subtle disabled:cursor-default"
                  >
                    <Shield className="h-3 w-3 text-fg-muted" />
                    <span className="truncate max-w-[130px]">
                      {r.policy_name || 'Default'}
                    </span>
                    {canAssign && (
                      <Edit2 className="h-2.5 w-2.5 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                    )}
                  </button>
                </td>

                {/* Consent */}
                <td className={td}>
                  {r.enabled ? (
                    <StatusPill
                      label={r.consent}
                      tone={
                        r.consent === 'accepted'
                          ? 'active'
                          : r.consent === 'withdrawn'
                          ? 'inactive'
                          : 'neutral'
                      }
                    />
                  ) : (
                    <span className="text-xs text-fg-muted">—</span>
                  )}
                </td>

                {/* Device & Phone */}
                <td className={td}>
                  {r.platform ? (
                    <div className="flex items-center gap-1.5 text-xs text-fg">
                      <Smartphone className="h-3.5 w-3.5 text-fg-muted shrink-0" />
                      <span className="truncate max-w-[120px]">
                        {r.platform} {r.app_version ? `v${r.app_version}` : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-fg-muted">—</span>
                  )}
                </td>

                {/* Last Signal */}
                <td className={td}>
                  {r.enabled ? (
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-fg truncate">
                        {ago(r.last_seen_at)}
                      </p>
                      {r.state && (
                        <p className="text-[11px] text-fg-muted truncate capitalize">
                          {STATE_LABEL[r.state] ?? r.state}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-fg-muted">—</span>
                  )}
                </td>

                {/* Quick Row Action */}
                <td className={cx(td, 'text-right')}>
                  {canAssign && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isTogglingThis}
                        onClick={() => onQuickToggle(r.employee_id, !r.enabled)}
                        title={r.enabled ? 'Disable tracking' : 'Enable tracking'}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
                      >
                        {isTogglingThis ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : r.enabled ? (
                          <>
                            <PowerOff className="h-3.5 w-3.5 text-fg-muted" />
                            <span className="hidden xl:inline">Disable</span>
                          </>
                        ) : (
                          <>
                            <Power className="h-3.5 w-3.5 text-fg" />
                            <span className="hidden xl:inline">Enable</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
