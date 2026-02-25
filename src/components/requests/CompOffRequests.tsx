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

    const approve = async (id: number) => {
        try {
            setActionLoading(`approve_${id}`);
            await apiClient(`/attendance/comp-off/${id}`, {
                method: "PATCH",
                body: { status: "approved" },
                withAuth: true
            });
            showNotification("Comp-off approved successfully", "success");
            fetchList();
        } catch (e: any) {
            showNotification(e?.message || "Failed to approve comp-off", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const reject = async (id: number, reason: string) => {
        try {
            setActionLoading(`reject_${id}`);
            await apiClient(`/attendance/comp-off/${id}`, {
                method: "PATCH",
                body: { status: "rejected", remarks: reason },
                withAuth: true
            });
            showNotification("Comp-off rejected successfully", "success");
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
        if (!activeItem) return;
        const id = Number(activeItem.id);
        if (modalMode === "approve") {
            await approve(id);
            closeModal();
            return;
        }
        const reason = modalReason.trim();
        if (!reason) return;
        await reject(id, reason);
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
        if (!modalOpen || !activeItem) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                                            if (modalReason.trim() && !actionLoading?.includes(`reject_${activeItem?.id}`)) {
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
    }, [modalOpen, activeItem, modalMode, modalReason, actionLoading]);

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
                            <button
                                onClick={() => setRecheckModalOpen(true)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-1 text-sm"
                                title="Recheck for missing comp-offs on a specific date"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Retroactive Check</span>
                            </button>
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
                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
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
                                            <tr key={item.id} className="hover:bg-gray-50">
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
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Comp-Off Details</h3>
                                <button onClick={() => setViewOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
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

                                {/* Workflow Timeline */}
                                {timeline.length > 0 && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mt-4">
                                        <div className="text-xs font-semibold text-blue-700 uppercase mb-3 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            Approval Workflow Timeline
                                        </div>
                                        <div className="space-y-3">
                                            {timeline.map((entry, idx) => (
                                                <div key={idx} className="flex items-start space-x-3">
                                                    <div className={`mt-1 w-2 h-2 rounded-full ${entry.action === 'approved' ? 'bg-green-500' :
                                                        entry.action === 'rejected' ? 'bg-red-500' :
                                                            entry.action === 'pending' ? 'bg-orange-500' :
                                                                entry.action === 'auto_escalated' ? 'bg-blue-400' :
                                                                    'bg-gray-400'
                                                        }`} />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                Level {entry.level_number}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {entry.action_taken_at ? formatDate(entry.action_taken_at) : 'Pending'}
                                                            </span>
                                                        </div>
                                                        {entry.approver_name && (
                                                            <p className="text-xs text-gray-600 mt-0.5">
                                                                {entry.action === 'approved' ? '✓ Approved' :
                                                                    entry.action === 'rejected' ? '✗ Rejected' :
                                                                        entry.action === 'auto_escalated' ? '⏭ Auto-escalated' :
                                                                            '⏳ Pending'} by {entry.approver_name}
                                                                {entry.employee_code && ` (${entry.employee_code})`}
                                                            </p>
                                                        )}
                                                        {entry.remarks && (
                                                            <p className="text-xs text-gray-500 mt-1 italic bg-white/50 px-2 py-1 rounded">
                                                                "{entry.remarks}"
                                                            </p>
                                                        )}
                                                        {entry.is_current_level === 1 && entry.action === 'pending' && (
                                                            <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                                Current Level
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeItem.remarks && (
                                    <div>
                                        <span className="text-sm text-gray-600">Remarks:</span>
                                        <p className="mt-1">{activeItem.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setViewOpen(false)}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Retroactive Recheck Modal */}
            {recheckModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
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
