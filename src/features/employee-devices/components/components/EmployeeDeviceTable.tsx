'use client';

import { ChevronRight } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { formatDateTime } from '@/lib/datetime';
import type { EmployeeDevice } from '../../types/employeeDevices.model';
import { timeAgo, webSessionsLabel } from '../../utils/deviceFormat';
import { PlatformLabel } from './PlatformLabel';
import { DeviceStatusBadge, PhoneLockTag } from './DeviceStatusBadge';

interface EmployeeDeviceTableProps {
  employees: EmployeeDevice[];
  onOpen: (employee: EmployeeDevice) => void;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';
const cellClass = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4 align-middle';

export function EmployeeDeviceTable({ employees, onOpen }: EmployeeDeviceTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Employee</th>
            <th className={cellHeaderClass}>Registered phone</th>
            <th className={cx(cellHeaderClass, 'w-36 2xl:w-44')}>Phone lock</th>
            <th className={cx(cellHeaderClass, 'w-40 2xl:w-48')}>Status</th>
            <th className={cx(cellHeaderClass, 'w-36 2xl:w-44')}>Last seen in app</th>
            <th className={cx(cellHeaderClass, 'w-16 text-right last:rounded-tr-xl')}><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr
              key={employee.userId}
              onClick={() => onOpen(employee)}
              className="cursor-pointer transition-colors hover:bg-bg-subtle/50"
            >
              <td className={cellClass}>
                <span className="text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{employee.name}</span>
                <div className={cx(text.caption, 'mt-0.5 truncate text-fg-muted')}>
                  {[employee.code, employee.department, employee.phone].filter(Boolean).join(' · ') || '—'}
                </div>
              </td>
              <td className={cellClass}>
                {employee.device ? (
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-fg sm:text-sm">{employee.device.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <PlatformLabel platform={employee.device.platform} />
                      {employee.device.boundAt && <span className="text-[11px] text-fg-subtle">since {formatDateTime(employee.device.boundAt)}</span>}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-fg-subtle sm:text-sm">Not signed in on a phone yet</span>
                )}
                {employee.pendingDevice && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-fg">
                    <span className="text-fg-muted">Waiting:</span>
                    <span className="truncate">{employee.pendingDevice.name}</span>
                    <PlatformLabel platform={employee.pendingDevice.platform} className="text-[11px]" />
                  </div>
                )}
              </td>
              <td className={cellClass}>
                <PhoneLockTag on={employee.singleDevice} />
              </td>
              <td className={cellClass}>
                <DeviceStatusBadge employee={employee} />
              </td>
              <td className={cellClass}>
                <div className="text-xs text-fg sm:text-sm" title={employee.lastSeenAt ? formatDateTime(employee.lastSeenAt) : undefined}>
                  {timeAgo(employee.lastSeenAt) ?? (employee.lastSeenAt ? formatDateTime(employee.lastSeenAt) : '—')}
                </div>
                <div className="mt-0.5 text-[11px] text-fg-subtle" title="Web sign-ins are not limited">
                  {webSessionsLabel(employee.webSessions)}
                </div>
              </td>
              <td className={cx(cellClass, 'text-right')}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpen(employee); }}
                  aria-label={`Open ${employee.name}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
