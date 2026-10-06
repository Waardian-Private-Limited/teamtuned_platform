'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { listPolicies, listTrackedEmployees, setTracking } from '../api/tracking.api';
import { PAGE_SIZE, TRACKING_PERMISSIONS } from '../constants/tracking.constants';
import type {
  TrackedEmployeeDto,
  TrackingFilters as Filters,
  TrackingPolicyDto,
} from '../types/tracking.dto';
import {
  TrackingAssignmentsToolbar,
  type EnabledFilter,
} from './components/TrackingAssignmentsToolbar';
import { TrackingAssignmentsBulkBar } from './components/TrackingAssignmentsBulkBar';
import { TrackingAssignmentTable } from './components/TrackingAssignmentTable';
import { TrackingAssignmentCardList } from './components/TrackingAssignmentCardList';
import { TrackingAssignmentSkeleton } from './components/TrackingAssignmentSkeleton';
import { QuickAssignPolicyModal } from './components/QuickAssignPolicyModal';

export function EmployeesAssignPage() {
  const { can } = usePermission();
  const canAssign = can(TRACKING_PERMISSIONS.ASSIGN);

  // Filters & State
  const [filters, setFilters] = useState<Filters>({});
  const [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState<EnabledFilter>('all');
  const [page, setPage] = useState(1);

  // Data
  const [rows, setRows] = useState<TrackedEmployeeDto[]>([]);
  const [total, setTotal] = useState(0);
  const [policies, setPolicies] = useState<TrackingPolicyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection & Bulk Actions
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [policyId, setPolicyId] = useState<number | null>(null);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Single employee policy edit modal
  const [editEmployee, setEditEmployee] = useState<TrackedEmployeeDto | null>(null);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await listTrackedEmployees({
        filters,
        search,
        enabled: enabled === 'all' ? null : enabled === 'on',
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(r.employees);
      setTotal(r.total);
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters, search, enabled, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    listPolicies(undefined, true)
      .then((r) => setPolicies(r.policies))
      .catch(() => undefined);
  }, []);

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.employee_id));

  const toggleAll = () => {
    setSelected((cur) => {
      const next = new Set(cur);
      rows.forEach((r) => {
        if (allOnPage) next.delete(r.employee_id);
        else next.add(r.employee_id);
      });
      return next;
    });
  };

  // Bulk Apply
  const applyBulk = async (on: boolean) => {
    if (selected.size === 0) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await setTracking({
        employeeIds: Array.from(selected),
        enabled: on,
        policyId: on ? policyId : null,
      });
      setNotice(
        `${res.updated} employee${res.updated === 1 ? '' : 's'} ${
          on ? 'enabled' : 'disabled'
        }.`
      );
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  // Quick single row toggle
  const handleQuickToggle = async (empId: number, on: boolean) => {
    setTogglingId(empId);
    setError(null);
    try {
      const emp = rows.find((r) => r.employee_id === empId);
      await setTracking({
        employeeIds: [empId],
        enabled: on,
        policyId: on ? emp?.policy_id : null,
      });
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setTogglingId(null);
    }
  };

  // Quick single row policy update
  const handleConfirmSinglePolicy = async (newPolicyId: number | null) => {
    if (!editEmployee) return;
    setIsUpdatingPolicy(true);
    setError(null);
    try {
      await setTracking({
        employeeIds: [editEmployee.employee_id],
        enabled: editEmployee.enabled,
        policyId: newPolicyId,
      });
      setEditEmployee(null);
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  const trackedCount = rows.filter((r) => r.enabled).length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Modern Toolbar */}
      <TrackingAssignmentsToolbar
        total={total}
        trackedCount={trackedCount}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        enabled={enabled}
        onEnabledChange={(v) => {
          setEnabled(v);
          setPage(1);
        }}
        filters={filters}
        onFiltersChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      {/* Floating / Compact Modern Bulk Action Bar */}
      {canAssign && selected.size > 0 && (
        <TrackingAssignmentsBulkBar
          selectedCount={selected.size}
          policies={policies}
          selectedPolicyId={policyId}
          onPolicyChange={setPolicyId}
          onApply={applyBulk}
          onClear={() => setSelected(new Set())}
          isBusy={busy}
        />
      )}

      {error && <Alert message={error} tone="error" />}
      {notice && <Alert message={notice} tone="success" />}

      {/* Table & Mobile Card List */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {isLoading ? (
          <div className="flex-1 overflow-hidden p-1">
            <TrackingAssignmentSkeleton rows={7} />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-subtle border border-line text-fg-muted mb-3">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-fg">No employees match criteria</h3>
            <p className="mt-1 text-xs text-fg-muted max-w-sm">
              Try adjusting your search terms or clearing department, role, or tracking filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden min-h-0 flex-1 overflow-auto md:block">
              <TrackingAssignmentTable
                rows={rows}
                policies={policies}
                selectedIds={selected}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
                allSelected={allOnPage}
                canAssign={canAssign}
                onQuickToggle={handleQuickToggle}
                onEditPolicy={setEditEmployee}
                togglingId={togglingId}
              />
            </div>

            {/* Mobile Card View */}
            <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
              <TrackingAssignmentCardList
                rows={rows}
                policies={policies}
                selectedIds={selected}
                onToggleSelect={toggleSelect}
                canAssign={canAssign}
                onQuickToggle={handleQuickToggle}
                onEditPolicy={setEditEmployee}
                togglingId={togglingId}
              />
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        pageSizeOptions={[PAGE_SIZE]}
      />

      {/* Single Employee Policy Edit Modal */}
      <QuickAssignPolicyModal
        open={Boolean(editEmployee)}
        employee={editEmployee}
        policies={policies}
        isSaving={isUpdatingPolicy}
        onClose={() => setEditEmployee(null)}
        onConfirm={handleConfirmSinglePolicy}
      />
    </div>
  );
}
