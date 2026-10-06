'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, User, X } from 'lucide-react';
import { listTrackedEmployees } from '../api/tracking.api';
import type { TrackedEmployeeDto } from '../types/tracking.dto';

interface TimelineEmployeePickerProps {
  selectedId: number | null;
  onSelect: (employeeId: number | null) => void;
  disabled?: boolean;
}

const PAGE_SIZE = 30;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TimelineEmployeePicker({
  selectedId,
  onSelect,
  disabled = false,
}: TimelineEmployeePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const [employees, setEmployees] = useState<TrackedEmployeeDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedEmployeeObj, setSelectedEmployeeObj] = useState<TrackedEmployeeDto | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch paginated employees from the migrated endpoint: listTrackedEmployees (/tracking/employees)
  const fetchEmployees = useCallback(
    async (searchTerm: string, targetPage: number, append = false) => {
      try {
        if (targetPage === 1) setLoading(true);
        else setLoadingMore(true);

        const res = await listTrackedEmployees({
          filters: {},
          search: searchTerm.trim() || undefined,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });

        setTotal(res.total);
        setPage(targetPage);
        setEmployees((prev) => (append ? [...prev, ...res.employees] : res.employees));

        // If selectedId exists and not yet resolved, check if it's in the response
        if (selectedId && !selectedEmployeeObj) {
          const match = res.employees.find((e) => e.employee_id === selectedId);
          if (match) setSelectedEmployeeObj(match);
        }
      } catch (err) {
        console.error('Failed to fetch tracked employees:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedId, selectedEmployeeObj]
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchEmployees('', 1, false);
  }, [fetchEmployees]);

  // If selectedId changes from outside and we don't have the object, search for it
  useEffect(() => {
    if (!selectedId) {
      setSelectedEmployeeObj(null);
      return;
    }
    const existing = employees.find((e) => e.employee_id === selectedId);
    if (existing) {
      setSelectedEmployeeObj(existing);
    } else {
      // Fetch specifically for this ID if possible or resolve
      listTrackedEmployees({ filters: {}, page: 1, pageSize: 50 })
        .then((res) => {
          const found = res.employees.find((e) => e.employee_id === selectedId);
          if (found) setSelectedEmployeeObj(found);
        })
        .catch(() => {});
    }
  }, [selectedId, employees]);

  // Debounced search on server
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      fetchEmployees(query, 1, false);
      setHighlightIndex(0);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, fetchEmployees]);

  // Load next page
  const handleLoadMore = () => {
    if (loadingMore || employees.length >= total) return;
    fetchEmployees(query, page + 1, true);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setHighlightIndex(0);
      const raf = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    setQuery('');
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLLIElement>('li[role="option"]');
    if (items[highlightIndex]) {
      items[highlightIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, open]);

  const selectedEmployee = useMemo(() => {
    if (selectedEmployeeObj) return selectedEmployeeObj;
    return employees.find((e) => e.employee_id === selectedId) || null;
  }, [selectedEmployeeObj, employees, selectedId]);

  function handleSelect(employee: TrackedEmployeeDto | null) {
    setSelectedEmployeeObj(employee);
    onSelect(employee ? employee.employee_id : null);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, Math.max(0, employees.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (employees[highlightIndex]) {
        handleSelect(employees[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  const hasMore = employees.length < total;

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      {/* Trigger Button - Strictly Monochrome Black & White Theme */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group flex h-9 w-full sm:min-w-[260px] lg:min-w-[300px] items-center justify-between gap-2 rounded-xl border bg-surface px-2.5 text-xs sm:text-sm shadow-2xs transition-all ${
          disabled
            ? 'cursor-not-allowed opacity-50 border-line bg-bg-subtle'
            : open
              ? 'border-fg ring-1 ring-fg shadow-xs'
              : 'border-line hover:border-line-strong'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {selectedEmployee ? (
            <>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-[10px] font-bold text-fg">
                {getInitials(selectedEmployee.name)}
              </div>
              <span className="truncate font-semibold text-fg">{selectedEmployee.name}</span>
              {selectedEmployee.employee_code && (
                <span className="rounded border border-line bg-bg-subtle px-1 py-0.2 text-[10px] font-mono text-fg-muted">
                  {selectedEmployee.employee_code}
                </span>
              )}
            </>
          ) : (
            <>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-fg-muted">
                <User className="h-3 w-3" />
              </div>
              <span className="text-fg-muted">Search & choose employee</span>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {selectedEmployee && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              title="Clear selection"
              className="rounded p-0.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-fg-muted transition-transform duration-150 ${
              open ? 'rotate-180 text-fg' : 'group-hover:text-fg'
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] sm:min-w-[320px] overflow-hidden rounded-xl border border-line bg-surface shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
          {/* Top Search Input */}
          <div className="flex items-center gap-2 border-b border-line bg-surface px-2.5 py-2">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-fg-muted" />
            ) : (
              <Search className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or code..."
              className="w-full bg-transparent text-xs sm:text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                className="rounded p-0.5 text-fg-muted hover:text-fg"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Results Summary Header */}
          <div className="flex items-center justify-between border-b border-line/50 bg-bg-subtle/50 px-2.5 py-1 text-[11px] font-medium text-fg-muted">
            <span>
              {loading
                ? 'Searching…'
                : query
                  ? `Matches (${total})`
                  : `Showing ${employees.length} of ${total}`}
            </span>
            {selectedEmployee && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="text-[11px] text-fg hover:underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* List of Employees with Modern Custom Scrollbar */}
          <ul
            ref={listRef}
            role="listbox"
            className="tt-scrollbar max-h-56 overflow-y-auto p-1 text-xs sm:text-sm divide-y divide-line/30"
          >
            {employees.length === 0 && !loading ? (
              <li className="px-3 py-6 text-center text-xs text-fg-muted">
                No employee found matching &quot;{query}&quot;
              </li>
            ) : (
              employees.map((emp, idx) => {
                const isSelected = emp.employee_id === selectedId;
                const isHighlighted = idx === highlightIndex;
                return (
                  <li
                    key={emp.employee_id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => handleSelect(emp)}
                    className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                      isHighlighted ? 'bg-bg-subtle' : ''
                    } ${isSelected ? 'font-semibold text-fg' : 'text-fg'}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-[10px] font-bold text-fg">
                        {getInitials(emp.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-fg">{emp.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-fg-muted">
                          {emp.employee_code && (
                            <span className="font-mono">{emp.employee_code}</span>
                          )}
                          {emp.policy_name && (
                            <>
                              <span>·</span>
                              <span className="truncate">{emp.policy_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-fg" />
                    )}
                  </li>
                );
              })
            )}

            {/* Pagination / Load More Button */}
            {hasMore && !loading && (
              <li className="p-1 pt-2 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="w-full rounded-md border border-line bg-surface py-1 text-center text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more…' : `Load more (${total - employees.length} left)`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
