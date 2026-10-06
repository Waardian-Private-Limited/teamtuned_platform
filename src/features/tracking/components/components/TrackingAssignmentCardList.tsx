'use client';

import React from 'react';
import { Edit2, Power, PowerOff, Shield, Smartphone } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { StatusPill } from '@/components/ui/StatusPill';
import { STATE_LABEL } from '../../constants/tracking.constants';
import type { TrackedEmployeeDto, TrackingPolicyDto } from '../../types/tracking.dto';

interface TrackingAssignmentCardListProps {
  rows: TrackedEmployeeDto[];
  policies: TrackingPolicyDto[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
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

export function TrackingAssignmentCardList({
  rows,
  selectedIds,
  onToggleSelect,
  canAssign,
  onQuickToggle,
  onEditPolicy,
  togglingId,
}: TrackingAssignmentCardListProps) {
  return (
    <div className="divide-y divide-line/60">
      {rows.map((r) => {
        const isSelected = selectedIds.has(r.employee_id);
        const isTogglingThis = togglingId === r.employee_id;

        return (
          <div
            key={r.employee_id}
            className={cx(
              'flex flex-col gap-2.5 p-3 sm:p-4 transition-colors',
              isSelected ? 'bg-bg-subtle/80' : 'hover:bg-bg-subtle/50'
            )}
          >
            {/* Header: Checkbox + Avatar/Image + Name + Quick Toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {canAssign && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(r.employee_id)}
                    aria-label={`Select ${r.name}`}
                    className="h-4 w-4 rounded border-line text-[var(--tt-primary)] focus:ring-[var(--tt-primary)] mt-0.5"
                  />
                )}
                {r.photo_url ? (
                  <img
                    src={r.photo_url}
                    alt={r.name}
                    className="h-8.5 w-8.5 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-[11px] font-bold text-fg">
                    {getInitials(r.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-fg sm:text-sm">{r.name}</p>
                  <p className="text-[11px] text-fg-muted">
                    {[r.employee_code, r.battery !== null ? `${r.battery}% battery` : null]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
              </div>

              {canAssign && (
                <button
                  type="button"
                  disabled={isTogglingThis}
                  onClick={() => onQuickToggle(r.employee_id, !r.enabled)}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
                >
                  {isTogglingThis ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : r.enabled ? (
                    <>
                      <PowerOff className="h-3.5 w-3.5 text-fg-muted" />
                      <span>Disable</span>
                    </>
                  ) : (
                    <>
                      <Power className="h-3.5 w-3.5 text-fg" />
                      <span>Enable</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Badges: Status, Policy, Consent, Device */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusPill
                label={r.enabled ? 'Active' : 'Off'}
                tone={r.enabled ? 'active' : 'neutral'}
              />

              <button
                type="button"
                disabled={!canAssign}
                onClick={() => onEditPolicy(r)}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-fg hover:bg-bg-subtle"
              >
                <Shield className="h-2.5 w-2.5 text-fg-muted" />
                <span className="truncate max-w-[130px]">
                  {r.policy_name || 'Default'}
                </span>
                {canAssign && <Edit2 className="h-2 w-2 text-fg-subtle ml-0.5" />}
              </button>

              {r.enabled && (
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
              )}

              {r.platform && (
                <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted">
                  <Smartphone className="h-2.5 w-2.5" />
                  <span>{r.platform}</span>
                </span>
              )}

              {r.enabled && (
                <span className="text-[11px] text-fg-muted ml-auto">
                  {ago(r.last_seen_at)}
                  {r.state && <span> · {STATE_LABEL[r.state] ?? r.state}</span>}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
