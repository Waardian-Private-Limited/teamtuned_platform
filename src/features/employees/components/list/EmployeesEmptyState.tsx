'use client';

import Image from 'next/image';
import { Plus, RotateCcw } from 'lucide-react';

interface EmployeesEmptyStateProps {
  filtered: boolean;
  canAdd: boolean;
  onAdd: () => void;
  onClear: () => void;
}

export function EmployeesEmptyState({ filtered, canAdd, onAdd, onClear }: EmployeesEmptyStateProps) {
  const title = filtered ? 'No matching employees' : 'Add your first employee';
  const description = filtered
    ? 'Nothing matches these filters. Try a different search or clear the filters.'
    : 'Add people with their role, site, attendance policy and salary. They complete their own details during onboarding.';

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center sm:p-6 lg:p-8 2xl:p-12">
      <div className="mb-3.5 w-44 select-none sm:mb-4 sm:w-56 md:w-64 lg:w-72 2xl:mb-6 2xl:w-96">
        <Image src="/vectors/employees.svg" alt="Employees illustration" width={898} height={399} unoptimized priority className="h-auto w-full object-contain" />
      </div>
      <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base md:text-lg 2xl:text-2xl">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-fg-muted sm:max-w-sm sm:text-sm 2xl:max-w-md 2xl:text-base">{description}</p>
      {filtered ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] sm:mt-4 sm:h-9.5 sm:text-sm 2xl:mt-6 2xl:h-11 2xl:px-6 2xl:text-base"
        >
          <RotateCcw className="h-3.5 w-3.5 text-fg-muted 2xl:h-4 2xl:w-4" />
          <span>Clear filters</span>
        </button>
      ) : (
        canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:mt-4 sm:h-9.5 sm:text-sm 2xl:mt-6 2xl:h-11 2xl:px-6 2xl:text-base"
          >
            <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            <span>New Employee</span>
          </button>
        )
      )}
    </div>
  );
}
