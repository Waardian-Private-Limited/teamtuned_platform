
"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { X, Check, Search, Filter, Calendar, MapPin, Download, Printer, Eye, ChevronLeft, ChevronRight, MoreVertical, FileText, Phone, Loader2, AlertCircle, User, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

import { useAuth } from "@/context/AuthContext";

// useCountUp hook for animated numbers
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
type Assignment = {
  id: number;
  task_id: number;
  site_id?: number | null;
  user_id?: number | null;
  occurrence_date?: string;
  status: string;
  submission_id?: number | null;
  submitted_at?: string | null;
  remarks?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  designation?: string | null;
  site_name?: string | null;
  // Employee Data Fields
  email?: string | null;
  phone?: string | null;
  department_name?: string | null;
  role_name?: string | null;
  site_ids?: number[];
  onboarding_token_expires_at?: string | null;
};

export default function TaskAssignmentViewer({ taskId, onClose }: { taskId: number; onClose: () => void }) {
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [timezone, setTimezone] = React.useState<string>('Asia/Kolkata');
  const [taskTitle, setTaskTitle] = React.useState<string>('');
  const [taskDescription, setTaskDescription] = React.useState<string>('');
  const [viewSubmissionId, setViewSubmissionId] = React.useState<number | null>(null);
  const [viewerLoading, setViewerLoading] = React.useState(false);
  const [viewerError, setViewerError] = React.useState<string | null>(null);
  const [viewerData, setViewerData] = React.useState<any>(null);
  const [viewerApprovals, setViewerApprovals] = React.useState<any[]>([]);
  const [expandedGps, setExpandedGps] = React.useState<Set<string>>(new Set());
  const [viewerFields, setViewerFields] = React.useState<any[]>([]);
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [canApprove, setCanApprove] = React.useState(false); // Permission flag from backend
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null); // For image modal
  const [sites, setSites] = React.useState<Array<{ id: number; name: string }>>([]);

  // Task specific metadata
  const [isDataCollection, setIsDataCollection] = React.useState(false);
  const [taskAssignmentType, setTaskAssignmentType] = React.useState('');
  const [taskTargetDetails, setTaskTargetDetails] = React.useState<{ roleId?: number; deptId?: number }>({});

  const [status, setStatus] = React.useState<string>('');
  const [siteId, setSiteId] = React.useState<string>('');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [range, setRange] = React.useState<string>('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(20);
  const [total, setTotal] = React.useState<number>(0);
  const [hasNext, setHasNext] = React.useState<boolean>(false);
  const [backendStats, setBackendStats] = React.useState({ total: 0, approved: 0, rejected: 0, today: 0 });

  const [showExportModal, setShowExportModal] = React.useState(false);
  const [exportMode, setExportMode] = React.useState<'local' | 'email'>('local');
  const [exportFrom, setExportFrom] = React.useState('');
  const [exportTo, setExportTo] = React.useState('');
  const [exportEmails, setExportEmails] = React.useState('');
  const [exporting, setExporting] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  React.useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const { user, employee } = useAuth();



  const doExport = async () => {
    if (!exportFrom || !exportTo) { showToast('Please select From and To dates', 'error'); return; }
    setExporting(true);
    try {
      if (exportMode === 'local') {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
        const url = `${base}/tasks/${taskId}/assignments/export`;
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ mode: 'local', date_from: exportFrom, date_to: exportTo }),
        });
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const ct = res.headers.get('content-type') || '';
        const cd = res.headers.get('content-disposition') || '';
        const ext = ct.includes('spreadsheetml') ? 'xlsx' : 'xls';
        let fileName = `task_${taskId}_assignments_${exportFrom}_${exportTo}.${ext}`;
        const match = cd.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          fileName = match[1].trim();
        }
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setShowExportModal(false);
      } else {
        const emails = exportEmails.split(',').map((s) => s.trim()).filter(Boolean);
        if (!emails.length) { showToast('Please enter one or more emails', 'error'); setExporting(false); return; }
        await apiClient(`/tasks/${taskId}/assignments/export`, {
          method: 'POST',
          withAuth: true,
          body: { mode: 'email', date_from: exportFrom, date_to: exportTo, emails },
        });
        setShowExportModal(false);
        showToast('Export will be sent by email', 'success');
      }
    } catch (e: any) {
      showToast(e?.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (status) params.approval_status = status;
      if (siteId) params.site_id = siteId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (range) params.range = range;
      if (searchTerm) params.q = searchTerm;
      params.format = 'paginated';
      params.page = String(page);
      params.limit = String(limit);
      const res = await apiClient<{ items: Assignment[]; total: number; page: number; limit: number; hasNext: boolean } | Assignment[]>(`/tasks/${taskId}/assignments`, { method: "GET", withAuth: true, params });
      if (Array.isArray(res)) {
        setAssignments(res);
        setTotal(res.length);
        setHasNext(false);
      } else {
        const responseData = res as any;
        // Support both 'items' (old) and 'data' (new) formats
        const items = Array.isArray(responseData?.items)
          ? responseData.items
          : (Array.isArray(responseData?.data) ? responseData.data : []);

        setAssignments(items);
        setTotal(Number(responseData?.total || 0));
        setHasNext(!!responseData?.hasNext);
        if (responseData?.stats) {
          setBackendStats(responseData.stats);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [taskId, status, siteId, dateFrom, dateTo, range, searchTerm, page, limit]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<any>(`/tasks/${taskId}`, { method: 'GET', withAuth: true });
        const tz = (res?.task?.timezone || '').toString().trim();
        if (tz) setTimezone(tz);
        const title = (res?.task?.title || '').toString();
        const desc = (res?.task?.description || '').toString();
        setTaskTitle(title);
        setTaskDescription(desc);
        setIsDataCollection(!!res?.task?.is_data_collection);
        setTaskAssignmentType(res?.task?.assignment_type || '');
        setTaskTargetDetails({
          roleId: res?.task?.target_role_id ? Number(res.task.target_role_id) : undefined,
          deptId: res?.task?.target_department_id ? Number(res.task.target_department_id) : undefined
        });
      } catch (_) { }
    })();
  }, [taskId]);

  React.useEffect(() => {
    (async () => {
      try {
        const s = await apiClient<{ sites: any[] }>("/sites", { method: "GET", withAuth: true });
        const normalized = (s?.sites || []).map((x: any) => ({ id: Number(x.id), name: String(x.name || x.code || x.id) }));
        setSites(normalized);
      } catch (e) {
        try {
          // Fallback to employee's assigned sites from auth context
          const authorizedSites = (employee as any)?.sites || [];
          const normalized = authorizedSites.map((x: any) => ({ id: Number(x.id), name: String(x.name || x.code || x.id) }));
          setSites(normalized);
        } catch { }
      }
    })();
  }, []);

  const formatDate = (s?: string | null) => {
    if (!s) return '-';
    let dt: Date;
    if (s.includes('T')) {
      dt = new Date(s);
      if (Number.isNaN(dt.getTime())) dt = new Date();
    } else {
      const parts = s.split(' ')[0].split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      dt = new Date(Date.UTC(y, m, d));
    }
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: timezone }).format(dt);
  };

  const openViewer = async (sid: number) => {
    setViewSubmissionId(sid);
    setViewerLoading(true);
    setViewerError(null);
    try {
      const res = await apiClient<any>(`/tasks/${taskId}/submissions/${sid}`, { method: 'GET', withAuth: true });
      const data = res?.data || null;
      const approvals = Array.isArray(res?.approvals) ? res.approvals : [];
      const canApproveFlag = res?.canApprove === true; // Get from backend
      setViewerData(data);
      setViewerApprovals(approvals);
      setViewerFields(res?.fields || []);
      setCanApprove(canApproveFlag); // Set permission flag
    } catch (e: any) {
      setViewerError(e?.message || 'Failed to load submission');
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    setViewSubmissionId(null);
    setViewerLoading(false);
    setViewerError(null);
    setViewerData(null);
    setViewerApprovals([]);
    setExpandedGps(new Set());
    setViewerFields([]);
    setCanApprove(false); // Reset permission flag
  };

  const handleApprove = async () => {
    if (!viewSubmissionId) return;
    setApproving(true);
    try {
      await apiClient(`/tasks/${taskId}/submissions/${viewSubmissionId}/approve`, {
        method: 'POST',
        withAuth: true,
        body: { comments: 'Approved via web viewer' }
      });
      showToast('Submission approved successfully', 'success');
      closeViewer();
      load(); // Refresh the list
    } catch (e: any) {
      showToast(e?.message || 'Failed to approve submission', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!viewSubmissionId) return;
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!viewSubmissionId || !rejectionReason.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }

    setRejecting(true);
    try {
      await apiClient(`/tasks/${taskId}/submissions/${viewSubmissionId}/reject`, {
        method: 'POST',
        withAuth: true,
        body: { comments: rejectionReason }
      });
      showToast('Submission rejected', 'success');
      setShowRejectModal(false);
      setRejectionReason('');
      closeViewer();
      load(); // Refresh the list
    } catch (e: any) {
      showToast(e?.message || 'Failed to reject submission', 'error');
    } finally {
      setRejecting(false);
    }
  };

  // Image modal helpers
  const downloadImage = async (imageUrl: string) => {
    try {
      // For data URLs, convert to blob first
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `submission-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        showToast('Image downloaded successfully', 'success');
      } else {
        // For HTTP URLs, try direct download (works for same-origin and CORS-enabled URLs)
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `submission-image-${Date.now()}.jpg`;
        link.target = '_blank'; // Fallback to opening in new tab if download fails
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Image download initiated', 'success');
      }
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Failed to download image. Please right-click and save.', 'error');
    }
  };

  const printImage = (imageUrl: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print Image</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
            <img src="${imageUrl}" style="max-width:100%;max-height:100vh;" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };





  const clearFilters = () => {
    setStatus('');
    setSiteId('');
    setDateFrom('');
    setDateTo('');
    setRange('');
    setSearchTerm('');
  };

  // We use the assignments from the server directly as it now handles filtering and search
  const displayAssignments = assignments;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_review': return 'bg-purple-100 text-purple-800 border-purple-200';
      // Employee Statuses
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'invited': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'inactive': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const todayCount = useCountUp(backendStats.today);
  const approvedAnimated = useCountUp(backendStats.approved);
  const rejectedAnimated = useCountUp(backendStats.rejected);
  const totalAnimated = useCountUp(backendStats.total);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      {/* 1. Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 px-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{taskTitle || `Task #${taskId}`}</h1>
              {taskDescription && (
                <p className="text-xs text-gray-500 mt-0.5">{taskDescription}</p>
              )}
            </div>
            {isDataCollection && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-purple-200">
                Data Collection
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => load()}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 whitespace-nowrap disabled:opacity-50"
              title="Refresh list"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 px-2">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name ?? `Site ${s.id}`}</option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setRange(''); }}
                placeholder="From Date"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setRange(''); }}
                placeholder="To Date"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={load} className="flex-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium py-1.5">Apply</button>
              <button
                onClick={clearFilters}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium py-1.5"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => { setRange(range === 'today' ? '' : 'today'); setStatus(''); setPage(1); }}
          className={`bg-blue-50 rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md ${range === 'today' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Today's Submissions</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{todayCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div
          onClick={() => { setStatus(status === 'approved' ? '' : 'approved'); setRange(''); setPage(1); }}
          className={`bg-green-50 rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md ${status === 'approved' ? 'border-green-500 ring-2 ring-green-200' : 'border-green-100'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{approvedAnimated}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div
          onClick={() => { setStatus(status === 'rejected' ? '' : 'rejected'); setRange(''); setPage(1); }}
          className={`bg-red-50 rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md ${status === 'rejected' ? 'border-red-500 ring-2 ring-red-200' : 'border-red-100'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Rejected</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{rejectedAnimated}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div
          onClick={() => { setStatus(''); setRange(''); setDateFrom(''); setDateTo(''); setSiteId(''); setSearchTerm(''); setPage(1); }}
          className={`bg-violet-50 rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md ${status === '' && range === '' && !dateFrom && !dateTo && !siteId && !searchTerm ? 'border-violet-500 ring-2 ring-violet-200' : 'border-violet-100'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{totalAnimated}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 3. Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #ID
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && assignments.length === 0 ? (
                // Ghost Loader
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded w-8"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-32"></div>
                        <div className="h-3 bg-gray-100 rounded w-20"></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded w-16"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-8 bg-gray-100 rounded w-16"></div></td>
                  </tr>
                ))
              ) : (
                displayAssignments.map((assignment: Assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">#{assignment.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(assignment.occurrence_date)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.first_name || assignment.last_name ? `${assignment.first_name || ''} ${assignment.last_name || ''}`.trim() : 'Unassigned'}
                        </div>
                        {assignment.designation && (
                          <div className="text-xs text-gray-500">{assignment.designation}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {assignment.site_name ?? (assignment.site_ids?.length ? sites.find(s => s.id === assignment.site_ids![0])?.name : 'No Site')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${getStatusColor(assignment.status)}`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {assignment.submitted_at ? formatDate(assignment.submitted_at) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {assignment.submission_id ? (
                          <button
                            onClick={() => openViewer(assignment.submission_id!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-medium"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                        {assignment.submission_id && (
                          <DownloadReport taskId={taskId} submissionId={assignment.submission_id!} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {displayAssignments.length === 0 && !loading && (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No assignments found</h3>
            <p className="text-xs text-gray-500 mb-3">
              {assignments.length === 0 ? "No assignments for this task." : "No assignments match your filters."}
            </p>
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Pagination Card */}
      {displayAssignments.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> assignments
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setPage(1)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) pages.push(<span key="ellipsis1" className="px-1 text-gray-500">...</span>);
                  }
                  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                    pages.push(
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pages.push(<span key="ellipsis2" className="px-1 text-gray-500">...</span>);
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setPage(totalPages)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === totalPages
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Viewer Modal */}
      {viewSubmissionId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in-90 zoom-in-90">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Submission Details</h2>
                <p className="text-sm text-gray-600">Submission #{viewSubmissionId}</p>
              </div>
              <div className="flex items-center gap-3">
                {viewerLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-600" />}
                {!viewerLoading && viewerData && canApprove && viewerData.status !== 'approved' && viewerData.status !== 'rejected' && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={approving || rejecting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">{approving ? 'Approving...' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={approving || rejecting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{rejecting ? 'Rejecting...' : 'Reject'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={closeViewer}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {viewerError && (
              <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {viewerError}
              </div>
            )}

            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {viewerData ? (
                <SubmissionReadOnly
                  data={viewerData}
                  approvals={viewerApprovals}
                  expandedGps={expandedGps}
                  setExpandedGps={setExpandedGps}
                  setSelectedImage={setSelectedImage}
                  viewerFields={viewerFields}
                />
              ) : (
                !viewerLoading && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="text-lg font-medium text-gray-900">No submission data</div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Export Assignments</h2>
              <button onClick={() => setShowExportModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" name="exportMode" checked={exportMode === 'local'} onChange={() => setExportMode('local')} />
                  <span className="text-sm text-gray-700">Download locally</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="exportMode" checked={exportMode === 'email'} onChange={() => setExportMode('email')} />
                  <span className="text-sm text-gray-700">Send by email</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">From</label>
                  <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">To</label>
                  <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              {exportMode === 'email' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Emails (comma-separated)</label>
                  <input type="text" value={exportEmails} onChange={(e) => setExportEmails(e.target.value)} placeholder="user@example.com, manager@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={doExport} disabled={exporting || !exportFrom || !exportTo} className={`px-4 py-2 rounded-lg ${(!exporting && exportFrom && exportTo) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-200'}`}>{exporting ? 'Exporting...' : 'Export'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-sm ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] flex flex-col">
            {/* Action buttons */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(selectedImage);
                }}
                className="p-3 rounded-lg bg-white/90 hover:bg-white text-gray-900 transition-all duration-200 shadow-lg hover:scale-105"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  printImage(selectedImage);
                }}
                className="p-3 rounded-lg bg-white/90 hover:bg-white text-gray-900 transition-all duration-200 shadow-lg hover:scale-105"
                title="Print"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-3 rounded-lg bg-white/90 hover:bg-white text-gray-900 transition-all duration-200 shadow-lg hover:scale-105"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image */}
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Reject Submission</h3>
                </div>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Please provide a clear reason for rejecting this submission. This will be shared with the submitter.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  {rejectionReason.length}/500 characters
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                disabled={rejecting}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {rejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Reject Submission
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionReadOnly({ data, approvals, expandedGps, setExpandedGps, setSelectedImage, viewerFields }: {
  data: any;
  approvals: any[];
  expandedGps: Set<string>;
  setExpandedGps: (s: Set<string>) => void;
  setSelectedImage?: (url: string) => void;
  viewerFields?: any[];
}) {
  const isDataUrl = (s: string) => s?.startsWith('data:image/');

  const decodeBase64 = (s: string) => {
    try {
      const pure = s.includes(',') ? s.split(',').pop() as string : s;
      return `data:image/jpeg;base64,${pure}`;
    } catch {
      return '';
    }
  };

  const buildGoogleEmbed = (lat: number, lon: number) => {
    return `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
  };

  const formatTime12h = (s: string) => {
    try {
      const parts = s.split(':');
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      const dt = new Date(1970, 0, 1, h, m);
      return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dt);
    } catch {
      return s;
    }
  };

  let rawValues: any[] = Array.isArray(data?.values) ? data.values : [];
  const values: any[] = [];
  const unpackedKeys = new Set<string>();
  // Unpack nested
  rawValues.forEach(v => {
    const val = v?.value;
    const key = String(v?.field_key || '');

    // Check if it is a container
    const isContainer = Array.isArray(val) && val.length > 0 && typeof val[0] === 'object';

    if (isContainer) {
      // It is a container. Ensure type is set so it acts as a Header.
      values.push({ ...v, field_type: v.field_type || 'container' });

      const first = val[0];
      // Map for finding labels
      const labelMap = new Map((viewerFields || []).map((f: any) => [String(f.field_key), String(f.label)]));

      Object.entries(first).forEach(([k, subVal]) => {
        unpackedKeys.add(k);
        values.push({
          field_key: k,
          field_label: labelMap.get(k) || k,
          value: subVal,
          field_type: 'text',
          parent_field_key: key
        });
      });
    } else {
      // Normal field. Check for duplicate/placeholder.
      if (unpackedKeys.has(key) && (val === '-' || val === '' || val === null)) {
        // Skip duplicate placeholder
        return;
      }
      values.push(v);
    }
  });
  const systemFields = values.filter(v => String(v?.field_key || '').startsWith('system_'));
  const regularFields = values.filter(v => {
    const key = String(v?.field_key || '');
    const value = v?.value;
    const isEmpty = value == null || (typeof value === 'string' && value.trim().length === 0) || (Array.isArray(value) && value.length === 0);
    return !key.startsWith('system_') && (!isEmpty || key.startsWith('section_'));
  });
  const combined = [...regularFields, ...systemFields];

  const renderImage = (val: any, isSignature: boolean) => {
    const imgs = Array.isArray(val) ? val.map((e: any) => String(e)) : [String(val ?? '')];
    return (
      <div className={`grid ${isSignature ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3`}>
        {imgs.map((s, idx) => {
          const src = s.startsWith('http') ? s : (isDataUrl(s) ? s : decodeBase64(s));
          return (
            <div
              key={idx}
              onClick={() => setSelectedImage?.(src)}
              className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <img
                src={src}
                className={`${isSignature ? 'object-contain h-32' : 'object-cover h-28'} w-full`}
                alt="Submission image"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGps = (key: string, val: any) => {
    const s = String(val ?? '');
    const parts = s.split(',');
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    const expanded = expandedGps.has(key);
    const toggle = () => {
      const next = new Set(expandedGps);
      if (expanded) next.delete(key); else next.add(key);
      setExpandedGps(next);
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <code className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">{s}</code>
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-200 border border-blue-200"
          >
            <MapPin className="w-4 h-4" />
            {expanded ? 'Hide Map' : 'Show Map'}
          </button>
        </div>
        {expanded && Number.isFinite(lat) && Number.isFinite(lon) && (
          <div className="space-y-2">
            <iframe
              title={`map-${key}`}
              className="w-full h-64 rounded-xl border border-gray-200"
              src={buildGoogleEmbed(lat, lon)}
            />
            <a
              href={`https://www.google.com/maps?q=${lat},${lon}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-all duration-200 border border-green-200 text-sm"
            >
              Open in Google Maps
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderDateTime = (val: any, isDate: boolean) => {
    const s = String(val ?? '');
    try {
      if (isDate && s.length >= 10 && s.includes('-')) {
        const dt = new Date(s.length > 10 ? s : `${s}T00:00:00Z`);
        const out = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt);
        return <span className="font-medium">{out}</span>;
      }
    } catch { }
    return <span>{s}</span>;
  };

  const renderArray = (val: any) => {
    const items = Array.isArray(val) ? val.map((e: any) => String(e)).filter((t: string) => t.length) : [String(val ?? '')];
    return (
      <div className="flex flex-wrap gap-1">
        {items.filter(Boolean).map((item, idx) => (
          item.startsWith('http') ? (
            <a key={idx} href={item} target="_blank" rel="noreferrer" className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm border border-indigo-200">
              View {idx + 1}
            </a>
          ) : (
            <span key={idx} className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
              {item}
            </span>
          )
        ))}
      </div>
    );
  };

  const renderFile = (val: any) => {
    const items = Array.isArray(val) ? val : [val];
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item: any, idx: number) => {
          const s = String(item ?? '');
          if (!s) return null;

          let label = `File ${idx + 1}`;
          let isDataUrl = s.startsWith('data:');
          let isPdf = false;
          let isImage = false;

          if (isDataUrl) {
            const mime = s.split(';')[0].split(':')[1] || '';
            isPdf = mime.includes('pdf');
            isImage = mime.includes('image');
            if (isPdf) label += '.pdf';
            else if (mime.includes('word')) label += '.docx';
            else if (mime.includes('sheet') || mime.includes('excel')) label += '.xlsx';
            else if (mime.includes('text')) label += '.txt';
          } else if (s.startsWith('http')) {
            const parts = s.split('/');
            const last = parts[parts.length - 1];
            if (last) label = decodeURIComponent(last);
            isPdf = s.toLowerCase().includes('.pdf');
            isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(s);
          }

          // If it's an image, render as image instead
          if (isImage) {
            return (
              <div
                key={idx}
                onClick={() => setSelectedImage?.(s)}
                className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <img
                  src={s}
                  className="object-cover h-40 w-full"
                  alt={label}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-xs text-white truncate">{label}</p>
                </div>
              </div>
            );
          }

          // PDF preview
          if (isPdf) {
            return (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-all">
                <div className="aspect-[3/4] bg-gray-100 relative">
                  <iframe
                    src={s}
                    className="w-full h-full"
                    title={label}
                  />
                  <div className="absolute top-2 right-2">
                    <a
                      href={s}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Eye className="w-3 h-3" />
                      Open
                    </a>
                  </div>
                </div>
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-700 truncate font-medium">{label}</p>
                </div>
              </div>
            );
          }

          // Other files
          return (
            <a
              key={idx}
              href={s}
              download={isDataUrl ? label : undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="truncate max-w-xs">{label}</span>
            </a>
          );
        })}
      </div>
    );
  };

  const renderPhone = (val: any) => {
    return (
      <a href={`tel:${String(val)}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline">
        <Phone className="w-4 h-4" />
        <span className="font-medium">{String(val)}</span>
      </a>
    );
  };

  return (
    <div className="space-y-4">
      {/* Submission Fields */}
      {/* Submission Fields with Grouping */}
      <div className="space-y-6">
        {(() => {
          // Group fields by section/container
          // Grouping Logic
          const groups: { title?: string; type?: string; containerKey?: string; fields: any[] }[] = [];
          let currentGroup: { title?: string; type?: string; containerKey?: string; fields: any[] } = { fields: [] };
          let forceNewGroup = false;

          combined.forEach((v) => {
            const key = String(v?.field_key || '');
            const type = v?.field_type;
            const label = String(v?.field_label || key);
            const parentKey = v?.parent_field_key;

            // Check if this field marks the start of a section
            const isSectionStart = key.startsWith('section_') || key.startsWith('container_') || type === 'section' || type === 'container';

            // Check if we need to break out of a container group
            // If we are in a container group, and the current field is NOT a child of that container, force break.
            if (currentGroup.type === 'container' && (!parentKey || parentKey !== currentGroup.containerKey)) {
              forceNewGroup = true;
            }

            if (isSectionStart || forceNewGroup) {
              // Push current group if it has fields
              if (currentGroup.fields.length > 0) {
                groups.push(currentGroup);
              }
              // Start new group
              currentGroup = {
                title: isSectionStart ? label : undefined,
                type: isSectionStart ? type : undefined,
                containerKey: (isSectionStart && (type === 'container' || key.startsWith('container_'))) ? key : undefined,
                fields: []
              };
              forceNewGroup = false;
            }

            // Add field to current group
            currentGroup.fields.push(v);

            // If this was a container header, force next iteration to check grouping (handled by logic above, but ensure container itself is added)
            // Wait, if current is container, we just started a group. Next field will define if it stays or breaks.
            // If next field is child -> Stays.
            // If next field is not child -> Breaks (via forceNewGroup check).
          });

          // Push final group
          if (currentGroup.fields.length > 0 || currentGroup.title) {
            groups.push(currentGroup);
          }

          return groups.map((group, gIdx) => {
            // Updated Styling: Gray/Neutral theme (Black not Blue)
            const isTitled = !!group.title;
            const containerClasses = `rounded-xl ${isTitled ? 'border border-gray-200 bg-white overflow-hidden mb-6' : 'mb-6'}`;
            const gridClasses = `grid grid-cols-1 gap-4 ${isTitled ? 'p-4' : ''}`;

            return (
              <div key={gIdx} className={containerClasses}>
                {group.title && (
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-1 h-5 bg-gray-600 rounded-full shadow-sm" />
                    <div className="text-sm font-bold text-gray-800 tracking-wide uppercase">{group.title}</div>
                  </div>
                )}

                <div className={gridClasses}>
                  {group.fields.map((v, idx) => {
                    const key = String(v?.field_key || '');

                    // Hide container header from body list (it is shown as title)
                    if (v.field_type === 'container' || key.startsWith('container_')) return null;

                    const label = String(v?.label || v?.field_label || key);
                    const value = v?.value;
                    const strValue = String(value ?? '');

                    // Improved type detection
                    const isFile = (v?.field_type === 'file') || (key.includes('file')) ||
                      (Array.isArray(value) && value.some((x: any) => {
                        const str = String(x);
                        return str.startsWith('data:application/') || str.startsWith('data:text/') ||
                          (str.startsWith('http') && /\.(pdf|docx?|xlsx?|txt|csv)$/i.test(str));
                      })) ||
                      (typeof value === 'string' && (value.startsWith('data:application/') || value.startsWith('data:text/') ||
                        (value.startsWith('http') && /\.(pdf|docx?|xlsx?|txt|csv)$/i.test(value))));

                    const isImage = (v?.field_type === 'image') ||
                      (Array.isArray(value) && value.length > 0 && String(value[0]).startsWith('data:image/')) ||
                      (typeof value === 'string' && value.startsWith('data:image/')) ||
                      (key.includes('image') && (strValue.startsWith('http') || strValue.startsWith('data:')));

                    const isPhone = (v?.field_type === 'phone') || key.includes('phone');
                    const isSignature = key.includes('signature') || (v?.field_type === 'signature');
                    const isGps = key.includes('gps') || (v?.field_type === 'gps') || (typeof value === 'string' && value.includes(',') && !value.startsWith('data:') && !value.startsWith('http'));
                    const isDate = (v?.field_type === 'date') || (key.includes('date') && typeof value === 'string');
                    const isTime = (v?.field_type === 'time') || (key.includes('time') && typeof value === 'string');
                    const isArray = Array.isArray(value) && !isImage && !isFile;

                    return (
                      <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-base font-semibold text-gray-900">{label}</div>
                          {String(v?.field_key || '').startsWith('system_') && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
                              SYSTEM
                            </span>
                          )}
                        </div>
                        <div className="text-gray-700">
                          {isFile ? renderFile(value)
                            : isImage || isSignature ? renderImage(value, isSignature)
                              : isPhone ? renderPhone(value)
                                : isGps ? renderGps(key, value)
                                  : isDate ? renderDateTime(value, true)
                                    : isTime ? <span className="font-medium">{formatTime12h(String(value))}</span>
                                      : isArray ? renderArray(value)
                                        : <span className="text-gray-900 break-words">{String(value || '-') || '-'}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Approval History */}
      {Array.isArray(approvals) && approvals.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 text-sm font-semibold">H</span>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">Approval History</div>
              <div className="text-sm text-gray-600">{approvals.length} approval entries</div>
            </div>
          </div>

          <div className="space-y-3">
            {approvals.map((h, i) => {
              const name = `${String(h?.first_name || '')} ${String(h?.last_name || '')}`.trim();
              const status = String(h?.status || '').toUpperCase();
              const comments = String(h?.comments || '');
              const level = String(h?.level || '');
              const ts = String(h?.action_at || h?.created_at || '');
              const color = status === 'APPROVED' ? 'text-green-700 bg-green-50 border-green-200' :
                status === 'REJECTED' ? 'text-red-700 bg-red-50 border-red-200' :
                  'text-yellow-700 bg-yellow-50 border-yellow-200';
              const dt = ts ? new Date(ts) : null;
              const tsFmt = dt ? new Intl.DateTimeFormat('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }).format(dt) : ts;

              return (
                <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 hover:bg-white transition-colors duration-200">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${color}`}>
                      {status}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Level {level}</span>
                    <span className="ml-auto text-xs text-gray-500">{tsFmt}</span>
                  </div>
                  {name && <div className="text-sm font-medium text-gray-900 mb-1">{name}</div>}
                  {comments && (
                    <div className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-100">
                      {comments}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadReport({ taskId, submissionId }: { taskId: number; submissionId: number }) {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
      const url = `${base}/tasks/${taskId}/submissions/${submissionId}/report`;
      const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
      try {
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch { }

      const res = await fetch(url, { method: 'GET', credentials: 'include', headers });
      if (!res.ok) throw new Error(`Failed: ${await res.text()}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `task_report_${submissionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Download failed', e);
      alert('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-all duration-200 border border-indigo-200 hover:scale-105"
    >
      <Download className="w-4 h-4" />
      <span className="text-sm font-medium">
        {downloading ? 'Downloading...' : 'Download'}
      </span>
    </button>
  );
}
