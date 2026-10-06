'use client';

import React from 'react';
import { Search, UserCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { listTrackedEmployees, setTracking } from '../../api/tracking.api';
import type { TrackedEmployeeDto } from '../../types/tracking.dto';

interface TrackingAssignPolicyDialogProps {
  open: boolean;
  policyId: number;
  policyName: string;
  isSaving: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TrackingAssignPolicyDialog({
  open,
  policyId,
  policyName,
  onClose,
  onSuccess,
}: TrackingAssignPolicyDialogProps) {
  const [search, setSearch] = React.useState('');
  const [employees, setEmployees] = React.useState<TrackedEmployeeDto[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setSearch('');
    setIsLoading(true);
    setError(null);
    listTrackedEmployees({ filters: {}, search: '', page: 1, pageSize: 100 })
      .then((res) => {
        setEmployees(res.employees);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load employees');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employee_code && e.employee_code.toLowerCase().includes(q))
    );
  }, [employees, search]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await setTracking({
        employeeIds: Array.from(selectedIds),
        enabled: true,
        policyId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={`Assign employees to ${policyName}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || selectedIds.size === 0}
            onClick={handleAssign}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSubmitting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            <span>Assign {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees by name or ID..."
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-xs sm:text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
            autoFocus
          />
        </div>

        {error && <p className="text-xs text-[var(--tt-danger)] font-medium">{error}</p>}

        <div className="max-h-72 overflow-y-auto divide-y divide-line/60 rounded-lg border border-line bg-surface">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-fg-muted">Loading employees...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-fg-muted">No employees found.</div>
          ) : (
            filtered.map((emp) => {
              const isSelected = selectedIds.has(emp.employee_id);
              const isAlreadyAssigned = emp.policy_id === policyId;

              return (
                <label
                  key={emp.employee_id}
                  className={`flex items-center justify-between gap-3 p-2.5 text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary-soft/30' : 'hover:bg-bg-subtle'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(emp.employee_id)}
                      className="h-4 w-4 rounded border-line text-[var(--tt-primary)] focus:ring-[var(--tt-primary)]"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-fg truncate">{emp.name}</p>
                      <p className="text-[11px] text-fg-muted truncate">
                        {emp.employee_code ? `ID: ${emp.employee_code}` : 'No code'}
                        {emp.policy_name ? ` · currently on ${emp.policy_name}` : ' · default policy'}
                      </p>
                    </div>
                  </div>
                  {isAlreadyAssigned && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Current
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
