'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { text } from '@/theme/tokens';
import type { Role, RoleEmployee, RoleEmployeeCandidate } from '../../types/roles.model';

interface RoleEmployeesDrawerProps {
  open: boolean;
  role: Role | null;
  holders: RoleEmployee[];
  candidates: RoleEmployeeCandidate[];
  isLoading: boolean;
  candidatesLoading: boolean;
  isSaving: boolean;
  onSearch: (term: string) => void;
  onAssign: (employeeId: number) => void;
  onRemove: (employeeId: number) => void;
  onClose: () => void;
}

export function RoleEmployeesDrawer({
  open,
  role,
  holders,
  candidates,
  isLoading,
  candidatesLoading,
  isSaving,
  onSearch,
  onAssign,
  onRemove,
  onClose,
}: RoleEmployeesDrawerProps) {
  // Only offer candidates who don't already hold this role.
  const holderIds = useMemo(() => new Set(holders.map((h) => h.id)), [holders]);
  const options = useMemo<ComboboxOption[]>(
    () => candidates
      .filter((c) => !holderIds.has(c.id))
      .map((c) => ({ value: c.id, label: c.name, description: [c.designation, c.roleName].filter(Boolean).join(' · ') || undefined })),
    [candidates, holderIds]
  );

  return (
    <Drawer open={open} onClose={onClose} title={role ? `Employees — ${role.name}` : 'Role Employees'}>
      {isLoading || !role ? (
        <p className={text.body}>Loading…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Assign an employee</label>
            <Combobox
              options={options}
              value={null}
              onChange={(value) => value !== null && onAssign(Number(value))}
              placeholder="Search employees…"
              searchPlaceholder="Search employees…"
              disabled={isSaving}
              loading={candidatesLoading}
              onSearch={onSearch}
              clearable={false}
            />
          </div>

          <div className="border-t border-line pt-4">
            <p className={text.overline}>Current holders ({holders.length})</p>
            {holders.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">No employees hold this role yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line/60 rounded-lg border border-line">
                {holders.map((holder) => (
                  <li key={holder.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{holder.name}</span>
                      {holder.designation && <span className="block truncate text-xs text-fg-muted">{holder.designation}</span>}
                    </span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => onRemove(holder.id)}
                      aria-label={`Remove ${holder.name} from role`}
                      className="shrink-0 rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
