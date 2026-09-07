"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useUserStore } from '@/lib/store/userStore';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  ArrowRightLeft,
  CalendarDays,
  LayoutGrid,
  MessageSquare,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Building,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import ActionItemChat from './ActionItemChat';
import HandoffInbox from './HandoffInbox';
import HandoffDialog from './HandoffDialog';
import PointCard, { PointAction } from './PointCard';
import { abilityFor, mergePointState } from '@/lib/momStatus';

interface MomDashboardProps {
  basePath?: string;
}

interface MomSummary {
  total_meetings: number;
  live_meetings: number;
  upcoming_meetings: number;
  total_points: number;
  open_points: number;
  overdue_points: number;
  awaiting_review: number;
  unassigned_points: number;
  closed_last_30d: number;
  on_time_rate: number | null;
  closed_with_target: number;
}

const EMPTY_SUMMARY: MomSummary = {
  total_meetings: 0,
  live_meetings: 0,
  upcoming_meetings: 0,
  total_points: 0,
  open_points: 0,
  overdue_points: 0,
  awaiting_review: 0,
  unassigned_points: 0,
  closed_last_30d: 0,
  on_time_rate: null,
  closed_with_target: 0,
};

function useCountUp(target: number, duration = 800) {
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

function MomDashboardInner({ basePath = '/employee/mom' }: MomDashboardProps) {
  const router = useRouter();
  const { role, permissions, employee } = useAuth();
  const user = useUserStore(state => state.user);
  const currentEmpId = employee?.id || (user as any)?.employeeId || (user as any)?.employee_id;

  const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';
  const hasPerm = (code: string) => (permissions || []).some((p: any) => (p || '').toUpperCase() === code.toUpperCase());
  const isHRMode = isOrgAdmin || hasPerm('HR_MODE') || hasPerm('MOM_ADMIN');

  // Summary state
  const [summary, setSummary] = useState<MomSummary>(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Filter controls
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown options
  const [sites, setSites] = useState<any[]>([]);

  // Action Items State
  const [actionSubTab, setActiveSubTab] = useState<'all' | 'assigned' | 'raised'>('assigned');
  const [points, setPoints] = useState<any[]>([]);
  const [pointsViewer, setPointsViewer] = useState<any>(null);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [targetDateModalPoint, setTargetDateModalPoint] = useState<any | null>(null);
  const [newTargetDate, setNewTargetDate] = useState('');
  const [targetDateReason, setTargetDateReason] = useState('');
  const [savingTargetDate, setSavingTargetDate] = useState(false);

  const [timelinePoint, setTimelinePoint] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [handoffTarget, setHandoffTarget] = useState<{ id: number; text: string; mode: 'handoff' | 'reassign' } | null>(null);

  // Animated KPI values
  const animatedMeetings = useCountUp(summary.total_meetings);
  const animatedOpenPoints = useCountUp(summary.open_points);
  const animatedOverduePoints = useCountUp(summary.overdue_points);
  const animatedClosedPoints = useCountUp(summary.closed_last_30d || (summary.total_points - summary.open_points));

  // Fetch summary & sites
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await apiClient.get('/mom/overview/summary');
      if (res?.success) {
        setSummary({ ...EMPTY_SUMMARY, ...res.summary });
      }
    } catch (err) {
      console.error('Failed to load MOM summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await apiClient.get('/sites', { format: 'paginated', limit: 1000 });
      setSites(res?.sites || []);
    } catch (e) {
      console.error('Failed to fetch sites:', e);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchSites();
  }, [fetchSummary, fetchSites]);

  // Fetch Action Items with standard pagination
  const fetchActionItems = useCallback(async (targetPage: number = page, targetPageSize: number = pageSize) => {
    try {
      setPointsLoading(true);
      const params: any = {
        type: actionSubTab,
        limit: targetPageSize,
        offset: (targetPage - 1) * targetPageSize
      };
      if (statusFilter && statusFilter !== 'All Status') {
        params.status = statusFilter;
      }
      if (selectedSiteId) {
        params.site_id = selectedSiteId;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search.trim()) params.search = search.trim();

      const res = await apiClient.get('/mom/my-points', params, { withAuth: true });
      if (res?.success) {
        if (res.viewer) setPointsViewer(res.viewer);
        setPoints(res.points || []);
        setTotalCount(res.total || 0);
      } else {
        toast.error(res?.error || 'Failed to load action items');
      }
    } catch (err: any) {
      console.error('Error fetching action items:', err);
    } finally {
      setPointsLoading(false);
    }
  }, [actionSubTab, statusFilter, selectedSiteId, startDate, endDate, search, page, pageSize]);

  // Effect to trigger fetch when pagination or filters change
  useEffect(() => {
    fetchActionItems(page, pageSize);
  }, [page, pageSize, actionSubTab, statusFilter, selectedSiteId, startDate, endDate, fetchActionItems]);

  // Debounced search reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchActionItems(1, pageSize);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRefreshAll = () => {
    fetchSummary();
    fetchActionItems(page, pageSize);
    toast.success('Refreshed data');
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('All Status');
    setSelectedSiteId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Action item handlers
  const handleAcknowledge = async (id: number, e: React.MouseEvent, claiming = false) => {
    e.stopPropagation();
    try {
      const res = await apiClient.put(`/mom/point/acknowledge/${id}`, {}, { withAuth: true });
      if (res?.success) {
        toast.success(res.claimed_from_pool || claiming ? 'You have taken this on' : 'Point acknowledged');
        // Claiming settles ownership, so the pool flags on this row are stale.
        setPoints(prev => prev.map(p => p.id === id
          ? { ...mergePointState(p, res), is_claimable: 0 }
          : p));
        fetchSummary();
      }
    } catch (err: any) {
      // Losing the race for a pooled point is a normal outcome, not a failure.
      const claimedBy = err?.data?.claimed_by || err?.claimed_by;
      if (err?.status === 409 || err?.data?.code === 'already_claimed') {
        toast(claimedBy ? `${claimedBy} picked this up first.` : 'Someone else picked this up first.');
        setPoints(prev => prev.map(p => p.id === id ? { ...p, is_claimable: 0 } : p));
        return;
      }
      toast.error(err?.message || 'Failed to acknowledge');
    }
  };

  const handleMarkDone = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.put(`/mom/point/complete/${id}`, {}, { withAuth: true });
      if (res?.success) {
        toast.success('Point marked as completed');
        setPoints(prev => prev.map(p => p.id === id ? mergePointState(p, res) : p));
        fetchSummary();
      }
    } catch {
      toast.error('Failed to mark done');
    }
  };

  const handleApprove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.put(`/mom/point/approve/${id}`, {}, { withAuth: true });
      if (res?.success) {
        toast.success('Point approved & closed ✓');
        fetchActionItems(page, pageSize);
        fetchSummary();
      }
    } catch {
      toast.error('Failed to approve point');
    }
  };

  const handleReject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.put(`/mom/point/reject/${id}`, {}, { withAuth: true });
      if (res?.success) {
        toast.success('Point sent back for rework');
        setPoints(prev => prev.map(p => p.id === id ? mergePointState(p, res) : p));
        fetchSummary();
      }
    } catch {
      toast.error('Failed to send back');
    }
  };

  const handleOpenTargetDateModal = (point: any) => {
    setTargetDateModalPoint(point);
    setNewTargetDate(point.due_date ? String(point.due_date).split('T')[0] : '');
    setTargetDateReason('');
  };

  const handleSaveTargetDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDateModalPoint) return;
    if (!targetDateReason.trim()) {
      toast.error('Please provide a reason for updating the target date');
      return;
    }
    setSavingTargetDate(true);
    try {
      const res = await apiClient.patch(`/mom/point/due-date/${targetDateModalPoint.id}`, {
        due_date: newTargetDate || null,
        reason: targetDateReason.trim(),
      }, { withAuth: true });
      if (res?.success) {
        toast.success('Target date updated');
        setPoints(prev => prev.map(p => p.id === targetDateModalPoint.id ? { ...p, due_date: newTargetDate || null } : p));
        setTargetDateModalPoint(null);
        fetchSummary();
      } else {
        toast.error(res?.message || 'Failed to update target date');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update target date');
    } finally {
      setSavingTargetDate(false);
    }
  };

  const handleOpenTimeline = async (point: any) => {
    setTimelinePoint(point);
    setLoadingTimeline(true);
    try {
      const res = await apiClient.get(`/mom/points/${point.id}/events`, undefined, { withAuth: true });
      if (res?.success && res.events && res.events.length > 0) {
        setTimelineEvents(res.events);
      } else {
        const fallback: any[] = [];
        (point.due_date_history || []).forEach((h: any) => {
          fallback.push({
            id: `due_${h.id}`,
            event_type: 'due_date_changed',
            actor_name: h.changed_by_name,
            from: h.old_date,
            to: h.new_date,
            reason: h.reason,
            created_at: h.changed_at
          });
        });
        (point.history || []).forEach((h: any) => {
          fallback.push({
            id: `hist_${h.id}`,
            event_type: h.field_name || 'updated',
            actor_name: h.editor_name,
            from: h.old_value,
            to: h.new_value,
            reason: h.reason,
            created_at: h.created_at
          });
        });
        setTimelineEvents(fallback.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch {
      setTimelineEvents([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Helper for status badge styling
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans">
      {/* ── Top Header Control Bar (Modeled after LeaveRequests.tsx) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title */}
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900">Minutes of Meeting</h1>
          </div>

          {/* Quick Actions & Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search action items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm w-44 sm:w-60 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="All Status">All Status</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>

            {/* Site Dropdown */}
            {sites.length > 0 && (
              <select
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white max-w-[150px] truncate"
              >
                <option value="">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name || `Site #${s.id}`}</option>
                ))}
              </select>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefreshAll}
              disabled={summaryLoading || pointsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${(summaryLoading || pointsLoading) ? 'animate-spin' : ''}`} />
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
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI Stats Cards (Grid of 4 with useCountUp, identical to LeaveRequests.tsx) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Meetings (Links to Meeting List) */}
        <div
          onClick={() => router.push(`${basePath}/list`)}
          className="bg-violet-50 rounded-xl p-4 border border-violet-100 cursor-pointer hover:shadow-md transition-all group"
          title="Click to view all meetings"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Total Meetings</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{animatedMeetings}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>

        {/* Open Action Items */}
        <div
          onClick={() => { setStatusFilter('open'); setPage(1); }}
          className="bg-amber-50 rounded-xl p-4 border border-amber-100 cursor-pointer hover:shadow-md transition-all group"
          title="Filter open action items"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Open Action Items</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{animatedOpenPoints}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Overdue Action Items */}
        <div
          onClick={() => { setStatusFilter('overdue'); setPage(1); }}
          className="bg-red-50 rounded-xl p-4 border border-red-100 cursor-pointer hover:shadow-md transition-all group"
          title="Filter overdue items"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Overdue Items</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{animatedOverduePoints}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        {/* Completed Items */}
        <div
          onClick={() => { setStatusFilter('completed'); setPage(1); }}
          className="bg-green-50 rounded-xl p-4 border border-green-100 cursor-pointer hover:shadow-md transition-all group"
          title="Filter completed items"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Completed / Closed</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{animatedClosedPoints}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Action Items View ── */}
      <div className="space-y-4">
        {/* Sub-Filters & View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          {/* Subtabs: Assigned to Me (Default) | All Points | Raised by Me */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => { setActiveSubTab('assigned'); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                actionSubTab === 'assigned'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => { setActiveSubTab('all'); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                actionSubTab === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Points
            </button>
            <button
              onClick={() => { setActiveSubTab('raised'); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                actionSubTab === 'raised'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Raised by Me
            </button>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Total: <strong className="text-gray-900 font-bold">{totalCount}</strong> action items
          </div>
        </div>

        {/* Handoff Inbox for pending handover requests */}
        <HandoffInbox onChanged={() => fetchActionItems(page, pageSize)} />

        {/* ── Cards View (Streamlined Executive Action Items) ── */}
        <div>
          {pointsLoading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200 shadow-xs">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Loading action items...</p>
            </div>
          ) : points.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No action items found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {search || statusFilter !== 'All Status'
                  ? 'Try adjusting your filters or search keywords.'
                  : 'No action items to display under this section.'}
              </p>
              {(search || statusFilter !== 'All Status' || startDate || endDate) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {points.map((point) => {
                // One source for who may do what. See momStatus.ts — the three
                // screens used to carry three drifting copies of this, each
                // ORing a raw legacy-status test against the lifecycle test.
                const ability = abilityFor(point, {
                  employeeId: currentEmpId,
                  isAdmin: isOrgAdmin || isHRMode,
                  departmentId: pointsViewer?.department_id,
                });
                const isReviewer = ability.isReviewer;

                const actions: PointAction[] = [];

                // Each state offers exactly one next step to the person who
                // owns it, so these branches are mutually exclusive.
                if (ability.canStart) {
                  actions.push({
                    key: 'ack',
                    label: 'Acknowledge',
                    kind: 'primary',
                    icon: Check,
                    onClick: (e: React.MouseEvent) => handleAcknowledge(point.id, e),
                  });
                }
                // Pooled to this person's department and still nobody's.
                // Worded as a claim: pressing it takes the work off everyone
                // else who can see it.
                if (ability.canClaim) {
                  actions.push({
                    key: 'claim',
                    label: "I'll take this",
                    kind: 'primary',
                    icon: Check,
                    onClick: (e: React.MouseEvent) => handleAcknowledge(point.id, e, true),
                  });
                }
                if (ability.canSubmit) {
                  actions.push({
                    key: 'done',
                    label: 'Mark Done',
                    kind: 'primary',
                    icon: Check,
                    onClick: (e: React.MouseEvent) => handleMarkDone(point.id, e),
                  });
                }
                if (ability.canVerify) {
                  actions.push({
                    key: 'approve',
                    label: 'Approve',
                    kind: 'primary',
                    icon: Check,
                    onClick: (e: React.MouseEvent) => handleApprove(point.id, e),
                  });
                }
                if (ability.canReturn) {
                  actions.push({
                    key: 'return',
                    label: 'Return',
                    kind: 'danger',
                    onClick: (e: React.MouseEvent) => handleReject(point.id, e),
                  });
                }
                if (ability.canHandOff) {
                  actions.push({
                    key: 'handoff',
                    label: 'Hand over',
                    icon: ArrowRightLeft,
                    onClick: (e: React.MouseEvent) => {
                      e.stopPropagation();
                      setHandoffTarget({ id: point.id, text: point.point_text, mode: 'handoff' });
                    },
                  });
                } else if (ability.canReassign) {
                  actions.push({
                    key: 'reassign',
                    label: 'Reassign',
                    icon: ArrowRightLeft,
                    onClick: (e: React.MouseEvent) => {
                      e.stopPropagation();
                      setHandoffTarget({ id: point.id, text: point.point_text, mode: 'reassign' });
                    },
                  });
                }

                return (
                  <PointCard
                    key={point.id}
                    point={point}
                    actions={actions}
                    viewerIsReviewer={isReviewer}
                    onOpenTimeline={() => handleOpenTimeline(point)}
                    onEditDueDate={() => handleOpenTargetDateModal(point)}
                    onOpen={() => {
                      setSelectedPointId(point.id);
                      setIsChatOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pagination Footer (Styled Identically to LeaveRequests.tsx) ── */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl border border-gray-200 p-3 gap-3 shadow-xs">
            <div className="text-xs text-gray-600">
              Showing <span className="font-semibold text-gray-900">{((page - 1) * pageSize) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-semibold text-gray-900">{totalCount}</span> action items
            </div>

            <div className="flex items-center space-x-3">
              {/* Rows Selector */}
              <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Page / Next */}
              <div className="flex items-center space-x-1">
                <button
                  disabled={page <= 1 || pointsLoading}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-semibold text-gray-700 px-2">
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages || pointsLoading}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* ── Target Date Reason Modal (Mandatory Reason) ── */}
      {targetDateModalPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Update Target Date</span>
              </h3>
              <button
                onClick={() => setTargetDateModalPoint(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTargetDate} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Action Point</label>
                <p className="text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-medium">
                  {targetDateModalPoint.point_text}
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">New Target Date</label>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Reason for Date Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={targetDateReason}
                  onChange={(e) => setTargetDateReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why the target date is changing (required)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTargetDateModalPoint(null)}
                  disabled={savingTargetDate}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTargetDate || !targetDateReason.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingTargetDate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Target Date</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Point Timeline & Audit Modal ── */}
      {timelinePoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <span>Activity & Timeline</span>
                </h3>
                <p className="text-xs text-gray-500 truncate max-w-md mt-0.5 font-medium">
                  {timelinePoint.point_text}
                </p>
              </div>
              <button
                onClick={() => setTimelinePoint(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {loadingTimeline ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading timeline events...</p>
                </div>
              ) : timelineEvents.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No recorded timeline events for this action item yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-100 ml-3 pl-4 space-y-4">
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-900 capitalize">
                            {evt.event_type?.replace(/_/g, ' ') || 'Event'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {evt.created_at ? new Date(evt.created_at).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : ''}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600">
                          <span className="font-medium text-gray-500">Action by: </span>
                          <span className="font-semibold text-gray-800">{evt.actor_name || 'System'}</span>
                        </div>

                        {(evt.from || evt.to) && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-0.5">
                            {evt.from && <span>From: <strong className="text-gray-700">{evt.from}</strong></span>}
                            {evt.from && evt.to && <span>→</span>}
                            {evt.to && <span>To: <strong className="text-gray-700">{evt.to}</strong></span>}
                          </div>
                        )}

                        {evt.reason && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 rounded px-2 py-1 mt-1">
                            <span className="font-semibold">Reason: </span>
                            <span>{evt.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setTimelinePoint(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
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

      {/* ── Handoff / Reassign Dialog ── */}
      {handoffTarget && (
        <HandoffDialog
          pointId={handoffTarget.id}
          pointText={handoffTarget.text}
          mode={handoffTarget.mode}
          onClose={() => setHandoffTarget(null)}
          onDone={() => {
            setHandoffTarget(null);
            fetchActionItems(page, pageSize);
            fetchSummary();
          }}
        />
      )}
    </div>
  );
}

export default function MomDashboardComponent(props: MomDashboardProps) {
  return <MomDashboardInner {...props} />;
}
