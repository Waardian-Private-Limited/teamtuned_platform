"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
    Search,
    Filter,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    X,
    User,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    Eye,
    ThumbsUp,
    ThumbsDown,
    RefreshCw,
    Trash2,
    ChevronDown,
    ChevronUp,
    FileText,
    Users,
    Building
} from "lucide-react";

type ApprovalTimelineEntry = {
    level_number: number;
    level_name: string;
    action: string;
    approver_name?: string;
    action_taken_at?: string;
    timeline_due_at?: string;
    remarks?: string;
    is_current_level: boolean;
};

type RequestItem = {
    id: number;
    attendance_date: string;
    employee_id: number;
    first_name: string;
    last_name: string;
    employee_code: string;
    profile_picture?: string;
    department_name?: string;
    designation_name?: string;
    night_ot_status: string;
    night_ot_start_time: string;
    night_ot_end_time: string;
    night_ot_duration_minutes: number;
    night_ot_remarks?: string;
    night_ot_workflow_id?: number;
    night_ot_current_level?: number;
    night_ot_reject_reason?: string;
    punch_in_time?: string;
    punch_out_time?: string;
    can_approve?: boolean;
    [key: string]: any;
};

type Props = {
    defaultHQ?: boolean;
    showHQToggle?: boolean;
    externalControl?: boolean;
    hqMode?: boolean;
    selectedSiteId?: number | null;
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

export default function NightOTRequests({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
    const { role, permissions } = useAuth();
    // Permissions
    const isEmployee = (role || "").toLowerCase() === "employee";
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");

    // Tab state: 'approvals' | 'compoffs'
    const [activeTab, setActiveTab] = useState<'approvals' | 'compoffs'>('approvals');

    // State
    const [hqMode, setHqMode] = useState<boolean>(extHq ?? defaultHQ);
    const [inchargeSites, setInchargeSites] = useState<Array<Record<string, any>>>([]);
    const [allSites, setAllSites] = useState<Array<Record<string, any>>>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(extSiteId ?? null);

    const [status, setStatus] = useState<string>("All");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    const [items, setItems] = useState<RequestItem[]>([]);
    const [compoffItems, setCompoffItems] = useState<any[]>([]);
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; total: number } | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [statsLoading, setStatsLoading] = useState<boolean>(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<"approve" | "reject" | "delete">("approve");
    const [modalReason, setModalReason] = useState<string>("");
    const [activeItem, setActiveItem] = useState<RequestItem | null>(null);
    const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
    const [viewLoading, setViewLoading] = useState<boolean>(false);
    const [viewData, setViewData] = useState<any>(null);

    // Stats animation
    const pendingCount = useCountUp(stats?.pending || 0);
    const approvedCount = useCountUp(stats?.approved || 0);
    const rejectedCount = useCountUp(stats?.rejected || 0);
    const totalCount = useCountUp(stats?.total || 0);

    const visibleItems = React.useMemo(() => {
        return items;
    }, [items]);

    const totalEntries = visibleItems.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const pageStart = (page - 1) * pageSize;
    const pageSlice = visibleItems.slice(pageStart, pageStart + pageSize);

    // Auto-select first site logic
    useEffect(() => {
        if (inchargeSites.length > 0 && !canHRMode && !isOrgAdmin && selectedSiteId === null) {
            const firstSiteId = inchargeSites[0]?.id;
            if (firstSiteId) {
                setSelectedSiteId(typeof firstSiteId === "number" ? firstSiteId : parseInt(String(firstSiteId)) || null);
            }
        }
    }, [inchargeSites, canHRMode, isOrgAdmin, selectedSiteId]);

    // Fetch sites and session info
    useEffect(() => {
        (async () => {
            try {
                const session = { authenticated: true, role: role };
                if (session?.authenticated) {
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

    const fetchList = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = {};
            if (status) params["status"] = status;

            const effHq = isOrgAdmin || (((externalControl ? (extHq ?? hqMode) : hqMode)) && canHRMode);
            const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;

            if (fromDate) params["start"] = fromDate;
            if (toDate) params["end"] = toDate;

            if (!effHq && (!effSite || Number(effSite) <= 0)) {
                setItems([]);
            } else {
                if (effHq) {
                    params["hq"] = "1";
                } else if (effSite) {
                    params["siteId"] = String(effSite);
                }

                const res = await apiClient<any>("/attendance/night-ot/requests", { method: "GET", params, withAuth: true });
                const list: any[] = Array.isArray(res) ? res : (res?.items || res?.rows || res?.requests || res?.data || []);
                setItems(list.map((e: any) => ({ ...(e || {}) })));
            }
            setPage(1);
        } catch (e: any) {
            setError(e?.message || "Failed to load Night OT requests");
        } finally {
            setLoading(false);
        }
    }, [status, hqMode, selectedSiteId, externalControl, extHq, extSiteId, isOrgAdmin, canHRMode, fromDate, toDate]);

    // Fetch Night OT comp-off records (is_night_ot=1)
    const fetchCompoffs = React.useCallback(async () => {
        try {
            const effHq = isOrgAdmin || (hqMode && canHRMode);
            const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;
            const params: Record<string, string> = { night_ot: "1", limit: "100" };
            if (status && status !== "All") params["status"] = status;
            if (fromDate) params["start"] = fromDate;
            if (toDate) params["end"] = toDate;
            if (effHq) { params["hq"] = "1"; }
            else if (effSite) { params["site_id"] = String(effSite); }

            if (!effHq && (!effSite || Number(effSite) <= 0)) { setCompoffItems([]); return; }

            const res = await apiClient<any>("/attendance/comp-off/requests", { method: "GET", params, withAuth: true });
            const list: any[] = res?.requests || [];
            setCompoffItems(list);
        } catch { setCompoffItems([]); }
    }, [status, hqMode, selectedSiteId, externalControl, extHq, extSiteId, isOrgAdmin, canHRMode, fromDate, toDate]);

    useEffect(() => {
        fetchList();
        fetchCompoffs();
    }, [status, externalControl ? extHq : hqMode, externalControl ? extSiteId : selectedSiteId, fromDate, toDate]);

    // Calculate Stats
    useEffect(() => {
        const pending = items.filter(item => String(item.night_ot_status || "").toLowerCase() === 'pending').length;
        const approved = items.filter(item => String(item.night_ot_status || "").toLowerCase() === 'approved').length;
        const rejected = items.filter(item => String(item.night_ot_status || "").toLowerCase() === 'rejected').length;
        setStats({ pending, approved, rejected, total: items.length });
    }, [items]);

    const approve = async (id: number, remarks: string = "") => {
        try {
            setActionLoading(`approve_${id}`);
            await apiClient(`/attendance/night-ot/${id}/approve`, {
                method: "POST",
                body: { remarks },
                withAuth: true,
            });
            await fetchList();
            showNotification('Night OT Request approved successfully', 'success');
        } catch (e: any) {
            showNotification(e?.message || "Failed to approve request", 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const reject = async (id: number, remarks: string) => {
        try {
            setActionLoading(`reject_${id}`);
            await apiClient(`/attendance/night-ot/${id}/reject`, {
                method: "POST",
                body: { remarks },
                withAuth: true,
            });
            await fetchList();
            showNotification('Night OT Request rejected successfully', 'success');
        } catch (e: any) {
            showNotification(e?.message || "Failed to reject request", 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteRequest = async (id: number) => {
        try {
            setActionLoading(`delete_${id}`);
            await apiClient(`/attendance/night-ot/${id}`, {
                method: "DELETE",
                withAuth: true,
            });
            await fetchList();
            showNotification('Night OT Request deleted successfully', 'success');
        } catch (e: any) {
            showNotification(e?.message || "Failed to delete request", 'error');
        } finally {
            setActionLoading(null);
        }
    }

    const openModal = (item: RequestItem, mode: "approve" | "reject" | "delete") => {
        setActiveItem(item);
        setModalMode(mode);
        setModalReason("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setActiveItem(null);
        setModalReason("");
    };

    const confirmModal = async () => {
        if (!activeItem) return;
        const id = Number(activeItem.id);
        if (modalMode === "approve") {
            await approve(id, modalReason.trim());
        } else if (modalMode === "reject") {
            const reason = modalReason.trim();
            if (!reason) return;
            await reject(id, reason);
        } else if (modalMode === "delete") {
            await deleteRequest(id);
        }
        closeModal();
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        const container = document.getElementById('notification-container') || (() => {
            const c = document.createElement('div');
            c.id = 'notification-container';
            c.style.position = 'fixed'; c.style.top = '20px'; c.style.right = '20px'; c.style.zIndex = '9999';
            document.body.appendChild(c);
            return c;
        })();

        const notification = document.createElement('div');
        notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`;
        notification.innerHTML = `<div className="flex-1"><p class="${type === 'success' ? 'text-green-800' : 'text-red-800'} font-medium">${message}</p></div>`;

        container.appendChild(notification);
        setTimeout(() => {
            if (container.contains(notification)) container.removeChild(notification);
        }, 4000);
    };

    const getStatusColor = (s: string) => {
        switch (s.toLowerCase()) {
            case 'approved': return 'text-green-700 bg-green-50 border border-green-200';
            case 'rejected': return 'text-red-700 bg-red-50 border border-red-200';
            case 'pending': return 'text-orange-700 bg-orange-50 border border-orange-200';
            default: return 'text-gray-700 bg-gray-50 border border-gray-200';
        }
    };

    const getStatusIcon = (s: string) => {
        switch (s.toLowerCase()) {
            case 'approved': return <CheckCircle className="w-3 h-3 text-green-500" />;
            case 'rejected': return <AlertCircle className="w-3 h-3 text-red-500" />;
            case 'pending': return <Clock className="w-3 h-3 text-orange-500" />;
            default: return <Clock className="w-3 h-3 text-gray-500" />;
        }
    };

    const fmtHm = (m: number) => {
        const min = Number(m || 0);
        const h = Math.floor(min / 60);
        const mm = String(min % 60).padStart(2, "0");
        return `${h}h ${mm}m`;
    };

    const fmtTime = (time: string | null | undefined) => {
        if (!time) return "--:--";
        try {
            const date = new Date(time);
            if (isNaN(date.getTime())) {
                // Try parsing if it's already HH:mm
                if (/^\d{2}:\d{2}/.test(time)) return time.slice(0, 5);
                return "--:--";
            }
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) {
            return "--:--";
        }
    }

    const openDetailsView = async (item: RequestItem) => {
        setActiveItem(item);
        setDetailsOpen(true);
        setViewLoading(true);
        setViewData(null);
        try {
            const res = await apiClient<any>(`/attendance/night-ot/requests/${item.id}`, { method: "GET", withAuth: true });
            setViewData(res);
        } catch (e) {
            console.error("Failed to fetch details", e);
        } finally {
            setViewLoading(false);
        }
    };

    const ActionDropdown = ({ item }: { item: RequestItem }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [placeUp, setPlaceUp] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);
        const triggerRef = useRef<HTMLButtonElement>(null);
        const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
        const statusLower = String(item.night_ot_status || "Pending").toLowerCase();

        useEffect(() => {
            if (isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const scrollY = window.scrollY;
                const scrollX = window.scrollX;
                setCoords({
                    top: rect.bottom + scrollY + 4,
                    left: rect.right + scrollX,
                    width: 192
                });
            }
        }, [isOpen]);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (triggerRef.current && triggerRef.current.contains(event.target as Node)) {
                    return;
                }
                const dropdown = document.getElementById(`dropdown-${item.id}`);
                if (dropdown && dropdown.contains(event.target as Node)) {
                    return;
                }
                setIsOpen(false);
            };

            const handleScroll = () => {
                if (isOpen) setIsOpen(false);
            }

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
                window.addEventListener('scroll', handleScroll, true);
            }
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('scroll', handleScroll, true);
            };
        }, [isOpen, item.id]);

        const DropdownPortal = () => {
            if (!isOpen || !coords) return null;

            const PortalContent = (
                <div
                    id={`dropdown-${item.id}`}
                    className="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
                    style={{
                        top: coords.top,
                        left: coords.left - coords.width,
                        width: coords.width
                    }}
                >
                    <div className="py-1">
                        <button
                            onClick={() => {
                                openDetailsView(item);
                                setIsOpen(false);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                        </button>

                        {((statusLower === "pending" && (item.can_approve || isOrgAdmin || canHRMode)) || (isOrgAdmin && statusLower === "rejected")) && (
                            <>
                                <div className="border-t border-gray-100 my-1" />
                                <button onClick={() => { openModal(item, "approve"); setIsOpen(false); }} className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 text-left">
                                    <ThumbsUp className="w-4 h-4" /> <span>Approve</span>
                                </button>
                                <button onClick={() => { openModal(item, "reject"); setIsOpen(false); }} className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 text-left">
                                    <ThumbsDown className="w-4 h-4" /> <span>Reject</span>
                                </button>
                            </>
                        )}
                        {isOrgAdmin && (
                            <>
                                <div className="border-t border-gray-100 my-1" />
                                <button onClick={() => { openModal(item, "delete"); setIsOpen(false); }} className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 text-left">
                                    <Trash2 className="w-4 h-4" /> <span>Delete</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            );

            if (typeof document === 'undefined') return null;
            return ReactDOM.createPortal(PortalContent, document.body);
        };

        return (
            <div className="relative">
                <button
                    ref={triggerRef}
                    onClick={() => setIsOpen((o) => !o)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    disabled={!!actionLoading}
                >
                    {actionLoading?.includes(`_${item.id}`) ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                    )}
                </button>
                <DropdownPortal />
            </div>
        );
    };

    const ApprovalTimeline = ({ timeline, workflowName }: { timeline?: any[]; workflowName?: string }) => {
        if (!timeline || timeline.length === 0) return null;

        return (
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Approval Workflow{workflowName && ` - ${workflowName}`}
                </h4>
                <div className="space-y-3">
                    {timeline.map((level, index) => (
                        <div key={index} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                                {String(level.action || "").toLowerCase() === 'approved' ? (
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    </div>
                                ) : String(level.action || "").toLowerCase() === 'rejected' ? (
                                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                        <X className="w-4 h-4 text-red-600" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">
                                        Level {level.level_number}: {level.level_name}
                                        {level.is_current_level && (
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                Current
                                            </span>
                                        )}
                                    </p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${String(level.action).toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                                        String(level.action).toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                        {String(level.action || "Pending").charAt(0).toUpperCase() + String(level.action || "pending").slice(1)}
                                    </span>
                                </div>
                                {level.approver_name && (
                                    <p className="text-xs text-gray-600 mt-1">Approver: {level.approver_name}</p>
                                )}
                                {level.remarks && (
                                    <p className="text-xs text-gray-500 mt-1">Remarks: {level.remarks}</p>
                                )}
                                {level.action_taken_at && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(level.action_taken_at).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const DetailsViewModal = () => {
        if (!detailsOpen || !activeItem) return null;

        // Use activeItem initially, but prefer viewData when loaded for richer info if available
        const data = viewData || activeItem;
        // Merge to ensure we have basics
        const displayItem = { ...activeItem, ...viewData };

        return (
            <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">Night OT Details</h3>
                            <button
                                onClick={() => setDetailsOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {viewLoading && !viewData ? (
                            <div className="flex justify-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-6 pb-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Request Details</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Employee:</span>
                                            <p className="font-medium">{displayItem.first_name} {displayItem.last_name}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Employee Code:</span>
                                            <p className="font-medium">{displayItem.employee_code || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Date:</span>
                                            <p className="font-medium">{new Date(displayItem.attendance_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="col-span-2 border-t pt-4 mt-2">
                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Night OT Session</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-gray-600">OT Start:</span>
                                                    <p className="font-medium text-indigo-700">{fmtTime(displayItem.night_ot_start_time)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">OT End:</span>
                                                    <p className="font-medium text-indigo-700">{fmtTime(displayItem.night_ot_end_time)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">OT Duration:</span>
                                                    <p className="font-medium text-indigo-900">{fmtHm(displayItem.night_ot_duration_minutes)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2 border-t pt-4">
                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Regular Shift</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-gray-600">Punch In:</span>
                                                    <p className="font-medium">{fmtTime(displayItem.punch_in_time)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Punch Out:</span>
                                                    <p className="font-medium">{fmtTime(displayItem.punch_out_time)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Department:</span>
                                            <p className="font-medium">{displayItem.department_name || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Designation:</span>
                                            <p className="font-medium">{displayItem.designation_name || "-"}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-600">Status:</span>
                                            <div className="flex items-center space-x-1 mt-1">
                                                {getStatusIcon(String(displayItem.night_ot_status || "Pending"))}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(String(displayItem.night_ot_status || "Pending"))} capitalize`}>
                                                    {String(displayItem.night_ot_status || "Pending").toLowerCase()}
                                                </span>
                                            </div>
                                        </div>
                                        {displayItem.night_ot_remarks && (
                                            <div className="col-span-2">
                                                <span className="text-gray-600">Remarks:</span>
                                                <p className="font-medium mt-1 text-gray-800 bg-white p-2 rounded border border-gray-200">
                                                    {displayItem.night_ot_remarks}
                                                </p>
                                            </div>
                                        )}
                                        {displayItem.night_ot_reject_reason && (
                                            <div className="col-span-2">
                                                <span className="text-red-600 font-medium">Rejection Reason:</span>
                                                <p className="font-medium mt-1 text-red-800 bg-red-50 p-2 rounded border border-red-100">
                                                    {displayItem.night_ot_reject_reason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {viewData?.approval_timeline && viewData.approval_timeline.length > 0 && (
                                    <ApprovalTimeline
                                        timeline={viewData.approval_timeline}
                                        workflowName={viewData.workflow_name}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-gray-200 flex justify-end items-center gap-3 bg-slate-50/50 font-semibold text-sm">
                        {displayItem.night_ot_status?.toLowerCase() === 'pending' && (isOrgAdmin || canHRMode || displayItem.can_approve) && (
                            <>
                                <button
                                    onClick={() => {
                                        setModalMode("reject");
                                        setModalReason("");
                                        setModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-2 border border-rose-200 shadow-sm"
                                >
                                    <ThumbsDown className="w-4 h-4" /> Reject
                                </button>
                                <button
                                    onClick={() => {
                                        setModalMode("approve");
                                        setModalReason("");
                                        setModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-md shadow-emerald-100"
                                >
                                    <ThumbsUp className="w-4 h-4" /> Approve
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setDetailsOpen(false)}
                            className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header with Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-900">Night OT Requests</h1>
                        {/* Tab switcher */}
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                            <button
                                onClick={() => setActiveTab('approvals')}
                                className={`px-3 py-1.5 font-medium transition-colors ${activeTab === 'approvals' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                OT Approvals
                                {items.filter(i => String(i.night_ot_status || '').toLowerCase() === 'pending').length > 0 && (
                                    <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                                        {items.filter(i => String(i.night_ot_status || '').toLowerCase() === 'pending').length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('compoffs')}
                                className={`px-3 py-1.5 font-medium transition-colors ${activeTab === 'compoffs' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                Comp-Offs
                                {compoffItems.filter(i => String(i.status || '').toLowerCase() === 'pending').length > 0 && (
                                    <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                                        {compoffItems.filter(i => String(i.status || '').toLowerCase() === 'pending').length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Refresh Button */}
                        <button
                            onClick={fetchList}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>

                        {!externalControl && showHQToggle && canHRMode && !isOrgAdmin && (
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                <input
                                    type="checkbox"
                                    checked={hqMode && canHRMode}
                                    onChange={(e) => setHqMode(e.target.checked)}
                                    disabled={!canHRMode}
                                    className="rounded border-gray-300"
                                />
                                <span>HR Mode</span>
                            </label>
                        )}

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

                        {/* Status Filter */}
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="All">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>

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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
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

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2 flex items-center space-x-2">
                                <button
                                    onClick={fetchList}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    onClick={() => {
                                        setStatus("All");
                                        setFromDate("");
                                        setToDate("");
                                        if (!externalControl) {
                                            setSelectedSiteId(null);
                                            setHqMode(defaultHQ);
                                        }
                                        setPage(1);
                                        setTimeout(() => fetchList(), 100);
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
            {!loading && stats && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Total Requests</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{totalCount}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Pending</p>
                            <p className="text-2xl font-bold text-orange-900 mt-1">{pendingCount}</p>
                        </div>
                        <div className="p-2 bg-orange-100 rounded-lg"><Clock className="w-5 h-5 text-orange-600" /></div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Approved</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">{approvedCount}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-red-600 font-medium uppercase tracking-wider">Rejected</p>
                            <p className="text-2xl font-bold text-red-900 mt-1">{rejectedCount}</p>
                        </div>
                        <div className="p-2 bg-red-100 rounded-lg"><X className="w-5 h-5 text-red-600" /></div>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* List - Night OT Approvals */}
            {activeTab === 'approvals' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-900">Employee</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Request Date</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">OT Times</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Regular Punches</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                                        <p>Loading requests...</p>
                                    </td>
                                </tr>
                            ) : pageSlice.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
                                        <p className="max-w-sm mx-auto mt-1">Try adjusting your search or filters to find what you're looking for.</p>
                                    </td>
                                </tr>
                            ) : (
                                pageSlice.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {item.profile_picture ? (
                                                        <img src={item.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        (item.first_name?.[0] || "E")
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.first_name} {item.last_name}</p>
                                                    <p className="text-xs text-gray-500">{item.employee_code || "No Code"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(item.attendance_date).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-indigo-700">{fmtHm(item.night_ot_duration_minutes)}</div>
                                            <div className="text-xs text-indigo-500 whitespace-nowrap">{fmtTime(item.night_ot_start_time)} - {fmtTime(item.night_ot_end_time)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-800">
                                                {item.punch_in_time ? fmtTime(item.punch_in_time) : "--:--"} - {item.punch_out_time ? fmtTime(item.punch_out_time) : "--:--"}
                                            </div>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Building className="w-2.5 h-2.5" /> {item.department_name || "-"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(String(item.night_ot_status || "Pending"))}`}>
                                                {getStatusIcon(String(item.night_ot_status || "Pending"))}
                                                <span className="ml-1.5 capitalize">{String(item.night_ot_status || "Pending").toLowerCase()}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ActionDropdown item={item} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Pagination - Night OT Approvals */}
            {activeTab === 'approvals' && visibleItems.length > 0 && (
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
                            {page > 1 && (
                                <button onClick={() => setPage(1)} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">1</button>
                            )}
                            {page > 2 && <span className="px-1 text-xs text-gray-500">...</span>}
                            <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">{page}</button>
                            {page < totalPages - 1 && <span className="px-1 text-xs text-gray-500">...</span>}
                            {page < totalPages && (
                                <button onClick={() => setPage(totalPages)} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">{totalPages}</button>
                            )}
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

            {/* Night OT Comp-Off Table */}
            {activeTab === 'compoffs' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-indigo-50 border-b border-indigo-100">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-indigo-900">Employee</th>
                                <th className="px-6 py-3 font-semibold text-indigo-900">Comp-Off Date</th>
                                <th className="px-6 py-3 font-semibold text-indigo-900">Night OT Duration</th>
                                <th className="px-6 py-3 font-semibold text-indigo-900">Remarks</th>
                                <th className="px-6 py-3 font-semibold text-indigo-900">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {compoffItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Clock className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">No Night OT comp-offs yet</h3>
                                        <p className="text-sm mt-1 text-gray-500">Night OT sessions automatically generate comp-offs on checkout.</p>
                                    </td>
                                </tr>
                            ) : compoffItems.map((item: any) => (
                                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.first_name} {item.last_name}</p>
                                            <p className="text-xs text-gray-500">{item.employee_code || `Emp#${item.employee_id}`}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {item.compoff_date ? new Date(item.compoff_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-indigo-700">{fmtHm(item.total_earned_minutes || 0)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{item.remarks || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(String(item.status || 'Pending'))}`}>
                                            {getStatusIcon(String(item.status || 'Pending'))}
                                            <span className="ml-1.5 capitalize">{String(item.status || 'Pending').toLowerCase()}</span>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Modal */}
            {modalOpen && activeItem && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden scale-100 transition-all">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {modalMode === 'approve' ? 'Approve Request' : modalMode === 'reject' ? 'Reject Request' : 'Delete Request'}
                            </h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Summary */}
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg"><User className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-blue-900">{activeItem.first_name} {activeItem.last_name}</p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            {new Date(activeItem.attendance_date).toLocaleDateString()} • {fmtHm(activeItem.night_ot_duration_minutes)} OT
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {modalMode === 'delete' ? (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Trash2 className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h4 className="text-gray-900 font-medium text-lg mb-2">Are you sure?</h4>
                                    <p className="text-gray-500 text-sm">
                                        This action will permanently delete the attendance record and revert any associated updates. This cannot be undone.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {modalMode === 'reject' ? 'Reason for Rejection *' : 'Remarks (Optional)'}
                                    </label>
                                    <textarea
                                        value={modalReason}
                                        onChange={(e) => setModalReason(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                        rows={4}
                                        placeholder={modalMode === 'reject' ? "Please provide a reason..." : "Add any comments..."}
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                            <button onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors">Cancel</button>
                            <button
                                onClick={confirmModal}
                                disabled={modalMode === 'reject' && !modalReason.trim()}
                                className={`px-5 py-2.5 rounded-xl text-white font-medium shadow-sm transition-all transform active:scale-95 ${modalMode === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' :
                                    modalMode === 'reject' ? 'bg-red-600 hover:bg-red-700 shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed' :
                                        'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    }`}
                            >
                                {modalMode === 'approve' ? 'Confirm Approval' : modalMode === 'reject' ? 'Confirm Rejection' : 'Delete Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <DetailsViewModal />
        </div>
    );
}
