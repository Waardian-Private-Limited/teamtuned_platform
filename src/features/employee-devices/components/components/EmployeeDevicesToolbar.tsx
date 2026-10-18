'use client';

import { Search } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import {
  DEVICE_PLATFORM_FILTER_OPTIONS,
  DEVICE_STATUS_FILTER_OPTIONS,
  type DevicePlatformFilter,
  type DeviceStatusFilter,
} from '../../constants/employeeDevices.constants';
import type { DeviceSummary } from '../../types/employeeDevices.model';

interface EmployeeDevicesToolbarProps {
  total: number;
  summary: DeviceSummary;
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: DeviceStatusFilter;
  onStatusChange: (value: DeviceStatusFilter) => void;
  platform: DevicePlatformFilter;
  onPlatformChange: (value: DevicePlatformFilter) => void;
  subOrgId: number | null;
  onSubOrgChange: (id: number | null) => void;
}

function SummaryChip({ label, count, active, strong, onClick }: { label: string; count: number; active: boolean; strong?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition-colors sm:text-[13px]',
        active ? 'border-fg bg-fg text-[var(--tt-fg-inverted)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle',
      )}
    >
      <span className={cx('tabular-nums', strong && !active && count > 0 ? 'rounded bg-fg px-1.5 text-[var(--tt-fg-inverted)]' : '')}>{count}</span>
      <span className={active ? '' : 'text-fg-muted'}>{label}</span>
    </button>
  );
}

export function EmployeeDevicesToolbar({
  total,
  summary,
  searchValue,
  onSearchChange,
  status,
  onStatusChange,
  platform,
  onPlatformChange,
  subOrgId,
  onSubOrgChange,
}: EmployeeDevicesToolbarProps) {
  // A chip toggles its status filter; clicking the active chip clears it.
  const toggle = (next: DeviceStatusFilter) => onStatusChange(status === next ? 'all' : next);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Employee Devices</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
            {total}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SummaryChip label="Registered" count={summary.registered} active={status === 'registered'} onClick={() => toggle('registered')} />
          <SummaryChip label="Waiting for HR" count={summary.pending} active={status === 'blocked_pending'} strong onClick={() => toggle('blocked_pending')} />
          <SummaryChip label="No phone" count={summary.none} active={status === 'none'} onClick={() => toggle('none')} />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 md:w-64 2xl:h-10 2xl:w-80">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle 2xl:h-4 2xl:w-4" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, code, phone…"
            aria-label="Search employees"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm 2xl:text-base"
          />
        </div>

        <div className="w-full sm:w-auto">
          <SegmentedControl options={DEVICE_STATUS_FILTER_OPTIONS} value={status} onChange={onStatusChange} fitText className="w-full sm:w-auto" />
        </div>

        <div className="w-full sm:w-auto">
          <SegmentedControl options={DEVICE_PLATFORM_FILTER_OPTIONS} value={platform} onChange={onPlatformChange} fitText className="w-full sm:w-auto" />
        </div>

        <SubOrgFilter value={subOrgId} onChange={onSubOrgChange} />
      </div>
    </div>
  );
}
