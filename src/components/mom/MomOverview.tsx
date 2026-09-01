"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  Search,
  Building,
  User,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  Paperclip,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import ActionItemChat from './ActionItemChat';

type GroupBy = 'employee' | 'site' | 'department';
type SortKey = 'overdue' | 'open' | 'total' | 'closed' | 'on_time' | 'label';

interface Row {
  group_key: string;
  label: string;
  site_name: string | null;
  department_name: string | null;
  total_points: number;
  to_do: number;
  doing: number;
  awaiting_review: number;
  open_points: number;
  overdue: number;
  closed_last_30d: number;
  on_time_rate: number | null;
  avg_days_to_close: number | null;
}

interface Summary {
  total_meetings: number;
  live_meetings: number;
  upcoming_meetings: number;
  open_points: number;
  overdue_points: number;
  awaiting_review: number;
  unassigned_points: number;
  closed_last_30d: number;
  on_time_rate: number | null;
}

function useCountUp(target: number, duration = 600) {
  const [v, setV] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      setV(Math.floor(p * (Number.isFinite(target) ? target : 0)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return v;
}

function OnTimeBar({ rate }: { rate: number | null }) {
  if (rate === null || rate === undefined) {
    return <span className="text-xs text-gray-400 font-medium">No target</span>;
  }
  const colour = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  const textColour = rate >= 80 ? 'text-emerald-700 font-bold' : rate >= 60 ? 'text-amber-700 font-bold' : 'text-rose-700 font-bold';
  return (
    <div className="min-w-[64px]">
      <span className={`text-xs ${textColour}`}>{rate}%</span>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mt-0.5">
        <div className={`h-full ${colour}`} style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
      </div>
    </div>
  );
}

export default function MomOverview({ basePath = '/employee/mom' }: { basePath?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('employee');
  const [sort, setSort] = useState<SortKey>('overdue');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters (LeaveRequests style)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdowns data
  const [sites, setSites] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [empSearchInput, setEmpSearchInput] = useState('');

  // Selected Entity for Employee MoM Dashboard (View Style)
  const [selectedEntity, setSelectedEntity] = useState<{
    id: number | string;
    type: 'employee' | 'site' | 'department' | string;
    name: string;
    department?: string;
    site?: string;
    row?: Row;
  } | null>(null);

  // Entity Dashboard Action Items State
  const [entitySubTab, setEntitySubTab] = useState<'assigned' | 'raised' | 'all'>('assigned');
  const [entityPoints, setEntityPoints] = useState<any[]>([]);
  const [entityPointsLoading, setEntityPointsLoading] = useState(false);
  const [entityPage, setEntityPage] = useState(1);
  const [entityPageSize, setEntityPageSize] = useState(10);
  const [entityTotalCount, setEntityTotalCount] = useState(0);

  // Discussion Chat Modal
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Animated numbers for Overview summary
  const animOverdue = useCountUp(summary?.overdue_points || 0);
  const animOpen = useCountUp(summary?.open_points || 0);
  const animReview = useCountUp(summary?.awaiting_review || 0);
  const animClosed = useCountUp(summary?.closed_last_30d || 0);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res: any = await apiClient.get('/mom/overview/summary');
      if (res?.success) setSummary(res.summary);
    } catch (e) {
      console.error('Failed to load summary:', e);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch sites & employees
  const fetchSitesAndEmployees = useCallback(async () => {
    try {
      const [sitesRes, empsRes]: any = await Promise.all([
        apiClient.get('/sites', { format: 'paginated', limit: 1000 }).catch(() => ({ sites: [] })),
        apiClient.get('/organization/employees', { format: 'paginated', limit: 1000 }).catch(() => ({ data: [] }))
      ]);
      setSites(sitesRes?.sites || []);
      const emps = (empsRes as any)?.data || (empsRes as any)?.items || (Array.isArray(empsRes) ? empsRes : []);
      setAllEmployees(Array.isArray(emps) ? emps : []);
    } catch (e) {
      console.error('Failed to fetch master data:', e);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchSitesAndEmployees();
  }, [fetchSummary, fetchSitesAndEmployees]);

  // Load Breakdown rows for table
  const loadBreakdown = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({
        groupBy,
        sort,
        order,
        page: String(page),
        limit: String(pageSize),
        ...(selectedSiteId ? { siteId: selectedSiteId } : {}),
        ...(startDate ? { from: startDate } : {}),
        ...(endDate ? { to: endDate } : {})
      });
      const res: any = await apiClient.get(`/mom/overview/breakdown?${qs}`);
      if (res?.success) {
        setRows(res.rows || []);
        setMeta({ total: res.total || 0, totalPages: res.totalPages || 1 });
      }
    } catch (err: any) {
      console.error('Failed to load breakdown:', err);
    } finally {
      setLoading(false);
    }
  }, [groupBy, sort, order, page, pageSize, selectedSiteId, startDate, endDate]);

  useEffect(() => {
    loadBreakdown();
  }, [loadBreakdown]);

  useEffect(() => {
    setPage(1);
  }, [groupBy, pageSize, selectedSiteId, startDate, endDate]);

  // Fetch Action Items for selected employee (MoM Dashboard View)
  const fetchEntityPoints = useCallback(async (targetPage = entityPage, targetPageSize = entityPageSize) => {
    if (!selectedEntity) return;
    try {
      setEntityPointsLoading(true);
      const params: any = {
        type: entitySubTab,
        limit: targetPageSize,
        offset: (targetPage - 1) * targetPageSize
      };

      if (selectedEntity.type === 'employee') {
        params.employee_id = selectedEntity.id;
      } else if (selectedEntity.type === 'site') {
        params.site_id = selectedEntity.id;
      } else if (selectedEntity.type === 'department') {
        params.department_id = selectedEntity.id;
      }

      if (statusFilter && statusFilter !== 'All Status') {
        params.status = statusFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await apiClient.get('/mom/my-points', params, { withAuth: true });
      if (res?.success) {
        setEntityPoints(res.points || []);
        setEntityTotalCount(res.total || 0);
      } else {
        setEntityPoints([]);
        setEntityTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to load entity points:', err);
      setEntityPoints([]);
      setEntityTotalCount(0);
    } finally {
      setEntityPointsLoading(false);
    }
  }, [selectedEntity, entitySubTab, statusFilter, search, startDate, endDate, entityPage, entityPageSize]);

  useEffect(() => {
    if (selectedEntity) {
      fetchEntityPoints(entityPage, entityPageSize);
    }
  }, [selectedEntity, entityPage, entityPageSize, entitySubTab, statusFilter, startDate, endDate, fetchEntityPoints]);

  // Debounced search inside entity points
  useEffect(() => {
    if (!selectedEntity) return;
    const timer = setTimeout(() => {
      setEntityPage(1);
      fetchEntityPoints(1, entityPageSize);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Select employee from list or search
  const handleSelectEmployee = (emp: any) => {
    const empId = emp.id;
    const empName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee #${empId}`;
    const foundRow = rows.find(r => r.group_key === `employee:${empId}`);

    setSelectedEntity({
      id: empId,
      type: 'employee',
      name: empName,
      department: emp.department || (emp.department_name) || foundRow?.department_name || undefined,
      site: emp.site_name || foundRow?.site_name || undefined,
      row: foundRow
    });

    setEntityPage(1);
    setEntitySubTab('assigned');
    setEmpDropdownOpen(false);
    setEmpSearchInput('');
  };

  // Select row from table
  const handleSelectRow = (r: Row) => {
    if (r.group_key.startsWith('employee:')) {
      const empId = r.group_key.split(':')[1];
      setSelectedEntity({
        id: empId,
        type: 'employee',
        name: r.label,
        department: r.department_name || undefined,
        site: r.site_name || undefined,
        row: r
      });
    } else if (r.group_key.startsWith('site:')) {
      const siteId = r.group_key.split(':')[1];
      setSelectedEntity({
        id: siteId,
        type: 'site',
        name: r.label,
        site: r.label,
        row: r
      });
    } else if (r.group_key.startsWith('department:')) {
      const deptId = r.group_key.split(':')[1];
      setSelectedEntity({
        id: deptId,
        type: 'department',
        name: r.label,
        department: r.label,
        row: r
      });
    } else {
      setSelectedEntity({
        id: r.group_key,
        type: groupBy,
        name: r.label,
        department: r.department_name || undefined,
        site: r.site_name || undefined,
        row: r
      });
    }
    setEntityPage(1);
    setEntitySubTab('all');
  };

  const handleClearSelectedEntity = () => {
    setSelectedEntity(null);
    setEntityPoints([]);
    setEntityTotalCount(0);
    setSearch('');
  };

  const sortBy = (key: SortKey) => {
    if (sort === key) setOrder(o => (o === 'desc' ? 'asc' : 'desc'));
    else { setSort(key); setOrder(key === 'label' ? 'asc' : 'desc'); }
    setPage(1);
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'open').toLowerCase();
    switch (s) {
      case 'open':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Open</span>;
      case 'acknowledged':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Acknowledged</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">In Progress</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'closed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">Closed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 capitalize">{status}</span>;
    }
  };

  // Filtered employees for dropdown search
  const filteredDropdownEmployees = useMemo(() => {
    if (!empSearchInput.trim()) return allEmployees.slice(0, 15);
    const term = empSearchInput.toLowerCase();
    return allEmployees.filter(emp => {
      const name = (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase();
      const dept = (emp.department || emp.department_name || '').toLowerCase();
      return name.includes(term) || dept.includes(term);
    }).slice(0, 20);
  }, [allEmployees, empSearchInput]);

  const entityTotalPages = Math.max(1, Math.ceil(entityTotalCount / entityPageSize));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans">
      {/* ── Top Header Control Bar (Modeled after LeaveRequests.tsx & MomDashboard.tsx) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Dimension Switcher */}
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-900">Overview</h1>

            {/* Dimension Pills: By Employee | By Site | By Department */}
            {!selectedEntity && (
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setGroupBy('employee')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    groupBy === 'employee' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  By Employee
                </button>
                <button
                  onClick={() => setGroupBy('site')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    groupBy === 'site' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  By Site
                </button>
                <button
                  onClick={() => setGroupBy('department')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    groupBy === 'department' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  By Department
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions & Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search & Select Employee Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={selectedEntity ? "Search this dashboard..." : "Search & select employee..."}
                  value={selectedEntity ? search : empSearchInput}
                  onChange={(e) => {
                    if (selectedEntity) {
                      setSearch(e.target.value);
                    } else {
                      setEmpSearchInput(e.target.value);
                      setEmpDropdownOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (!selectedEntity) setEmpDropdownOpen(true);
                  }}
                  className="pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm w-48 sm:w-60 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                {(selectedEntity ? search : empSearchInput) && (
                  <button
                    onClick={() => {
                      if (selectedEntity) setSearch('');
                      else setEmpSearchInput('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Employee Autocomplete Dropdown */}
              {empDropdownOpen && !selectedEntity && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto z-50 p-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    Select Employee to View Dashboard
                  </div>
                  {filteredDropdownEmployees.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No employees found</div>
                  ) : (
                    filteredDropdownEmployees.map((emp) => {
                      const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectEmployee(emp)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-xs font-semibold text-gray-800 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(name[0] || 'U').toUpperCase()}
                          </div>
                          <span className="truncate">{name}</span>
                          {(emp.department || emp.department_name) && (
                            <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[100px]">
                              {emp.department || emp.department_name}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Status Dropdown (Active when viewing an employee's dashboard) */}
            {selectedEntity && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setEntityPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="All Status">All Status</option>
                <option value="open">Open</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            )}

            {/* Site Filter Dropdown */}
            {!selectedEntity && sites.length > 0 && (
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white max-w-[140px] truncate"
              >
                <option value="">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name || `Site #${s.id}`}</option>
                ))}
              </select>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchSummary();
                if (selectedEntity) fetchEntityPoints();
                else loadBreakdown();
                toast.success('Refreshed data');
              }}
              disabled={loading || summaryLoading || entityPointsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || summaryLoading || entityPointsLoading) ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {filtersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Row */}
        {filtersExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedSiteId('');
                  setStatusFilter('All Status');
                }}
                className="w-full px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CASE 1: EMPLOYEE MOM DASHBOARD (VIEW STYLE) ── */}
      {selectedEntity ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Audited Employee Banner / Switcher */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {(selectedEntity.name[0] || 'U').toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">{selectedEntity.name}</h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Audit View
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  {selectedEntity.department && <span>{selectedEntity.department}</span>}
                  {selectedEntity.department && selectedEntity.site && <span>•</span>}
                  {selectedEntity.site && <span>{selectedEntity.site}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={handleClearSelectedEntity}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors self-start sm:self-center"
            >
              <X className="w-3.5 h-3.5" />
              <span>Back to All {groupBy === 'employee' ? 'Employees' : groupBy === 'site' ? 'Sites' : 'Departments'}</span>
            </button>
          </div>

          {/* 4 KPI Stats Cards (Identical layout to MomDashboard.tsx) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Points */}
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Total Action Items</p>
                  <p className="text-2xl font-bold text-violet-900 mt-1">
                    {selectedEntity.row?.total_points ?? entityTotalCount}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </div>

            {/* Open Points */}
            <div
              onClick={() => { setStatusFilter('open'); setEntityPage(1); }}
              className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-xs cursor-pointer hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Open Action Items</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">
                    {selectedEntity.row?.open_points ?? (entityPoints.filter(p => p.status !== 'completed' && p.status !== 'closed').length)}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>

            {/* Overdue Items */}
            <div
              onClick={() => { setStatusFilter('overdue'); setEntityPage(1); }}
              className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-xs cursor-pointer hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Overdue Items</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">
                    {selectedEntity.row?.overdue ?? 0}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            {/* Completed Items */}
            <div
              onClick={() => { setStatusFilter('completed'); setEntityPage(1); }}
              className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-xs cursor-pointer hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Completed / Closed</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {selectedEntity.row?.closed_last_30d ?? 0}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Items Section for this employee */}
          <div className="space-y-4">
            {/* Sub-Filters: Assigned | Raised | All */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => { setEntitySubTab('assigned'); setEntityPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    entitySubTab === 'assigned' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Assigned ({selectedEntity.name.split(' ')[0]})
                </button>
                <button
                  onClick={() => { setEntitySubTab('raised'); setEntityPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    entitySubTab === 'raised' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Raised by Person
                </button>
                <button
                  onClick={() => { setEntitySubTab('all'); setEntityPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    entitySubTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Points
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Total: <strong className="text-gray-900">{entityTotalCount}</strong> items
              </div>
            </div>

            {/* Action Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {entityPointsLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Loading action items...</p>
                </div>
              ) : entityPoints.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-800">No action items found</h3>
                  <p className="text-xs text-gray-500">
                    No points found for {selectedEntity.name} under current filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Action Item
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Meeting
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Target Date
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Audit Log
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {entityPoints.map((point) => {
                        const isOverdue = point.due_date && new Date(point.due_date) < new Date() && point.status !== 'completed' && point.status !== 'closed';

                        return (
                          <tr
                            key={point.id}
                            onClick={() => {
                              setSelectedPointId(point.id);
                              setIsChatOpen(true);
                            }}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          >
                            {/* Action Item Description */}
                            <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                              <div className="flex items-start gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                                  isOverdue ? 'bg-red-500' : point.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                                }`} />
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {point.point_text}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                                    <span className="font-mono text-[11px]">#{point.id}</span>
                                    {point.raised_by_name && (
                                      <span className="text-[11px] text-gray-500">by {point.raised_by_name}</span>
                                    )}
                                    {point.attachments && point.attachments.length > 0 && (
                                      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500">
                                        <Paperclip className="w-3 h-3" /> {point.attachments.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Meeting */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="text-xs font-semibold text-gray-800 truncate max-w-[170px]">
                                {point.meeting_title || 'Direct Point'}
                              </div>
                              <div className="text-[11px] text-gray-500 truncate max-w-[170px]">
                                {point.location || point.site_name || 'Virtual / Head Office'}
                              </div>
                            </td>

                            {/* Target Date */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {point.due_date ? (
                                <div>
                                  <span className="text-xs font-semibold text-gray-800">
                                    {new Date(point.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                  {isOverdue && (
                                    <span className="block text-[10px] font-bold text-red-600">Overdue</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No target</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {getStatusBadge(point.status)}
                            </td>

                            {/* Discussion Action */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setSelectedPointId(point.id);
                                  setIsChatOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 text-xs font-semibold transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {entityTotalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl border border-gray-200 p-3 gap-3 shadow-xs">
                <div className="text-xs text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{((entityPage - 1) * entityPageSize) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(entityPage * entityPageSize, entityTotalCount)}</span> of <span className="font-semibold text-gray-900">{entityTotalCount}</span> action items
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                    <span>Rows:</span>
                    <select
                      value={entityPageSize}
                      onChange={(e) => {
                        setEntityPageSize(Number(e.target.value));
                        setEntityPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      disabled={entityPage <= 1 || entityPointsLoading}
                      onClick={() => setEntityPage(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <span className="text-xs font-semibold text-gray-700 px-2">
                      Page {entityPage} of {entityTotalPages}
                    </span>

                    <button
                      disabled={entityPage >= entityTotalPages || entityPointsLoading}
                      onClick={() => setEntityPage(prev => Math.min(entityTotalPages, prev + 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── CASE 2: ALL EMPLOYEES / SITES AUDIT TABLE ── */
        <div className="space-y-4">
          {/* Executive Overview KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Overdue Action Items</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{animOverdue}</p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Active Workload</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{animOpen}</p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Awaiting Review</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{animReview}</p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <CheckSquare className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Closed (Last 30d)</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{animClosed}</p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Master Audit Breakdown Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => sortBy('label')} className="inline-flex items-center gap-1 hover:text-blue-600">
                        <span>{groupBy === 'employee' ? 'Employee' : groupBy === 'site' ? 'Site' : 'Department'}</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    {groupBy === 'employee' && (
                      <>
                        <th className="px-3 py-3 font-semibold text-gray-600 uppercase tracking-wider">Site</th>
                        <th className="px-3 py-3 font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                      </>
                    )}
                    <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => sortBy('total')} className="inline-flex items-center gap-1 hover:text-blue-600">
                        <span>Total</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">To Do</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">Doing</th>
                    <th className="px-3 py-3 text-right font-semibold text-purple-700 uppercase tracking-wider">Review</th>
                    <th className="px-3 py-3 text-right font-semibold text-red-600 uppercase tracking-wider">
                      <button onClick={() => sortBy('overdue')} className="inline-flex items-center gap-1 hover:text-red-700">
                        <span>Overdue</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-amber-600 uppercase tracking-wider">
                      <button onClick={() => sortBy('open')} className="inline-flex items-center gap-1 hover:text-amber-700">
                        <span>Open</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-emerald-600 uppercase tracking-wider">
                      <button onClick={() => sortBy('closed')} className="inline-flex items-center gap-1 hover:text-emerald-700">
                        <span>Closed</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-2" />
                        <span>Loading audit records...</span>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.group_key}
                        onClick={() => handleSelectRow(r)}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {(r.label[0] || 'U').toUpperCase()}
                            </div>
                            <span>{r.label}</span>
                          </div>
                        </td>

                        {groupBy === 'employee' && (
                          <>
                            <td className="px-3 py-3 text-gray-600">{r.site_name || '—'}</td>
                            <td className="px-3 py-3 text-gray-600">{r.department_name || '—'}</td>
                          </>
                        )}

                        <td className="px-3 py-3 text-right font-bold text-gray-900">{r.total_points}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{r.to_do || '—'}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{r.doing || '—'}</td>
                        <td className="px-3 py-3 text-right text-purple-700 font-bold">{r.awaiting_review || '—'}</td>

                        <td className="px-3 py-3 text-right">
                          {r.overdue > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                              {r.overdue}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-bold text-amber-700">{r.open_points}</td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-700">{r.closed_last_30d}</td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRow(r);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 group-hover:bg-blue-600 group-hover:text-white text-gray-700 font-semibold text-xs transition-colors shadow-2xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {meta.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl border border-gray-200 p-3 gap-3 shadow-xs">
                <div className="text-xs text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{((page - 1) * pageSize) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(page * pageSize, meta.total)}</span> of <span className="font-semibold text-gray-900">{meta.total}</span> {groupBy === 'employee' ? 'employees' : groupBy === 'site' ? 'sites' : 'departments'}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                    <span>Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      disabled={page <= 1 || loading}
                      onClick={() => setPage(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <span className="text-xs font-semibold text-gray-700 px-2">
                      Page {page} of {Math.max(1, meta.totalPages)}
                    </span>

                    <button
                      disabled={page >= meta.totalPages || loading}
                      onClick={() => setPage(prev => Math.min(meta.totalPages, prev + 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action Item Discussion Chat Modal ── */}
      <ActionItemChat
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setSelectedPointId(null);
        }}
        pointId={selectedPointId}
      />
    </div>
  );
}
