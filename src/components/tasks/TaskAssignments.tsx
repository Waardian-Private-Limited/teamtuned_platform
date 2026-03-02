"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import {
  Loader2, AlertCircle, Calendar, RefreshCw, MoreVertical, Eye, Edit2,
  ToggleLeft, ToggleRight, Trash2, Shield, LayoutGrid, CheckCircle,
  Clock, XCircle, Search, Filter, Plus, ChevronDown, ChevronUp, Users,
  Briefcase, ChevronLeft, ChevronRight, FileText
} from "lucide-react";
import TaskAssignmentViewer from "@/components/tasks/TaskAssignmentViewer";
import TaskCreate from "@/components/tasks/TaskCreate";

import { useAuth } from "@/context/AuthContext";

type Task = {
  id: number;
  title?: string | null;
  template_id: number;
  site_id?: number | null;
  site_name?: string | null;
  assignment_type: string;
  recurrence: string;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  assignee_count?: number;
  site_count?: number;
  assignee_names?: string | null;
  assignee_designations?: string | null;
};

type DashboardStats = {
  tasksCounts: { total: number; active: number; paused: number; cancelled: number };
  assignmentCounts: { assigned: number; pending: number; approved: number; rejected: number };
};

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const start = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      setCount(Math.floor(target * percentage));
      if (progress < duration) {
        animationFrame = requestAnimationFrame(start);
      } else {
        setCount(target);
      }
    };
    animationFrame = requestAnimationFrame(start);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);
  return count;
}

export default function TaskAssignments({ role = "org" }: { role?: "org" | "employee" }) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showDataCollection, setShowDataCollection] = React.useState(false);
  const [viewTaskId, setViewTaskId] = React.useState<number | null>(null);

  // Filters
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filters, setFilters] = React.useState<{ status?: string; recurrence?: string }>({});
  const [sites, setSites] = React.useState<Array<{ id: number; name: string }>>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | undefined>(undefined);

  // Pagination
  const [loadingTasks, setLoadingTasks] = React.useState(false);
  const [page, setPage] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(10);
  const [total, setTotal] = React.useState<number>(0);
  const [hasNext, setHasNext] = React.useState<boolean>(false);

  // Auth
  const { role: authRole, user, employee, permissions, loading: authLoading } = useAuth();
  const isOrgAdmin = (authRole || "").toLowerCase() === "orgadmin";
  const canView = isOrgAdmin || permissions.some(p => ["TASK_VIEW", "TASK_ASSIGN"].includes(p));
  const canCreate = isOrgAdmin || permissions.some(p => ["TASK_CREATE", "TASK_TEMPLATES"].includes(p));

  // Load Dashboard Stats
  useEffect(() => {
    if (!canView) return;
    (async () => {
      try {
        const res = await apiClient<DashboardStats>("/tasks/dashboard", { method: "GET", withAuth: true });
        setStats(res);
      } catch (_) { }
    })();
  }, [canView, role]);

  const loadTasks = React.useCallback(async () => {
    if (!canView) return;
    setError(null);
    setLoadingTasks(true);
    try {
      const q: string[] = ["format=paginated", `page=${page}`, `limit=${limit}`];
      if (filters.status) q.push(`status=${encodeURIComponent(filters.status)}`);
      if (filters.recurrence) q.push(`recurrence=${encodeURIComponent(filters.recurrence)}`);
      if (selectedSiteId) q.push(`site_id=${encodeURIComponent(String(selectedSiteId))}`);
      // if (searchTerm) q.push(`search=${encodeURIComponent(searchTerm)}`); 

      const qs = q.length ? `?${q.join("&")}` : "";
      const res = await apiClient<{ items: Task[]; total: number; page: number; limit: number; hasNext: boolean }>(`/tasks${qs}`, { method: "GET", withAuth: true });
      const items = Array.isArray((res as any)?.items) ? (res as any).items : [];
      setTasks(items);
      setTotal((res as any)?.total || items.length);
      setHasNext(!!(res as any)?.hasNext);
    } catch (e: any) {
      setError(e?.message || "Failed to load tasks");
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [filters, selectedSiteId, page, limit, canView, searchTerm]);

  React.useEffect(() => {
    if (!authLoading && canView) {
      loadTasks();
    }
  }, [loadTasks, authLoading, canView]);

  React.useEffect(() => {
    (async () => {
      try {
        if (isOrgAdmin) {
          const res = await apiClient<any>("/sites", { method: "GET", withAuth: true });
          const list = Array.isArray(res) ? res : (Array.isArray(res?.sites) ? res.sites : []);
          setSites(list);
        } else {
          // Fetch assigned sites from API directly
          const res = await apiClient<any>("/sites?assigned_only=true", { method: "GET", withAuth: true });
          const list = Array.isArray(res) ? res : (Array.isArray(res?.sites) ? res.sites : []);
          setSites(list);
        }
      } catch { }
    })();
  }, [isOrgAdmin, employee]);

  const runScheduler = async () => {
    setRunning(true);
    try {
      await apiClient(`/tasks/scheduler/run`, { method: "POST", withAuth: true });
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || "Failed to run scheduler");
    } finally {
      setRunning(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient(`/tasks/${id}/status`, { method: "POST", withAuth: true, body: { status } });
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await apiClient(`/tasks/${id}`, { method: "DELETE", withAuth: true });
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || "Failed to delete task");
    }
  };

  // Action State
  const [confirm, setConfirm] = React.useState<{ type: 'status' | 'delete'; taskId: number; next?: 'active' | 'paused' | 'cancelled' } | null>(null);
  const [edit, setEdit] = React.useState<{ id: number; form: any } | null>(null);
  const [viewDetails, setViewDetails] = React.useState<any | null>(null);

  const startEdit = async (id: number) => {
    try {
      const res = await apiClient<any>(`/tasks/${id}`, { method: 'GET', withAuth: true });
      const t = res?.task || {};
      const assignees = Array.isArray(res?.assignees) ? res.assignees.map((a: any) => Number(a.user_id)).filter((n: number) => Number.isFinite(n)) : [];
      const approvalChain = Array.isArray(res?.approval_chain) ? res.approval_chain : [];
      setEdit({
        id, form: {
          id,
          title: t.title || '',
          description: t.description || '',
          template_id: t.template_id || '',
          site_id: t.site_id || '',
          assignment_type: t.assignment_type || 'single',
          recurrence: t.recurrence || 'one_time',
          start_date: t.start_date || '',
          end_date: t.end_date || '',
          due_time: t.due_time || '',
          requires_approval: !!t.requires_approval,
          assignees,
          approval_chain: approvalChain,
          is_data_collection: !!t.is_data_collection,
          shared_completion_mode: t.shared_completion_mode || 'individual',
          target_role_id: t.target_role_id ? String(t.target_role_id) : '',
          target_department_id: t.target_department_id ? String(t.target_department_id) : ''
        }
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load task');
    }
  };

  const viewTask = async (id: number) => {
    try {
      const res = await apiClient<any>(`/tasks/${id}`, { method: 'GET', withAuth: true });
      const viewObj = {
        ...(res?.task || {}),
        assignees: Array.isArray(res?.assignees) ? res.assignees : [],
        approval_chain: Array.isArray(res?.approval_chain) ? res.approval_chain : [],
      };
      setViewDetails(viewObj);
    } catch (e: any) {
      setError(e?.message || 'Failed to load task');
    }
  };

  const ActionDropdown = ({ task }: { task: Task }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [placeUp, setPlaceUp] = useState(false);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setPlaceUp(spaceBelow < 200);
      }
    }, [isOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div
              className={`fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 ${placeUp ? 'mb-2' : 'mt-2'}`}
              style={{
                left: triggerRef.current?.getBoundingClientRect().left! - 160 + 'px',
                top: placeUp ? 'auto' : triggerRef.current?.getBoundingClientRect().bottom! + 'px',
                bottom: placeUp ? (window.innerHeight - triggerRef.current?.getBoundingClientRect().top!) + 'px' : 'auto'
              }}
            >
              <button onClick={() => { setViewTaskId(task.id); setIsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <Eye className="w-4 h-4" /> <span>View Submissions</span>
              </button>
              <button onClick={() => { startEdit(task.id); setIsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <Edit2 className="w-4 h-4" /> <span>Edit Task</span>
              </button>
              <button onClick={() => { viewTask(task.id); setIsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <Briefcase className="w-4 h-4" /> <span>View Details</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              {task.status !== 'active' ? (
                <button onClick={() => { setConfirm({ type: 'status', taskId: task.id, next: 'active' }); setIsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 text-left">
                  <ToggleRight className="w-4 h-4" /> <span>Activate</span>
                </button>
              ) : (
                <button onClick={() => { setConfirm({ type: 'status', taskId: task.id, next: 'paused' }); setIsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 text-left">
                  <ToggleLeft className="w-4 h-4" /> <span>Pause</span>
                </button>
              )}
              <button onClick={() => { setConfirm({ type: 'delete', taskId: task.id }); setIsOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 text-left">
                <Trash2 className="w-4 h-4" /> <span>Delete</span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const StatsCard = ({ title, count, icon: Icon, color, onClick, isActive }: any) => {
    const animatedCount = useCountUp(count);

    // Map colors to background classes
    const colorMap: Record<string, { bg: string; border: string; text: string; textDark: string }> = {
      'bg-green-500': { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', textDark: 'text-green-900' },
      'bg-yellow-500': { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-600', textDark: 'text-yellow-900' },
      'bg-red-500': { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', textDark: 'text-red-900' },
      'bg-indigo-500': { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', textDark: 'text-indigo-900' },
    };

    const colors = colorMap[color] || { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-600', textDark: 'text-gray-900' };

    return (
      <div
        onClick={onClick}
        className={`${colors.bg} rounded-xl p-4 border ${colors.border} cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider ${colors.text}`}>{title}</p>
            <p className={`text-2xl font-bold mt-1 ${colors.textDark}`}>{animatedCount}</p>
          </div>
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
        </div>
      </div>
    );
  };

  if (viewTaskId != null) {
    return <TaskAssignmentViewer taskId={viewTaskId} onClose={() => setViewTaskId(null)} />;
  }

  if (authLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  if (!canView) return <div className="p-10 text-center text-gray-500">Access Denied</div>;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">

      {/* 1. Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="px-2">
            <h1 className="text-xl font-bold text-gray-900">Task Management</h1>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {role === "org" && (
              <button
                onClick={runScheduler}
                disabled={running}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
                <span>{running ? "Running..." : "Scheduler"}</span>
              </button>
            )}
            {canCreate && (
              <>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Task</span>
                </button>
                <button
                  onClick={() => setShowDataCollection(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  <span>Data Collection Form</span>
                </button>
              </>
            )}
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 px-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <select
                value={filters.recurrence || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, recurrence: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Recurrences</option>
                <option value="one_time">One Time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select
                value={selectedSiteId ? String(selectedSiteId) : ''}
                onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={loadTasks} className="flex-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Apply</button>
                <button
                  onClick={() => {
                    setFilters({});
                    setSelectedSiteId(undefined);
                    setSearchTerm("");
                    loadTasks(); // Trigger reload
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Active"
          count={stats?.tasksCounts?.active || 0}
          icon={Briefcase}
          color="bg-green-500"
          onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'active' ? '' : 'active' }))}
          isActive={filters.status === 'active'}
        />
        <StatsCard
          title="Paused"
          count={stats?.tasksCounts?.paused || 0}
          icon={Clock}
          color="bg-yellow-500"
          onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'paused' ? '' : 'paused' }))}
          isActive={filters.status === 'paused'}
        />
        <StatsCard
          title="Cancelled"
          count={stats?.tasksCounts?.cancelled || 0}
          icon={XCircle}
          color="bg-red-500"
          onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'cancelled' ? '' : 'cancelled' }))}
          isActive={filters.status === 'cancelled'}
        />
        <StatsCard
          title="Total"
          count={stats?.tasksCounts?.total || 0}
          icon={LayoutGrid}
          color="bg-indigo-500"
          onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
          isActive={!filters.status}
        />
      </div>

      {/* 3. Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Name</th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignees</th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingTasks ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-100 rounded" />
                        <div className="h-3 w-20 bg-gray-100 rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-16 bg-gray-100 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-8 ml-auto bg-gray-100 rounded" /></td>
                  </tr>
                ))
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Briefcase className="w-10 h-10 mb-3 opacity-20" />
                      <h3 className="text-sm font-medium text-gray-900">No tasks found</h3>
                      <p className="text-xs text-gray-500 mt-1">Adjust filters or create a new task.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 line-clamp-1 text-sm">{task.title || `Task #${task.id}`}</div>
                        <div className="text-xs text-gray-500 capitalize">{task.assignment_type}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="capitalize">{task.recurrence.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                        <Users className="w-3.5 h-3.5" />
                        <span>{task.assignee_count || 0}</span>
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-[150px]">{task.assignee_names}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {task.site_name || (task.site_count ? `${task.site_count} Sites` : 'All Sites')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${task.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                        task.status === 'paused' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionDropdown task={task} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pagination Card */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 px-2">
            Page {page} of {totalPages} ({total} items)
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Rows:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={!hasNext}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals placed at bottom */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900">Generate Task</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <TaskCreate mode="create" defaultSiteId={selectedSiteId} onSaved={() => { setShowCreate(false); loadTasks(); }} onCancel={() => setShowCreate(false)} />
            </div>
          </div>
        </div>
      )}

      {showDataCollection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-purple-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-purple-900">Create Data Collection Form</h2>
              </div>
              <button
                onClick={() => setShowDataCollection(false)}
                className="p-2 rounded-full hover:bg-purple-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-purple-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <TaskCreate
                mode="create"
                defaultSiteId={selectedSiteId}
                initialDataCollection={true}
                onSaved={() => { setShowDataCollection(false); loadTasks(); }}
                onCancel={() => setShowDataCollection(false)}
              />
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 m-4 animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-full ${confirm.type === 'delete' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                <AlertCircle className={`w-6 h-6 ${confirm.type === 'delete' ? 'text-red-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
                <p className="text-sm text-gray-500">
                  {confirm.type === 'delete' ? 'Are you sure you want to delete this task? This action cannot be undone.' : `Are you sure you want to change status to ${confirm.next}?`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors border"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirm.type === 'delete') {
                    await deleteTask(confirm.taskId);
                  } else {
                    await updateStatus(confirm.taskId, confirm.next!);
                  }
                  setConfirm(null);
                }}
                className={`px-4 py-2 text-white rounded-xl font-medium transition-colors ${confirm.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Task Details</h2>
              <button onClick={() => setViewDetails(null)} className="p-2 rounded-full hover:bg-gray-200"><XCircle className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <TaskCreate mode="view" initialTask={viewDetails} initialAssignees={Array.isArray(viewDetails?.assignees) ? viewDetails.assignees.map((a: any) => a.user_id) : undefined} initialApprovalChain={viewDetails?.approval_chain} readOnly />
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Edit Task</h2>
              <button onClick={() => setEdit(null)} className="p-2 rounded-full hover:bg-gray-200"><XCircle className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <TaskCreate
                mode="edit"
                initialTask={edit.form}
                initialAssignees={edit.form.assignees}
                initialApprovalChain={edit.form.approval_chain}
                onSaved={() => { setEdit(null); loadTasks(); }}
                onCancel={() => setEdit(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
