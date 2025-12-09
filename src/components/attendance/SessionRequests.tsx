'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fetchPendingSessionRequests, approveSessionRequest, rejectSessionRequest, SessionRequest } from '@/lib/attendanceService';
import { apiClient } from '@/lib/apiClient';
import { Clock, MapPin, CheckCircle, XCircle, Coffee, Briefcase, Filter, ChevronRight, AlertTriangle, ExternalLink, MoreVertical, Eye, ThumbsUp, ThumbsDown, AlertCircle as AlertCircleIcon, ChevronUp, ChevronDown, ChevronLeft, Users } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { toast } from 'react-hot-toast';

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

type Props = {
    defaultStatus?: 'Pending' | 'Approved' | 'Rejected' | 'All';
    defaultHQ?: boolean;
    showHQToggle?: boolean;
    externalControl?: boolean;
    hqMode?: boolean;
    selectedSiteId?: number | null;
};

export default function SessionRequests({ defaultStatus = 'Pending', defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
    // Permissions
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const isEmployee = (role || "").toLowerCase() === "employee";
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");

    // State
    const [hqMode, setHqMode] = useState<boolean>(extHq ?? defaultHQ);
    const [inchargeSites, setInchargeSites] = useState<Array<Record<string, any>>>([]);
    const [allSites, setAllSites] = useState<Array<Record<string, any>>>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(extSiteId ?? null);

    const [requests, setRequests] = useState<SessionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>(defaultStatus);
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    // UI State
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

    // Modals
    const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'approve' | 'reject'>('view');

    // Auto-select first site for non-HR/non-OrgAdmin users on first load
    useEffect(() => {
        if (inchargeSites.length > 0 && !canHRMode && !isOrgAdmin && selectedSiteId === null) {
            const firstSiteId = inchargeSites[0]?.id;
            if (firstSiteId) {
                setSelectedSiteId(typeof firstSiteId === "number" ? firstSiteId : parseInt(String(firstSiteId)) || null);
            }
        }
    }, [inchargeSites, canHRMode, isOrgAdmin, selectedSiteId]);

    // Fetch session and permissions
    useEffect(() => {
        (async () => {
            try {
                const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET" });
                if (session?.authenticated) {
                    setRole((session.role || null) as string | null);
                    setPermissions(session.employee?.permissions || []);
                    if ((session.role || '').toLowerCase() === 'orgadmin') {
                        setHqMode(true);
                    }
                }
            } catch { }

            try {
                const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
                const list = Array.isArray(res?.sites) ? res!.sites! : [];
                setInchargeSites(list as any[]);
                if (list.length > 0 && selectedSiteId == null) {
                    const sid = list[0]?.id;
                    setSelectedSiteId(typeof sid === "number" ? sid : parseInt(String(sid)) || null);
                }
            } catch (e) { }

            if (canHRMode) {
                try {
                    const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                    const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                    setAllSites(list as any[]);
                } catch { }
            }
        })();
    }, []);

    // Fetch all sites when HR capability becomes available
    useEffect(() => {
        (async () => {
            if (!canHRMode || allSites.length > 0) return;
            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                setAllSites(list as any[]);
            } catch { }
        })();
    }, [canHRMode]);

    // Computed values for filtering logic
    const effHq = isOrgAdmin || (((externalControl ? (extHq ?? hqMode) : hqMode)) && canHRMode);
    const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;

    useEffect(() => {
        // Trigger fetch only if valid selection
        // Only skip if NOT HQ mode AND no site selected (meaning waiting for site selection)
        // For Managers, selectedSiteId should eventually be set.
        if (!effHq && (!effSite || Number(effSite) <= 0)) return;

        loadRequests();
    }, [filter, fromDate, toDate, externalControl ? extHq : hqMode, externalControl ? extSiteId : selectedSiteId, effHq, effSite]);

    const loadRequests = React.useCallback(async () => {
        if (!effHq && (!effSite || Number(effSite) <= 0)) {
            setRequests([]);
            return;
        }

        try {
            setLoading(true);
            const res = await fetchPendingSessionRequests(filter, fromDate, toDate, effHq, Number(effSite) || null);
            if (res.success) {
                setRequests(res.requests);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    }, [filter, fromDate, toDate, hqMode, selectedSiteId, extHq, extSiteId, externalControl, isOrgAdmin, canHRMode]);

    // Derive stats from current list
    useEffect(() => {
        const pending = requests.filter(r => r.status === 'Pending').length;
        const approved = requests.filter(r => r.status === 'Approved').length;
        const rejected = requests.filter(r => r.status === 'Rejected').length;
        setStats({ pending, approved, rejected, total: requests.length });
    }, [requests]);

    // CountUp hooks
    const pendingCount = useCountUp(stats.pending);
    const approvedCount = useCountUp(stats.approved);
    const rejectedCount = useCountUp(stats.rejected);
    const totalCount = useCountUp(stats.total);

    // Filtered Items 
    const visibleItems = requests;
    const totalEntries = visibleItems.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const pageStart = (page - 1) * pageSize;
    const pageSlice = visibleItems.slice(pageStart, pageStart + pageSize);

    function openModal(req: SessionRequest, mode: 'view' | 'approve' | 'reject') {
        setSelectedRequest(req);
        setModalMode(mode);
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Session Requests</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* HR Mode Toggle */}
                        {!externalControl && showHQToggle && canHRMode && !isOrgAdmin && (
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hqMode && canHRMode}
                                    onChange={(e) => setHqMode(e.target.checked)}
                                    // disabled={!canHRMode} - implied
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>HR Mode</span>
                            </label>
                        )}

                        {/* Site Selector */}
                        {!externalControl && (
                            <select
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                value={selectedSiteId == null ? "" : String(selectedSiteId)}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === "") {
                                        setSelectedSiteId(null);
                                        return;
                                    }
                                    const val = parseInt(raw, 10);
                                    setSelectedSiteId(Number.isNaN(val) ? null : val);
                                }}
                            >
                                {(hqMode && canHRMode) || isOrgAdmin ? (
                                    <option value="">All Sites</option>
                                ) : (
                                    <option value="">Select Site</option>
                                )}
                                {(((hqMode && canHRMode) || isOrgAdmin) ? allSites : inchargeSites).length === 0 && (
                                    <option value="">No sites</option>
                                )}
                                {(((hqMode && canHRMode) || isOrgAdmin) ? allSites : inchargeSites).map((s) => (
                                    <option key={String(s.id)} value={String(s.id)}>
                                        {String(s.name || s.site_name || s.id)}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Collapsible Filters */}
                {filtersExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value as any)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                                <option value="All">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>

                            <input
                                type="date"
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                placeholder="From Date"
                            />

                            <input
                                type="date"
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                placeholder="To Date"
                            />
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="md:col-span-4 flex items-center space-x-2">
                                <button
                                    onClick={loadRequests}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    onClick={() => {
                                        setFilter("All");
                                        setFromDate("");
                                        setToDate("");
                                        if (!externalControl) {
                                            setSelectedSiteId(null);
                                            setHqMode(defaultHQ);
                                        }
                                        setPage(1);
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Pending</p>
                            <p className="text-2xl font-bold text-orange-900 mt-1">{pendingCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Approved</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">{approvedCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Rejected</p>
                            <p className="text-2xl font-bold text-red-900 mt-1">{rejectedCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <AlertCircleIcon className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Total</p>
                            <p className="text-2xl font-bold text-violet-900 mt-1">{totalCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Users className="w-5 h-5 text-violet-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && requests.length === 0 ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-4 py-3"><div className="h-8 bg-gray-100 rounded w-8"></div></td>
                                    </tr>
                                ))
                            ) : (
                                pageSlice.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{req.employee_name}</div>
                                                <div className="text-sm text-gray-500">#{req.employee_id}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {req.request_type === 'break' ? <Coffee className="w-4 h-4 text-orange-500" /> : <Briefcase className="w-4 h-4 text-purple-500" />}
                                                <span className="text-sm text-gray-900 capitalize">{req.request_type.replace('_', ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {format(parseISO(req.created_at), 'MMM d, h:mm a')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {req.request_type === 'break' && (req.approved_duration_minutes || req.expected_duration_minutes || 0) + ' min'}
                                            {req.request_type === 'outside_work' && req.expected_return_time && (
                                                <span className="text-gray-500 text-xs block">Ret: {format(parseISO(req.expected_return_time), 'h:mm a')}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={req.reason}>
                                            {req.reason}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <ActionDropdown
                                                request={req}
                                                onView={() => openModal(req, 'view')}
                                                onApprove={() => openModal(req, 'approve')}
                                                onReject={() => openModal(req, 'reject')}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {visibleItems.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <Coffee className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No session requests found</h3>
                        <p className="text-xs text-gray-500 mb-3">
                            {(!effHq && (!effSite || Number(effSite) <= 0))
                                ? "Select a site to view requests."
                                : "No requests match your current filters."}
                        </p>
                        {/* Only show Clear Filters if not empty state due to waiting for selection */}
                        {(effHq || (effSite && Number(effSite) > 0)) && (
                            <button
                                onClick={() => {
                                    setFilter("All");
                                    setFromDate("");
                                    setToDate("");
                                    if (!externalControl) {
                                        setSelectedSiteId(null);
                                        setHqMode(defaultHQ);
                                    }
                                    setPage(1);
                                }}
                                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {visibleItems.length > 0 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
                    <div className="text-xs text-gray-600">
                        Showing <span className="font-medium">{pageStart + 1}</span> to <span className="font-medium">{Math.min(pageStart + pageSize, totalEntries)}</span> of <span className="font-medium">{totalEntries}</span> requests
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-600">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
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
                            {/* Simple Pagination Numbers */}
                            <span className="text-xs font-medium px-2">Page {page} of {totalPages}</span>

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

            {selectedRequest && (
                <RequestModal
                    request={selectedRequest}
                    mode={modalMode}
                    setMode={setModalMode}
                    onClose={() => { setSelectedRequest(null); loadRequests(); }}
                />
            )}
        </div>
    );
}

// ... Keep existing sub-components (StatusBadge, ActionDropdown, RequestModal) as is ...
// Re-pasting them below for completeness if file overwrite

function StatusBadge({ status }: { status: string }) {
    const color = {
        'Pending': 'text-orange-700 bg-orange-50 border-orange-200',
        'Approved': 'text-green-700 bg-green-50 border-green-200',
        'Rejected': 'text-red-700 bg-red-50 border-red-200'
    }[status] || 'text-gray-700 bg-gray-50 border-gray-200';

    const Icon = {
        'Pending': Clock,
        'Approved': CheckCircle,
        'Rejected': AlertCircleIcon
    }[status] || Clock;

    return (
        <div className="flex items-center space-x-1.5">
            <Icon className={`w-3 h-3 ${color.split(' ')[0]}`} />
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color} capitalize`}>
                {status}
            </span>
        </div>
    );
}

function ActionDropdown({ request, onView, onApprove, onReject }: { request: SessionRequest, onView: () => void, onApprove: () => void, onReject: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
                <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}>
                    <div
                        className="absolute w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
                        style={{
                            top: dropdownRef.current?.getBoundingClientRect().bottom ?? 0,
                            left: (dropdownRef.current?.getBoundingClientRect().right ?? 0) - 192
                        }}
                    >
                        <button onClick={onView} className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Eye className="w-4 h-4" /> <span>View Details</span>
                        </button>
                        {request.status === 'Pending' && (
                            <>
                                <div className="border-t border-gray-100 my-1" />
                                <button onClick={onApprove} className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50">
                                    <ThumbsUp className="w-4 h-4" /> <span>Approve</span>
                                </button>
                                <button onClick={onReject} className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                                    <ThumbsDown className="w-4 h-4" /> <span>Reject</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function RequestModal({ request, mode, setMode, onClose }: { request: SessionRequest, mode: 'view' | 'approve' | 'reject', setMode: (m: 'view' | 'approve' | 'reject') => void, onClose: () => void }) {
    const isBreak = request.request_type === 'break';
    const Icon = isBreak ? Coffee : Briefcase;
    const [duration, setDuration] = useState<string>(
        request.approved_duration_minutes?.toString() || request.expected_duration_minutes?.toString() || '0'
    );
    const [disableGeofence, setDisableGeofence] = useState(request.disable_geofence === true || request.disable_geofence === 1);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (request.status === 'Pending' && request.expected_return_time) {
            try {
                const remaining = differenceInMinutes(parseISO(request.expected_return_time), new Date());
                if (remaining > 0 && remaining < 1440) setDuration(remaining.toString());
            } catch (e) { }
        }
    }, [request]);

    async function handleApprove() {
        setProcessing(true);
        try {
            await approveSessionRequest(request.id, { approved_duration_minutes: parseInt(duration), disable_geofence: disableGeofence });
            toast.success('Request approved');
            onClose();
        } catch (e) { toast.error('Failed to approve'); } finally { setProcessing(false); }
    }

    async function handleReject() {
        if (!rejectReason) { toast.error('Please provide a reason'); return; }
        setProcessing(true);
        try {
            await rejectSessionRequest(request.id, rejectReason);
            toast.success('Request rejected');
            onClose();
        } catch (e) { toast.error('Failed to reject'); } finally { setProcessing(false); }
    }

    const mapUrl = (request.outside_location_lat && request.outside_location_lng)
        ? `https://www.google.com/maps?q=${request.outside_location_lat},${request.outside_location_lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.outside_location || '')}`;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">
                        {mode === 'approve' ? 'Approve Request' : mode === 'reject' ? 'Reject Request' : 'Request Details'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><XCircle className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Status Check if not pending */}
                    {request.status !== 'Pending' && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 ${request.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {request.status === 'Approved' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            <span className="font-semibold">This request is {request.status}</span>
                        </div>
                    )}
                    {(request.raised_from_within_site === false || request.raised_from_within_site === 0) && (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="text-sm font-semibold text-orange-800">Raised Outside Site</p>
                                <p className="text-xs text-orange-600 mt-1">User was outside designated site boundaries.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-500">Employee:</span> <p className="font-medium">{request.employee_name}</p></div>
                        <div><span className="text-gray-500">Type:</span> <p className="font-medium capitalize">{request.request_type.replace('_', ' ')}</p></div>
                        <div><span className="text-gray-500">Reason:</span> <p className="font-medium">{request.reason}</p></div>
                        <div><span className="text-gray-500">Time:</span> <p className="font-medium">{format(parseISO(request.created_at), 'h:mm a')}</p></div>
                        {request.outside_location && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Location:</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <MapPin size={14} className="text-gray-400" />
                                    <span className="font-medium">{request.outside_location}</span>
                                    <a href={mapUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline flex items-center"><ExternalLink size={10} className="ml-1" /> View Map</a>
                                </div>
                            </div>
                        )}
                    </div>

                    {mode === 'approve' && (
                        <div className="bg-green-50 p-4 rounded-xl space-y-4 border border-green-100">
                            <div>
                                <label className="block text-xs font-bold text-green-800 uppercase tracking-wider mb-1.5">Approved Duration (Min)</label>
                                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-green-300 focus:ring-2 focus:ring-green-500 outline-none" />
                            </div>
                            {!isBreak && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={disableGeofence} onChange={(e) => setDisableGeofence(e.target.checked)} className="rounded text-green-600 focus:ring-green-500" />
                                    <span className="text-sm font-medium text-green-800">Disable Geofence Validation</span>
                                </label>
                            )}
                        </div>
                    )}

                    {mode === 'reject' && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-1.5">Rejection Reason</label>
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why are you rejecting this request?" className="w-full px-3 py-2 rounded-lg border border-red-200 focus:ring-2 focus:ring-red-500 outline-none min-h-[80px]" />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                    {mode === 'approve' && (
                        <button onClick={handleApprove} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                            {processing ? 'Approving...' : 'Confirm Approval'}
                        </button>
                    )}
                    {mode === 'reject' && (
                        <button onClick={handleReject} disabled={processing || !rejectReason} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                            {processing ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    )}
                    {mode === 'view' && request.status === 'Pending' && (
                        <>
                            <button onClick={() => setMode('reject')} className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">Reject</button>
                            <button onClick={() => setMode('approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Approve</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
