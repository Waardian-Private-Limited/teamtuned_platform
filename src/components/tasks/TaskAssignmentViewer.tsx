"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { Loader2, AlertCircle, Eye, Download, Filter, X, Calendar, MapPin, User, Search, ChevronDown, ChevronUp } from "lucide-react";

type Assignment = {
  id: number;
  task_id: number;
  site_id?: number | null;
  user_id?: number | null;
  occurrence_date: string;
  status: string;
  submission_id?: number | null;
  submitted_at?: string | null;
  remarks?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  designation?: string | null;
  site_name?: string | null;
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
  const [sites, setSites] = React.useState<Array<{ id: number; name: string }>>([]);
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

  const [showExportModal, setShowExportModal] = React.useState(false);
  const [exportMode, setExportMode] = React.useState<'local' | 'email'>('local');
  const [exportFrom, setExportFrom] = React.useState('');
  const [exportTo, setExportTo] = React.useState('');
  const [exportEmails, setExportEmails] = React.useState('');
  const [exporting, setExporting] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  React.useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

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
        const ext = ct.includes('spreadsheetml') ? 'xlsx' : 'xls';
        link.download = `task_${taskId}_assignments_${exportFrom}_${exportTo}.${ext}`;
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
      if (status) params.status = status;
      if (siteId) params.site_id = siteId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (range) params.range = range;
      params.format = 'paginated';
      params.page = String(page);
      params.limit = String(limit);
      const res = await apiClient<{ items: Assignment[]; total: number; page: number; limit: number; hasNext: boolean } | Assignment[]>(`/tasks/${taskId}/assignments`, { method: "GET", withAuth: true, params });
      if (Array.isArray(res)) {
        setAssignments(res);
        setTotal(res.length);
        setHasNext(false);
      } else {
        const items = Array.isArray((res as any)?.items) ? (res as any).items : [];
        setAssignments(items);
        setTotal(Number((res as any)?.total || 0));
        setHasNext(!!(res as any)?.hasNext);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [taskId, status, siteId, dateFrom, dateTo, range, page, limit]);

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
      } catch (_) {}
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
          const sess = await apiClient<{ authenticated: boolean; employee?: { sites?: Array<{ id: number; name?: string; code?: string }> } }>("/auth/session", { method: "GET", withAuth: true });
          const normalized = (sess?.employee?.sites || []).map((x: any) => ({ id: Number(x.id), name: String(x.name || x.code || x.id) }));
          setSites(normalized);
        } catch {}
      }
    })();
  }, []);

  const formatDate = (s: string) => {
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
      setViewerData(data);
      setViewerApprovals(approvals);
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
  };

  const clearFilters = () => {
    setStatus('');
    setSiteId('');
    setDateFrom('');
    setDateTo('');
    setRange('');
    setSearchTerm('');
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      assignment.first_name?.toLowerCase().includes(searchLower) ||
      assignment.last_name?.toLowerCase().includes(searchLower) ||
      assignment.site_name?.toLowerCase().includes(searchLower) ||
      assignment.designation?.toLowerCase().includes(searchLower) ||
      assignment.status?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_review': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-2">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{taskTitle || `Task #${taskId}`}</h1>
                {taskDescription && (
                  <p className="text-sm text-gray-500 mt-1 max-w-2xl">{taskDescription}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">{assignments.length} Assignments</span>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition-all duration-200 border border-gray-800"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
            {loading && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Loading...</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-100 text-sm">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select className="border rounded px-2 py-1" value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {['10','20','50','100'].map((sz) => (<option key={sz} value={sz}>{sz}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 rounded bg-gray-100 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <span>Page {page}</span>
            <button className="px-2 py-1 rounded bg-gray-100 disabled:opacity-50" onClick={() => setPage((p) => (hasNext ? p + 1 : p))} disabled={!hasNext}>Next</button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all duration-200 border border-blue-200"
              >
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {(status || siteId || dateFrom || dateTo || range) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 border border-gray-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Site Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Site</label>
                  <select 
                    value={siteId} 
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">All Sites</option>
                    {sites.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name ?? `Site ${s.id}`}</option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">From Date</label>
                  <input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => { setDateFrom(e.target.value); setRange(''); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">To Date</label>
                  <input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => { setDateTo(e.target.value); setRange(''); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Quick Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Quick Range</label>
                  <select 
                    value={range} 
                    onChange={(e) => { setRange(e.target.value); setDateFrom(''); setDateTo(''); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Custom Range</option>
                    <option value="today">Today</option>
                    <option value="7">Last 7 Days</option>
                    <option value="15">Last 15 Days</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="text-red-700 font-medium">{error}</div>
          </div>
        )}

        {/* Assignments Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Assignment List</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}</span>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-600" />}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  [...Array(5)].map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-6 py-4"><div className="h-3 w-24 bg-gray-200 animate-pulse rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-40 bg-gray-200 animate-pulse rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-28 bg-gray-200 animate-pulse rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-24 bg-gray-200 animate-pulse rounded" /></td>
                      <td className="px-6 py-4"><div className="h-8 w-20 bg-gray-200 animate-pulse rounded" /></td>
                    </tr>
                  ))
                )}
                {!loading && filteredAssignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="text-lg font-medium text-gray-900">No assignments found</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {assignments.length === 0 ? "No assignments for this task." : "No assignments match your filters."}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{formatDate(assignment.occurrence_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.first_name || assignment.last_name ? `${assignment.first_name || ''} ${assignment.last_name || ''}`.trim() : 'Unassigned'}
                          </div>
                          {assignment.designation && (
                            <div className="text-xs text-gray-500">{assignment.designation}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{assignment.site_name ?? 'No Site'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(assignment.status)} capitalize`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {assignment.submitted_at ? formatDate(assignment.submitted_at) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {assignment.submission_id && assignment.status !== 'pending' ? (
                          <button 
                            onClick={() => openViewer(assignment.submission_id!)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:scale-105"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">View</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                        {assignment.submission_id && (
                          <DownloadReport taskId={taskId} submissionId={assignment.submission_id!} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
    </div>
  );
}

function SubmissionReadOnly({ data, approvals, expandedGps, setExpandedGps }: { 
  data: any; 
  approvals: any[]; 
  expandedGps: Set<string>; 
  setExpandedGps: (s: Set<string>) => void; 
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

  const values: any[] = Array.isArray(data?.values) ? data.values : [];
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
            <a key={idx} href={src} target="_blank" rel="noreferrer" className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition-all duration-200">
              <img 
                src={src} 
                className={`${isSignature ? 'object-contain h-32' : 'object-cover h-28'} w-full`} 
                alt="Submission image" 
              />
            </a>
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
    } catch {}
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

  return (
    <div className="space-y-4">
      {/* Submission Fields */}
      <div className="grid grid-cols-1 gap-4">
        {combined.map((v, idx) => {
          const key = String(v?.field_key || '');
          const label = String(v?.field_label || key);
          const value = v?.value;
          const isImage = Array.isArray(value) ? (value[0] && (String(value[0]).startsWith('http') || String(value[0]).startsWith('data:image/'))) : (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image/')));
          const isSignature = key.includes('signature');
          const isGps = key.includes('gps') || (typeof value === 'string' && value.includes(','));
          const isDate = key.includes('date') && typeof value === 'string';
          const isTime = key.includes('time') && typeof value === 'string';
          const isArray = Array.isArray(value);
          const isSection = key.startsWith('section_');

          return (
            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-all duration-200">
              {isSection ? (
                <>
                  <div className="text-sm font-semibold text-blue-600 tracking-wide uppercase">{label}</div>
                  <div className="mt-3 border-t border-blue-100" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-base font-semibold text-gray-900">{label}</div>
                    {String(v?.field_key || '').startsWith('system_') && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
                        SYSTEM
                      </span>
                    )}
                  </div>
                  <div className="text-gray-700">
                    {isImage || isSignature ? renderImage(value, isSignature)
                      : isGps ? renderGps(key, value)
                      : isDate ? renderDateTime(value, true)
                      : isTime ? <span className="font-medium">{formatTime12h(String(value))}</span>
                      : isArray ? renderArray(value)
                      : <span className="text-gray-900">{String(value ?? '')}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
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
      const headers: Record<string,string> = { 'ngrok-skip-browser-warning': 'true' };
      try { 
        const token = localStorage.getItem('token'); 
        if (token) headers['Authorization'] = `Bearer ${token}`; 
      } catch {}
      
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
