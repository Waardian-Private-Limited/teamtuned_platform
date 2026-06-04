"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
    Search,
    Filter,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    X,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Clock,
    ThumbsUp,
    ThumbsDown,
    Calendar,
    Timer,
    ChevronDown,
    ChevronUp,
    Eye,
    XCircle,
    MapPin,
} from "lucide-react";

type CompOffItem = Record<string, any>;

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
        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [target, duration]);
    return v;
}

export default function CompOffRequests() {
    const { role, permissions } = useAuth();

    // Permissions
    const isEmployee = (role || "").toLowerCase() === "employee";
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const hasAccess = !isEmployee || ["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"].some((c) => hasPerm(c));
    const canApprove = isOrgAdmin || hasPerm("APPROVE_LEAVE_REQUESTS");
    const canHRMode = !isEmployee || hasPerm("HR_MODE");

    // State
    const [hqMode, setHqMode] = useState<boolean>(isOrgAdmin);
    const [inchargeSites, setInchargeSites] = useState<Array<Record<string, any>>>([]);
    const [allSites, setAllSites] = useState<Array<Record<string, any>>>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
    const [status, setStatus] = useState<string>("All");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    const [items, setItems] = useState<CompOffItem[]>([]);
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; total: number } | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [total, setTotal] = useState<number>(0);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
    const [statsLoading, setStatsLoading] = useState<boolean>(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<"approve" | "reject">("approve");
    const [modalReason, setModalReason] = useState<string>("");
    const [activeItem, setActiveItem] = useState<CompOffItem | null>(null);

    // Details view modal state
    const [viewOpen, setViewOpen] = useState<boolean>(false);
    const [viewData, setViewData] = useState<Record<string, any> | null>(null);
    const [timeline, setTimeline] = useState<Array<Record<string, any>>>([]);
    const [attendanceRecord, setAttendanceRecord] = useState<any>(null);

    // Rechecker state
    const [recheckModalOpen, setRecheckModalOpen] = useState<boolean>(false);
    const [recheckDate, setRecheckDate] = useState<string>("");
    const [recheckLoading, setRecheckLoading] = useState<boolean>(false);

    // Smart Bulk Action state
    const [smartBulkOpen, setSmartBulkOpen] = useState<boolean>(false);
    const [smartBulkSiteId, setSmartBulkSiteId] = useState<number | null>(null);
    const [smartBulkMonth, setSmartBulkMonth] = useState<number>(new Date().getMonth() + 1);
    const [smartBulkYear, setSmartBulkYear] = useState<number>(new Date().getFullYear());
    const [smartBulkStatus, setSmartBulkStatus] = useState<string>("Pending");
    const [smartBulkAction, setSmartBulkAction] = useState<"approved" | "rejected">("approved");
    const [smartBulkLoading, setSmartBulkLoading] = useState<boolean>(false);
    const [smartBulkRemarks, setSmartBulkRemarks] = useState<string>("");

    // Bulk Selection States
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [confirmRejected, setConfirmRejected] = useState<boolean>(false);

    // Stats animation
    const pendingCount = useCountUp(stats?.pending || 0);
    const approvedCount = useCountUp(stats?.approved || 0);
    const rejectedCount = useCountUp(stats?.rejected || 0);
    const totalCount = useCountUp(stats?.total || 0);

    // Auto-select first site for non-HR/non-OrgAdmin users on first load
    useEffect(() => {
        if (inchargeSites.length > 0 && !canHRMode && !isOrgAdmin && selectedSiteId === null) {
            const firstSiteId = inchargeSites[0]?.id;
            if (firstSiteId) {
                setSelectedSiteId(typeof firstSiteId === "number" ? firstSiteId : parseInt(String(firstSiteId)) || null);
            }
        }
    }, [inchargeSites, canHRMode, isOrgAdmin, selectedSiteId]);

    // Fetch sites
    useEffect(() => {
        (async () => {
            try {
                if (isOrgAdmin) {
                    setHqMode(true);
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
        if (canHRMode && allSites.length === 0) {
            (async () => {
                try {
                    const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                    const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                    setAllSites(list as any[]);
                } catch { }
            })();
        }
    }, [canHRMode]);

    const fetchList = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const effHq = hqMode;
            const effSite = selectedSiteId;

            if (!effHq && (!effSite || Number(effSite) <= 0)) {
                setItems([]);
                throw new Error("Select a site or enable HR mode to view comp-off requests");
            }

            const params: Record<string, string> = {
                page: String(page),
                limit: "20",
            };
            if (effHq) {
                params["hq"] = "1";
                if (effSite) params["site_id"] = String(effSite);
            } else if (effSite) {
                params["site_id"] = String(effSite);
            }
            if (status && status !== "All") params["status"] = status.toLowerCase();
            if (fromDate) params["start"] = fromDate;
            if (toDate) params["end"] = toDate;

            const res = await apiClient<any>("/attendance/comp-off/requests", { method: "GET", params, withAuth: true });
            const list: any[] = res?.requests || [];
            const pagination = res?.pagination || {};

            setItems(list);
            setTotal(pagination.total || 0);
            setTotalPages(pagination.pages || 1);
        } catch (e: any) {
            setError(e?.message || "Failed to load comp-off requests");
        } finally {
            setLoading(false);
        }
    }, [status, page, fromDate, toDate, hqMode, selectedSiteId]);

    const toggleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(i => i.id));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        if (hasAccess) {
            fetchList();
        }
    }, [status, page, fromDate, toDate, hqMode, selectedSiteId, hasAccess]);

    // Fetch stats
    useEffect(() => {
        (async () => {
            try {
                setStatsLoading(true);
                const params: Record<string, string> = {};
                if (fromDate) params["start"] = fromDate;
                if (toDate) params["end"] = toDate;

                // Calculate stats from items for now (backend can add dedicated endpoint later)
                const pending = items.filter((i) => i.status?.toLowerCase() === "pending").length;
                const approved = items.filter((i) => i.status?.toLowerCase() === "approved").length;
                const rejected = items.filter((i) => i.status?.toLowerCase() === "rejected").length;

                setStats({
                    pending,
                    approved,
                    rejected,
                    total: items.length,
                });
            } catch (_) {
                setStats(null);
            } finally {
                setStatsLoading(false);
            }
        })();
    }, [items, fromDate, toDate]);

    const approve = async (id?: number) => {
        const idsToProcess = id ? [id] : selectedIds;
        if (idsToProcess.length === 0) return;

        try {
            setActionLoading(id ? `approve_${id}` : "bulk_approve");
            await apiClient("/attendance/approve-compoff", {
                method: "POST",
                body: {
                    ids: idsToProcess,
                    action: "approved",
                    confirm_rejected: confirmRejected
                },
                withAuth: true
            });
            showNotification(`${idsToProcess.length} Comp-off(s) approved successfully`, "success");
            setSelectedIds([]);
            fetchList();
        } catch (e: any) {
            showNotification(e?.message || "Failed to approve comp-off", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const reject = async (id: number | undefined, reason: string) => {
        const idsToProcess = id ? [id] : selectedIds;
        if (idsToProcess.length === 0) return;

        try {
            setActionLoading(id ? `reject_${id}` : "bulk_reject");
            await apiClient("/attendance/approve-compoff", {
                method: "POST",
                body: {
                    ids: idsToProcess,
                    action: "rejected",
                    remarks: reason,
                    confirm_rejected: confirmRejected
                },
                withAuth: true
            });
            showNotification(`${idsToProcess.length} Comp-off(s) rejected successfully`, "success");
            setSelectedIds([]);
            fetchList();
        } catch (e: any) {
            showNotification(e?.message || "Failed to reject comp-off", "error");
        } finally {
            setActionLoading(null);
        }
    };


    const formatTime = (dateStr?: string) => {
        if (!dateStr) return "—";
        try {
            const date = new Date(dateStr);
            return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return "—";
        }
    };

    const openModal = (item: CompOffItem, mode: "approve" | "reject") => {
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
        if (!activeItem && selectedIds.length === 0) return;

        if (modalMode === "approve") {
            await approve(activeItem?.id);
        } else {
            await reject(activeItem?.id, modalReason.trim());
        }
        closeModal();
    };

    const fetchTimeline = async (compoffId: number) => {
        try {
            const res = await apiClient<{ timeline?: any[] }>(`/attendance/comp-off/${compoffId}/timeline`, {
                method: 'GET',
                withAuth: true
            });
            return res?.timeline || [];
        } catch {
            return [];
        }
    };

    const openDetailsView = async (item: CompOffItem) => {
        setActiveItem(item);
        setViewData(item);

        // Fetch timeline
        const timelineData = await fetchTimeline(Number(item.id));
        setTimeline(timelineData);

        // Fetch attendance record for earned day
        setAttendanceRecord(null);
        if (item.compoff_date && item.employee_id) {
            try {
                // Format date to YYYY-MM-DD
                const dateParam = new Date(item.compoff_date).toISOString().split('T')[0];
                const res = await apiClient<{ success: boolean; record: any }>(
                    `/attendance/record-by-date?employee_id=${item.employee_id}&date=${dateParam}`,
                    { method: 'GET', withAuth: true }
                );
                if (res?.success && res.record) {
                    setAttendanceRecord(res.record);
                }
            } catch (err) {
                console.error("Failed to fetch attendance details", err);
            }
        }

        setViewOpen(true);
    };

    const createNotificationContainer = () => {
        const container = document.createElement("div");
        container.id = "notification-container";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
        return container;
    };

    const showNotification = (message: string, type: "success" | "error") => {
        const container = document.getElementById("notification-container") || createNotificationContainer();
        const notification = document.createElement("div");
        notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`;

        const icon = document.createElement("div");
        icon.className = `p-2 rounded-full ${type === "success" ? "bg-green-100" : "bg-red-100"}`;
        icon.innerHTML =
            type === "success"
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

        const content = document.createElement("div");
        content.className = "flex-1";
        content.innerHTML = `<p class="${type === "success" ? "text-green-800" : "text-red-800"} font-medium">${message}</p>`;

        notification.appendChild(icon);
        notification.appendChild(content);
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = "0";
            notification.style.transition = "opacity 0.5s ease";
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 500);
        }, 5000);
    };

    const handleRecheck = async () => {
        if (!recheckDate) return;
        setRecheckLoading(true);
        try {
            const res = await apiClient<any>("/attendance/recheck-compoff", {
                method: "POST",
                body: { date: recheckDate, site_id: selectedSiteId },
                withAuth: true
            });
            showNotification(`Recheck complete. ${res.generated} comp-offs generated.`, "success");
            setRecheckModalOpen(false);
            setRecheckDate("");
            fetchList();
        } catch (e: any) {
            showNotification(e?.message || "Failed to recheck comp-offs", "error");
        } finally {
            setRecheckLoading(false);
        }
    };

    const handleSmartBulk = async () => {
        if (smartBulkAction === "rejected" && !smartBulkRemarks.trim()) {
            showNotification("Please provide a reason for bulk rejection", "error");
            return;
        }

        setSmartBulkLoading(true);
        try {
            const res = await apiClient<any>("/attendance/approve-compoff", {
                method: "POST",
                body: {
                    action: smartBulkAction,
                    remarks: smartBulkRemarks.trim() || `Smart bulk ${smartBulkAction}`,
                    confirm_rejected: confirmRejected,
                    filters: {
                        site_id: smartBulkSiteId,
                        month: smartBulkMonth,
                        year: smartBulkYear,
                        status: smartBulkStatus
                    }
                },
                withAuth: true
            });
            showNotification(`${res.processed || 0} Comp-off(s) processed via smart bulk action`, "success");
            setSmartBulkOpen(false);
            fetchList();
        } catch (e: any) {
            showNotification(e?.message || "Failed to process smart bulk action", "error");
        } finally {
            setSmartBulkLoading(false);
        }
    };

    const formatDate = (dateStr: string): string => {
        try {
            const dt = new Date(dateStr);
            return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
        } catch {
            return dateStr;
        }
    };

    const formatMinutes = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved":
                return "text-green-700 bg-green-50 border border-green-200";
            case "rejected":
                return "text-red-700 bg-red-50 border border-red-200";
            case "pending":
                return "text-orange-700 bg-orange-50 border border-orange-200";
            default:
                return "text-gray-700 bg-gray-50 border border-gray-200";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved":
                return <CheckCircle className="w-3 h-3 text-green-500" />;
            case "rejected":
                return <AlertCircle className="w-3 h-3 text-red-500" />;
            case "pending":
                return <Clock className="w-3 h-3 text-orange-500" />;
            default:
                return <Clock className="w-3 h-3 text-gray-500" />;
        }
    };

    // Modal Component - Memoized to prevent re-creation and focus loss
    const ApproveRejectModal = React.useMemo(() => {
        if (!modalOpen || (!activeItem && selectedIds.length === 0)) return null;

        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {modalMode === "approve" ? "Approve Comp-Off" : "Reject Comp-Off"}
                            </h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            {activeItem ? (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Employee:</span>
                                        <p className="font-medium">{`${activeItem.first_name || ""} ${activeItem.last_name || ""}`.trim()}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Date:</span>
                                        <p className="font-medium">{formatDate(activeItem.compoff_date || "")}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Earned Time:</span>
                                        <p className="font-medium">{formatMinutes(Number(activeItem.total_earned_minutes || 0))}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Remarks:</span>
                                        <p className="font-medium">{activeItem.remarks || "—"}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-sm font-medium text-indigo-700">Processing {selectedIds.length} selected requests</p>
                                    {confirmRejected && <p className="text-xs text-amber-600 mt-1 font-semibold">Override mode: Including rejected requests</p>}
                                </div>
                            )}
                        </div>

                        {modalMode === "reject" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    rows={4}
                                    value={modalReason}
                                    onChange={(e) => setModalReason(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (modalReason.trim() && !actionLoading?.includes(`reject`)) {
                                                confirmModal();
                                            }
                                        }
                                    }}
                                    placeholder="Please provide a reason for rejecting this comp-off..."
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmModal}
                            disabled={modalMode === "reject" && !modalReason.trim()}
                            className={`px-4 py-2 text-white rounded-lg ${modalMode === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                                } disabled:opacity-50`}
                        >
                            {modalMode === "approve" ? "Approve" : "Reject"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }, [modalOpen, activeItem, modalMode, modalReason, actionLoading, selectedIds, confirmRejected]);

    // Action Dropdown Component
    const ActionDropdown = ({ item }: { item: CompOffItem }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [placeUp, setPlaceUp] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);
        const triggerRef = useRef<HTMLButtonElement>(null);
        const statusLower = String(item.status || "Pending").toLowerCase();

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, []);

        useEffect(() => {
            if (isOpen) {
                const rect = triggerRef.current?.getBoundingClientRect();
                const spaceBelow = typeof window !== 'undefined' ? (window.innerHeight - (rect?.bottom || 0)) : 0;
                const approxMenuHeight = 200;
                setPlaceUp(spaceBelow < approxMenuHeight + 16);
            }
        }, [isOpen]);

        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    ref={triggerRef}
                    onClick={() => setIsOpen((o) => !o)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    disabled={actionLoading?.includes(`approve_${item.id}`) || actionLoading?.includes(`reject_${item.id}`)}
                >
                    {actionLoading?.includes(`approve_${item.id}`) || actionLoading?.includes(`reject_${item.id}`) ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                    )}
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                        <div
                            className={`fixed ${placeUp ? 'bottom-auto' : 'top-auto'} w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[101]`}
                            style={{
                                left: triggerRef.current ? `${triggerRef.current.getBoundingClientRect().right - 192}px` : '0',
                                top: placeUp ? 'auto' : triggerRef.current ? `${triggerRef.current.getBoundingClientRect().bottom + 4}px` : '0',
                                bottom: placeUp && triggerRef.current ? `${window.innerHeight - triggerRef.current.getBoundingClientRect().top + 4}px` : 'auto'
                            }}
                        >
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        openDetailsView(item);
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>View Details</span>
                                </button>

                                {statusLower === "pending" && canApprove && (
                                    <>
                                        <div className="border-t border-gray-100 my-1" />
                                        <button
                                            onClick={() => {
                                                openModal(item, "approve");
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                            <span>Approve</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                openModal(item, "reject");
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                        >
                                            <ThumbsDown className="w-4 h-4" />
                                            <span>Reject</span>
                                        </button>
                                    </>
                                )}

                                {/* Override for OrgAdmin and HR_MODE users on approved/rejected requests */}
                                {/* Override for OrgAdmin and HR_MODE users */}
                                {/* Show if: 
                                    1. Status is NOT pending (already finalized)
                                    2. OR Status IS pending BUT user cannot approve normally (e.g. not current approver in workflow)
                                */}
                                {(isOrgAdmin || canHRMode) && (statusLower !== "pending" || !canApprove) && (
                                    <>
                                        <div className="border-t border-gray-100 my-1" />
                                        <button
                                            onClick={() => {
                                                openModal(item, "approve");
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                            <span>Override - Approve</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                openModal(item, "reject");
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                                        >
                                            <ThumbsDown className="w-4 h-4" />
                                            <span>Override - Reject</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Permission Denied
    if (isEmployee && !hasAccess) {
        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Comp-Off Requests</h1>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
                    <p className="text-gray-500">You do not have permission to view Comp-Off Requests.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Comp-Off Requests</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        {canHRMode && !isOrgAdmin && (
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
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {(isOrgAdmin || canHRMode) && (
                            <>
                                <button
                                    onClick={() => setRecheckModalOpen(true)}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-1 text-sm shadow-sm"
                                    title="Recheck for missing comp-offs on a specific date"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Retroactive Check</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setSmartBulkSiteId(selectedSiteId);
                                        setSmartBulkOpen(true);
                                    }}
                                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold flex items-center space-x-2 text-sm shadow-md"
                                    title="Smart Bulk Approve/Reject based on filters"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Smart Bulk Action</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Collapsible Filters */}
                {filtersExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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

                            <div className="flex items-center space-x-2"></div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="md:col-span-4 flex items-center space-x-2">
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
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{totalCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-red-800">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Comp-Off Requests</h3>
                    <p className="text-gray-600">All requests have been processed</p>
                </div>
            ) : (
                <>
                    {/* Bulk Action Bar */}
                    {/* Bulk Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-semibold text-indigo-900">
                                    {selectedIds.length} request(s) selected
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-slate-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={confirmRejected}
                                        onChange={(e) => setConfirmRejected(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs font-medium text-indigo-700">Confirm Rejected (Override)</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setModalMode("approve");
                                        setModalOpen(true);
                                        setActiveItem(null); // Ensure bulk mode
                                    }}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve Selected
                                </button>
                                <button
                                    onClick={() => {
                                        setModalMode("reject");
                                        setModalOpen(true);
                                        setActiveItem(null); // Ensure bulk mode
                                    }}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject Selected
                                </button>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={items.length > 0 && selectedIds.length === items.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Earned Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Remarks
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item) => {
                                        const statusLower = String(item.status || "Pending").toLowerCase();
                                        const name = `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Employee";
                                        const minutes = Number(item.total_earned_minutes || 0);
                                        const date = item.compoff_date || "";
                                        const remarks = item.remarks || "";

                                        return (
                                            <tr key={item.id} className={`${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => toggleSelect(item.id)}
                                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{name}</div>
                                                    <div className="text-sm text-gray-500">{item.employee_code || ""}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-900">
                                                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                        {formatDate(date)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-900">
                                                        <Timer className="w-4 h-4 mr-2 text-gray-400" />
                                                        {formatMinutes(minutes)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                            statusLower
                                                        )}`}
                                                    >
                                                        {getStatusIcon(statusLower)}
                                                        <span>{statusLower.charAt(0).toUpperCase() + statusLower.slice(1)}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">{remarks || "—"}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <ActionDropdown item={item} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-700">
                                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-700">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Approve/Reject Modal */}
            {ApproveRejectModal}

            {/* Details View Modal */}
            {viewOpen && activeItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Comp-Off Details</h3>
                                <button onClick={() => setViewOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-600">Employee:</span>
                                        <p className="font-medium">{`${activeItem.first_name || ""} ${activeItem.last_name || ""}`.trim()}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Department:</span>
                                        <p className="font-medium">{activeItem.department_name || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Date:</span>
                                        <p className="font-medium">{formatDate(activeItem.compoff_date || "")}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Earned Time:</span>
                                        <p className="font-medium">{formatMinutes(Number(activeItem.total_earned_minutes || 0))}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Status:</span>
                                        <p className="font-medium">{activeItem.status || "—"}</p>
                                    </div>
                                </div>

                                {/* Attendance Details Section */}
                                {attendanceRecord && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                                                <Timer className="w-3.5 h-3.5" />
                                                Attendance on {activeItem?.compoff_date ? new Date(activeItem.compoff_date).toLocaleDateString() : 'Earned Day'}
                                            </div>
                                            {attendanceRecord.primary_site_name && (
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    Primary: <span className="font-medium text-slate-700">{attendanceRecord.primary_site_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded border border-slate-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="text-xs text-slate-500">Check In</div>
                                                    {attendanceRecord.check_in_site_name && (
                                                        <div className="text-[10px] text-slate-400 truncate max-w-[80px]" title={attendanceRecord.check_in_site_name}>
                                                            {attendanceRecord.check_in_site_name}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-semibold text-slate-900">
                                                    {attendanceRecord.punch_in_time ? new Date(attendanceRecord.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </div>
                                            </div>
                                            <div className="bg-white p-3 rounded border border-slate-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="text-xs text-slate-500">Check Out</div>
                                                    {attendanceRecord.check_out_site_name && (
                                                        <div className="text-[10px] text-slate-400 truncate max-w-[80px]" title={attendanceRecord.check_out_site_name}>
                                                            {attendanceRecord.check_out_site_name}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-semibold text-slate-900">
                                                    {attendanceRecord.punch_out_time ? new Date(attendanceRecord.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-3">
                                            <div className="bg-emerald-50 p-2 rounded text-center border border-emerald-100">
                                                <div className="text-xs text-emerald-600">Work</div>
                                                <div className="font-bold text-emerald-800">
                                                    {Math.floor((attendanceRecord.total_work_minutes || 0) / 60)}h {(attendanceRecord.total_work_minutes || 0) % 60}m
                                                </div>
                                            </div>
                                            <div className="bg-amber-50 p-2 rounded text-center border border-amber-100">
                                                <div className="text-xs text-amber-600">Late</div>
                                                <div className="font-bold text-amber-800">
                                                    {attendanceRecord.late_minutes || 0}m
                                                </div>
                                            </div>
                                            <div className="bg-indigo-50 p-2 rounded text-center border border-indigo-100">
                                                <div className="text-xs text-indigo-600">Extra</div>
                                                <div className="font-bold text-indigo-800">
                                                    {attendanceRecord.extra_work_minutes || 0}m
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                </div>
                            </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end items-center gap-3 bg-slate-50/50">
                            {activeItem.status === 'Pending' && (isOrgAdmin || canHRMode || activeItem.can_approve) && (
                                <>
                                    <button
                                        onClick={() => {
                                            setModalMode("reject");
                                            setModalReason("");
                                            setModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-2 border border-rose-200 font-semibold text-sm shadow-sm"
                                    >
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalMode("approve");
                                            setModalReason("");
                                            setModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-md shadow-emerald-100 font-semibold text-sm"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Approve
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setViewOpen(false)}
                                className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm border border-gray-200 shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Smart Bulk Action Modal */}
            {smartBulkOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <ThumbsUp className="w-6 h-6 text-indigo-600" />
                                    Smart Bulk Action
                                </h3>
                                <button onClick={() => setSmartBulkOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                This will process all Comp-Off requests matching the filters below. This action is irreversible.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Site</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={smartBulkSiteId || ""}
                                        onChange={(e) => setSmartBulkSiteId(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">All Sites</option>
                                        {(canHRMode ? allSites : inchargeSites).map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.site_name || s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Month</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={smartBulkMonth}
                                        onChange={(e) => setSmartBulkMonth(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Year</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={smartBulkYear}
                                        onChange={(e) => setSmartBulkYear(Number(e.target.value))}
                                    >
                                        {[2024, 2025, 2026].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Current Status</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={smartBulkStatus}
                                        onChange={(e) => setSmartBulkStatus(e.target.value)}
                                    >
                                        <option value="Pending">Pending Only</option>
                                        <option value="Approved">Approved Only</option>
                                        <option value="Rejected">Rejected Only</option>
                                        <option value="">Any Status</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Action</label>
                                    <select
                                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 outline-none font-medium ${smartBulkAction === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
                                        value={smartBulkAction}
                                        onChange={(e) => setSmartBulkAction(e.target.value as any)}
                                    >
                                        <option value="approved">Approve All</option>
                                        <option value="rejected">Reject All</option>
                                    </select>
                                </div>
                            </div>

                            {smartBulkAction === 'rejected' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Rejection Remarks</label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        rows={3}
                                        value={smartBulkRemarks}
                                        onChange={(e) => setSmartBulkRemarks(e.target.value)}
                                        placeholder="Reason for bulk rejection..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 bg-slate-50 rounded-b-xl">
                            <button
                                onClick={() => setSmartBulkOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSmartBulk}
                                disabled={smartBulkLoading}
                                className={`px-6 py-2 text-white rounded-lg transition-all shadow-md flex items-center gap-2 text-sm font-semibold ${smartBulkAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} disabled:opacity-50`}
                            >
                                {smartBulkLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        {smartBulkAction === 'approved' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        <span>Execute Bulk {smartBulkAction === 'approved' ? 'Approval' : 'Rejection'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Retroactive Recheck Modal */}
            {recheckModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Retroactive Compoff Check</h3>
                                <button onClick={() => setRecheckModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Select a date to scan for employees who worked on Week-Offs or Holidays but didn't receive comp-offs.
                                Compoffs will be generated based on the current policy rules (4h for 0.5, 6h for 1.0).
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                                        value={recheckDate}
                                        onChange={(e) => setRecheckDate(e.target.value)}
                                    />
                                </div>
                                {selectedSiteId && (
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                                        Filtering by currently selected site.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setRecheckModalOpen(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecheck}
                                disabled={!recheckDate || recheckLoading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
                            >
                                {recheckLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                                <span>Run Check</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
