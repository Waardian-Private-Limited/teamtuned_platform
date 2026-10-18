'use client';

import { RotateCcw } from 'lucide-react';
import type { DeviceStatusFilter } from '../../constants/employeeDevices.constants';

interface EmployeeDevicesEmptyStateProps {
  status: DeviceStatusFilter;
  searchTerm?: string;
  isFiltered: boolean;
  onClear?: () => void;
}

const STATUS_COPY: Record<DeviceStatusFilter, { title: string; description: string }> = {
  all: { title: 'No employees match', description: 'No employees match these filters.' },
  registered: { title: 'No registered phones', description: 'Nobody here has signed in to the app on a phone yet.' },
  blocked_pending: { title: 'Nothing waiting for HR', description: 'No employee is trying to sign in from a new phone right now.' },
  none: { title: 'Everyone has a phone', description: 'Every employee here has signed in to the app on a phone.' },
};

export function EmployeeDevicesEmptyState({ status, searchTerm, isFiltered, onClear }: EmployeeDevicesEmptyStateProps) {
  let title = 'No employees yet';
  let description = 'Employees who can sign in to the app show up here with the phone they use.';
  if (searchTerm?.trim()) {
    title = 'No matching employees';
    description = `No employees match "${searchTerm.trim()}". Try another name, code or phone number.`;
  } else if (isFiltered) {
    ({ title, description } = STATUS_COPY[status]);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center sm:p-6 lg:p-8 2xl:p-12">
      <div className="mb-3.5 w-32 select-none sm:mb-4 sm:w-40 md:w-44 lg:w-52 2xl:mb-6 2xl:w-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vectors/employees.svg" alt="Employees illustration" width={960} height={667} className="h-auto w-full object-contain" />
      </div>
      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-2xl">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-fg-muted sm:max-w-sm sm:text-sm 2xl:max-w-md 2xl:text-base">{description}</p>
      {isFiltered && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:mt-4 sm:text-sm 2xl:mt-6 2xl:h-11 2xl:px-6 2xl:text-base"
        >
          <RotateCcw className="h-3.5 w-3.5 text-fg-muted 2xl:h-4 2xl:w-4" />
          <span>Clear filters</span>
        </button>
      )}
    </div>
  );
}
