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
  User,
  Calendar,
  Clock,
  Building,
  Mail,
  Phone,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
  MapPin,
  Image,
  ChevronDown,
  ChevronUp,
  Users,
  Check
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
  attendance_id: number;
  attendance_date: string;
  employee_id: number;
  employee_name: string;
  current_status: string;
  status_timeline: string;
  status: string;
  created_at: string;
  approved_by_name?: string;
  remarks?: string;
  punch_in_time?: string;
  punch_out_time?: string;
  workflow_id?: number;
  current_level?: number;
  workflow_status?: string;
  workflow_name?: string;
  approval_timeline?: ApprovalTimelineEntry[];
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
  const { role, permissions, user, employee } = useAuth();

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

export default function RegularizeRequests({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
  const { role, permissions, user, employee } = useAuth();
  // Permissions
  const isEmployee = (role || "").toLowerCase() === "employee";
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const hasAnyRegAccess = !isEmployee || ["ATTREG_VIEW", "ATTREG_APPROVE"].some((c) => hasPerm(c));
  const canHRMode = !isEmployee || hasPerm("HR_MODE");

  // State
  const [hqMode, setHqMode] = useState<boolean>(extHq ?? defaultHQ);
  const [inchargeSites, setInchargeSites] = useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(extSiteId ?? null);
  const [status, setStatus] = useState<string>("All");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [items, setItems] = useState<RequestItem[]>([]);
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
  const [modalMode, setModalMode] = useState<"approve" | "reject">("approve");
  const [modalReason, setModalReason] = useState<string>("");
  const [activeItem, setActiveItem] = useState<RequestItem | null>(null);
  const [markStatus, setMarkStatus] = useState<string>("Present");
  const [statusTimeline, setStatusTimeline] = useState<string>("Full-Day");
  const [userInTime, setUserInTime] = useState<string>("");
  const [userOutTime, setUserOutTime] = useState<string>("");
  const [initialInTime, setInitialInTime] = useState<string>("");
  const [initialOutTime, setInitialOutTime] = useState<string>("");
  const [removeLateMark, setRemoveLateMark] = useState<boolean>(false);
  const [removeEarlyMark, setRemoveEarlyMark] = useState<boolean>(false);
  const [removeLatePenalty, setRemoveLatePenalty] = useState<boolean>(false);
  const [removeEarlyPenalty, setRemoveEarlyPenalty] = useState<boolean>(false);

  // Details view modal state
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewData, setViewData] = useState<Record<string, any> | null>(null);
  const [violationDetails, setViolationDetails] = useState<any>(null);

  // Stats animation
  const pendingCount = useCountUp(stats?.pending || 0);
  const approvedCount = useCountUp(stats?.approved || 0);
  const rejectedCount = useCountUp(stats?.rejected || 0);
  const totalCount = useCountUp(stats?.total || 0);

  // Filtered items - backend already filters by status, just use what it returns
  const visibleItems = React.useMemo(() => {
    return items; // Backend handles all filtering (status + site)
  }, [items]);

  const totalEntries = visibleItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageSlice = visibleItems.slice(pageStart, pageStart + pageSize);

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
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          // setRole((session.role || null) as string | null);
          // setPermissions(session.employee?.permissions || []);
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

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      // Always send status parameter (including 'All')
      if (status) params["status"] = status;
      const effHq = isOrgAdmin || (((externalControl ? (extHq ?? hqMode) : hqMode)) && canHRMode);
      const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;

      if (!effHq && (!effSite || Number(effSite) <= 0)) {
        setItems([]);
        throw new Error("Select a site or enable HR mode to view regularization requests");
      }
      if (effHq) {
        params["hq"] = "1";
        if (effSite) params["site_id"] = String(effSite);
      } else if (effSite) {
        params["site_id"] = String(effSite);
      }
      if (fromDate) params["start"] = fromDate;
      if (toDate) params["end"] = toDate;

      const res = await apiClient<any>("/attendance/regularize-requests", { method: "GET", params, withAuth: true });
      const list: any[] = Array.isArray(res) ? res : (res?.items || res?.rows || res?.requests || res?.data || []);
      setItems(list.map((e: any) => ({ ...(e || {}) })));
      setPage(1);
    } catch (e: any) {
      setError(e?.message || "Failed to load regularization requests");
    } finally {
      setLoading(false);
    }
  }, [status, hqMode, selectedSiteId, fromDate, toDate]);

  useEffect(() => {
    fetchList();
  }, [status, externalControl ? extHq : hqMode, externalControl ? extSiteId : selectedSiteId, fromDate, toDate]);

  useEffect(() => {
    (async () => {
      try {
        setStatsLoading(true);
        const params: Record<string, string> = {};
        const effHq = externalControl ? extHq : hqMode;
        const effSite = externalControl ? extSiteId : selectedSiteId;
        if (effHq) params["hq"] = "1";
        if (effSite) params["site_id"] = String(effSite);
        if (fromDate) params["start"] = fromDate;
        if (toDate) params["end"] = toDate;

        // Calculate stats from items
        const pending = items.filter(item => String(item.status).toLowerCase() === 'pending').length;
        const approved = items.filter(item => String(item.status).toLowerCase() === 'approved').length;
        const rejected = items.filter(item => String(item.status).toLowerCase() === 'rejected').length;

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
  }, [items, status, externalControl ? extHq : hqMode, externalControl ? extSiteId : selectedSiteId, fromDate, toDate]);

  const approve = async (id: number, markStatus: string, statusTimeline: string, remarks: string = "") => {
    try {
      setActionLoading(`approve_${id}`);
      await apiClient(`/attendance/regularize-requests/${id}`, {
        method: "PATCH",
        body: {
          status: "approved",
          mark_status: markStatus,
          status_timeline: statusTimeline,
          user_in_time: userInTime || null,
          user_out_time: userOutTime || null,
          remove_late_mark: removeLateMark,
          remove_early_mark: removeEarlyMark,
          remove_late_penalty: removeLatePenalty,
          remove_early_penalty: removeEarlyPenalty,
          remarks, // Send optional remarks
        },
        withAuth: true,
      });

      // Refetch data to get accurate status
      await fetchList();

      showNotification('Request processed successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
      showNotification(e?.message || "Failed to approve regularization request", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id: number, reason: string) => {
    try {
      setActionLoading(`reject_${id}`);
      await apiClient(`/attendance/regularize-requests/${id}`, {
        method: "PATCH",
        body: { status: "rejected", reject_reason: reason },
        withAuth: true,
      });
      setItems((prev) => prev.map((r) => (Number(r.id) === id ? { ...r, status: "rejected", reject_reason: reason } : r)));
      showNotification('Regularization request rejected successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
      showNotification(e?.message || "Failed to reject regularization request", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openModal = (item: RequestItem, mode: "approve" | "reject") => {
    setActiveItem(item);
    setModalMode(mode);
    setModalReason("");
    
    // Pre-populate status and timeline from item
    const s = (item.current_status || item.status || "").toLowerCase();
    if (s === 'absent') {
        setMarkStatus("Absent");
        setStatusTimeline("Full-Day");
    } else {
        setMarkStatus("Present");
        setStatusTimeline(item.status_timeline === 'Half-Day' ? 'Half-Day' : 'Full-Day');
    }
    
    // Initialize times from activeItem if available
    const rawIn = item.user_in_time || item.punch_in_time || "";
    const rawOut = item.user_out_time || item.punch_out_time || "";
    
    // Format YYYY-MM-DD HH:mm:ss to HH:mm for <input type="time" />
    const toTimeInput = (s: string) => {
        if (!s) return "";
        try {
            const dt = new Date(s.includes("T") ? s : s.replace(" ", "T"));
            if (isNaN(dt.getTime())) return "";
            return dt.toTimeString().slice(0, 5);
        } catch { return ""; }
    };
    
    const tIn = toTimeInput(rawIn);
    const tOut = toTimeInput(rawOut);
    setUserInTime(tIn);
    setUserOutTime(tOut);
    setInitialInTime(tIn);
    setInitialOutTime(tOut);
    
    setRemoveEarlyPenalty(false);
    setViolationDetails(null);
    
    setModalOpen(true);
  };

  const openDetailsView = async (item: RequestItem) => {
    setActiveItem(item);
    setViewOpen(true);
    setViewLoading(true);
    setViewError(null);
    setViewData(null);
    try {
      const res = await apiClient<any>(`/attendance/regularize-requests/${item.id}`, { method: "GET", withAuth: true });
      const data = (res?.data ?? res) as Record<string, any>;
      setViewData(data || {});
    } catch (e: any) {
      setViewError(e?.message || "Failed to load request details");
    } finally {
      setViewLoading(false);
    }
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
      await approve(id, markStatus, statusTimeline, modalReason.trim());
      closeModal();
      return;
    }
    const reason = modalReason.trim();
    if (!reason) return;
    await reject(id, reason);
    closeModal();
  };

  const createNotificationContainer = () => {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`;

    const icon = document.createElement('div');
    icon.className = `p-2 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`;
    icon.innerHTML = type === 'success'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    const content = document.createElement('div');
    content.className = 'flex-1';
    content.innerHTML = `<p class="${type === 'success' ? 'text-green-800' : 'text-red-800'} font-medium">${message}</p>`;

    notification.appendChild(icon);
    notification.appendChild(content);
    container.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
      }, 500);
    }, 5000);
  };

  // NEW: Real-time violation checking
  useEffect(() => {
    if (!modalOpen || modalMode !== "approve" || !activeItem) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await apiClient<any>("/attendance/check-violations", {
          method: "POST",
          body: {
            employee_id: activeItem.employee_id,
            attendance_date: activeItem.attendance_date,
            punch_in_time: userInTime,
            punch_out_time: userOutTime
          },
          withAuth: true,
          signal: controller.signal
        });
        setViolationDetails(res);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error("Violation check failed:", e);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [modalOpen, modalMode, activeItem, userInTime, userOutTime]);

  // Formatting helpers
  const fmtHm = (m: any) => {
    const min = Number(m || 0);
    const h = Math.floor(min / 60);
    const mm = String(min % 60).padStart(2, "0");
    return `${h}:${mm}`;
  };

  const fmtTime = (v: any) => {
    if (!v) return "";
    try {
      const s = String(v);
      let dt = new Date(s.includes("T") ? s : s.replace(" ", "T"));
      if (isNaN(dt.getTime())) return s;
      const hours = dt.getHours();
      const h = hours % 12 === 0 ? 12 : hours % 12;
      const m = String(dt.getMinutes()).padStart(2, "0");
      const ap = hours >= 12 ? "PM" : "AM";
      return `${h}:${m} ${ap}`;
    } catch {
      return String(v);
    }
  };

  const fmtDt = (v: any) => {
    if (!v) return "";
    try {
      const s = String(v);
      const dt = new Date(s.includes("T") ? s : s.replace(" ", "T"));
      if (isNaN(dt.getTime())) return s;
      const dateStr = dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
      const timeStr = dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
      return `${dateStr} • ${timeStr}`;
    } catch {
      return String(v);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-700 bg-green-50 border border-green-200';
      case 'rejected': return 'text-red-700 bg-red-50 border border-red-200';
      case 'pending': return 'text-orange-700 bg-orange-50 border border-orange-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'rejected': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'pending': return <Clock className="w-3 h-3 text-orange-500" />;
      default: return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  // Action Dropdown Component
  const ActionDropdown = ({ item }: { item: RequestItem }) => {
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
            <div className={`fixed ${placeUp ? 'bottom-auto' : 'top-auto'} w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[101]`}
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

                {statusLower === "pending" && item.can_approve && (
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
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Modal Components - Memoized to prevent re-creation and focus loss
  const ApproveRejectModal = React.useMemo(() => {
    if (!modalOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === "approve" ? "Approve Regularization Request" : "Reject Regularization Request"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Request Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Employee:</span>
                    <p className="font-medium">{String(activeItem.employee_name || activeItem.employee || "Employee")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium">{String(activeItem.attendance_date || "-")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Check-In:</span>
                    <p className="font-medium">{fmtTime(activeItem.punch_in_time || activeItem.requested_check_in)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Check-Out:</span>
                    <p className="font-medium">{fmtTime(activeItem.punch_out_time || activeItem.requested_check_out)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Work Duration:</span>
                    <p className="font-medium">{fmtHm(activeItem.total_work_minutes)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="flex items-center space-x-1 mt-1">
                      {getStatusIcon(String(activeItem.status))}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(String(activeItem.status))} capitalize`}>
                        {String(activeItem.status || "Pending").toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {modalMode === "approve" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={markStatus === "Absent" ? "Absent" : statusTimeline}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Absent") {
                          setMarkStatus("Absent");
                          setStatusTimeline("Full-Day");
                        } else {
                          setMarkStatus("Present");
                          setStatusTimeline(val);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Full-Day">Full-Day</option>
                      <option value="Half-Day">Half-Day</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adjust In Time</label>
                      <input
                        type="time"
                        value={userInTime}
                        onChange={(e) => setUserInTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adjust Out Time</label>
                      <input
                        type="time"
                        value={userOutTime}
                        onChange={(e) => setUserOutTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>                  {/* Penalty Management — shown when record has active marks or penalties (not yet removed) */}
                  {(
                    (activeItem.is_late_mark === 1 && activeItem.is_late_mark_removed !== 1) ||
                    (activeItem.is_early_mark === 1 && activeItem.is_early_mark_removed !== 1) ||
                    (activeItem.is_latemark_penalty === 1 && activeItem.is_late_penalty_removed !== 1) ||
                    (activeItem.is_early_penalty === 1 && activeItem.is_early_penalty_removed !== 1) ||
                    (violationDetails && (violationDetails.is_late_mark || violationDetails.is_early_mark))
                  ) && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-gray-900">Penalty Management</h5>
                        {violationDetails && (violationDetails.is_late_mark || violationDetails.is_early_mark) && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 animate-pulse">
                            {violationDetails.is_late_penalty || violationDetails.is_early_penalty ? "New Penalty Triggered" : "New Mark Detected"}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Show Late Mark removal only if mark is active (not already removed) */}
                        {(activeItem.is_late_mark === 1 || violationDetails?.is_late_mark) && (
                          <label className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={removeLateMark}
                              onChange={(e) => setRemoveLateMark(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-700">Remove Late Mark</span>
                                {violationDetails?.late_by_minutes > 0 && (
                                    <span className="text-[10px] text-red-500">{violationDetails.late_by_minutes}m Late</span>
                                )}
                            </div>
                          </label>
                        )}
                        {/* Show Early Exit removal only if mark is active */}
                        {(activeItem.is_early_mark === 1 || violationDetails?.is_early_mark) && (
                          <label className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={removeEarlyMark}
                              onChange={(e) => setRemoveEarlyMark(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-700">Remove Early Exit</span>
                                {violationDetails?.early_exit_minutes > 0 && (
                                    <span className="text-[10px] text-red-500">{violationDetails.early_exit_minutes}m Early</span>
                                )}
                            </div>
                          </label>
                        )}
                        {/* Show Late Penalty removal only if penalty is active (not already waived) */}
                        {(activeItem.is_latemark_penalty === 1 || violationDetails?.is_late_penalty) && (
                          <label className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={removeLatePenalty}
                              onChange={(e) => setRemoveLatePenalty(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Waive Late Pen.</span>
                          </label>
                        )}
                        {/* Show Early Penalty removal only if penalty is active (not already waived) */}
                        {(activeItem.is_early_penalty === 1 || violationDetails?.is_early_penalty) && (
                          <label className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={removeEarlyPenalty}
                              onChange={(e) => setRemoveEarlyPenalty(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Waive Early Pen.</span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}


                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      value={modalReason}
                      onChange={(e) => setModalReason(e.target.value)}
                      placeholder="Add any comments or notes for this approval (optional)..."
                    />
                  </div>
                </div>
              )}

              {modalMode === "reject" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
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
                    placeholder="Please provide a reason for rejecting this request..."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmModal}
              disabled={modalMode === "reject" && !modalReason.trim()}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${modalMode === "approve"
                ? 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                : 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                }`}
            >
              {modalMode === "approve" ? "Approve Request" : "Reject Request"}
            </button>
          </div>
        </div>
      </div>
    );
  }, [modalOpen, activeItem, modalMode, markStatus, statusTimeline, modalReason, actionLoading, userInTime, userOutTime, removeLateMark, removeEarlyMark, removeLatePenalty, removeEarlyPenalty]);

  // Approval Timeline Component - matching LeaveRequests.tsx style
  const ApprovalTimeline = ({ timeline, workflowName }: { timeline?: ApprovalTimelineEntry[]; workflowName?: string }) => {
    if (!timeline || timeline.length === 0) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Approval Workflow{workflowName && ` - ${workflowName}`}
        </h4>
        <div className="space-y-3">
          {timeline.map((level, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {level.action === 'approved' ? (
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                ) : level.action === 'rejected' ? (
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${level.action === 'approved' ? 'bg-green-100 text-green-800' :
                    level.action === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                    {level.action === 'pending' ? 'Pending' : level.action.charAt(0).toUpperCase() + level.action.slice(1)}
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
                {level.timeline_due_at && level.action === 'pending' && (
                  <p className="text-xs text-red-500 mt-1">
                    Due: {new Date(level.timeline_due_at).toLocaleString()}
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
    if (!viewOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Regularization Details</h3>
              <button
                onClick={() => setViewOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {viewLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : viewError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>{viewError}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Employee Name</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.employee_name || activeItem?.employee_name || "—")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Employee ID</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.employee_id || activeItem?.employee_id || "—")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Date</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.attendance_date || activeItem?.attendance_date || "—")}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Request Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Check-In:</span>
                        <p className="font-medium">{fmtDt(viewData?.punch_in_time || activeItem?.punch_in_time || activeItem?.requested_check_in)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Check-Out:</span>
                        <p className="font-medium">{fmtDt(viewData?.punch_out_time || activeItem?.punch_out_time || activeItem?.requested_check_out)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Work Duration:</span>
                        <p className="font-medium">{fmtHm(viewData?.total_work_minutes || activeItem?.total_work_minutes)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Late By:</span>
                        <p className="font-medium">{fmtHm(viewData?.late_by_minutes || activeItem?.late_by_minutes)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Early Exit:</span>
                        <p className="font-medium">{fmtHm(viewData?.early_exit_minutes || activeItem?.early_exit_minutes)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Status:</span>
                        <div className="flex items-center space-x-1 mt-1">
                          {getStatusIcon(String(viewData?.status || activeItem?.status))}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(String(viewData?.status || activeItem?.status))} capitalize`}>
                            {String(viewData?.status || activeItem?.status || "Pending").toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {viewData?.reason || activeItem?.reason ? (
                      <div className="col-span-full">
                        <span className="text-sm text-gray-600">Reason:</span>
                        <p className="text-sm mt-1 bg-white p-3 rounded border">{String(viewData?.reason || activeItem?.reason)}</p>
                      </div>
                    ) : null}

                    {/* Requested At timestamp */}
                    {(viewData?.created_at || activeItem?.created_at) && (
                      <div>
                        <span className="text-sm text-gray-600">Requested At:</span>
                        <p className="font-medium">{fmtDt(viewData?.created_at || activeItem?.created_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ✅ Approval/Rejection Details - Only show for Approved or Rejected status */}
                {(viewData?.approved_by_name || activeItem?.approved_by_name) &&
                  String(viewData?.status || activeItem?.status).toLowerCase() !== 'pending' && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        {String(viewData?.status || activeItem?.status).toLowerCase() === 'approved' ? 'Approval Details' : 'Rejection Details'}
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-600">
                              {String(viewData?.status || activeItem?.status).toLowerCase() === 'approved' ? 'Approved By:' : 'Rejected By:'}
                            </span>
                            <p className="font-medium">{String(viewData?.approved_by_name || activeItem?.approved_by_name)}</p>
                          </div>

                          {/* Show status changed to only for approved requests */}
                          {String(viewData?.status || activeItem?.status).toLowerCase() === 'approved' &&
                            (viewData?.current_status || activeItem?.current_status) && (
                              <div>
                                <span className="text-sm text-gray-600">Status Changed To:</span>
                                <p className="font-medium">
                                  {String(viewData?.current_status || activeItem?.current_status)}
                                  {(viewData?.status_timeline || activeItem?.status_timeline) &&
                                    ` (${String(viewData?.status_timeline || activeItem?.status_timeline)})`}
                                </p>
                              </div>
                            )}
                        </div>

                        {/* Show remarks for rejected requests */}
                        {String(viewData?.status || activeItem?.status).toLowerCase() === 'rejected' &&
                          (viewData?.remarks || activeItem?.remarks) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <span className="text-sm text-gray-600">Rejection Reason:</span>
                              <p className="text-sm mt-1 bg-white p-3 rounded border">{String(viewData?.remarks || activeItem?.remarks)}</p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                {/* Approval Timeline */}
                {(viewData?.approval_timeline || activeItem?.approval_timeline) && (
                  <ApprovalTimeline
                    timeline={viewData?.approval_timeline || activeItem?.approval_timeline}
                    workflowName={viewData?.workflow_name || activeItem?.workflow_name}
                  />
                )}

                {/* Location Information */}
                {(viewData?.punch_in_site_name || viewData?.punch_out_site_name) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Site Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {viewData?.punch_in_site_name && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <h5 className="text-sm font-medium text-blue-900 mb-2">Check-In Site</h5>
                          <p className="text-sm text-blue-800">{String(viewData.punch_in_site_name)}</p>
                        </div>
                      )}

                      {viewData?.punch_out_site_name && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <h5 className="text-sm font-medium text-green-900 mb-2">Check-Out Site</h5>
                          <p className="text-sm text-green-800">{String(viewData.punch_out_site_name)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Images */}
                {(viewData?.punch_in_image || viewData?.punch_out_image) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Images</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {viewData?.punch_in_image && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Check-In Image</h5>
                          <img
                            src={String(viewData.punch_in_image)}
                            className="w-full h-48 object-contain rounded-lg border"
                            alt="Check-in"
                          />
                        </div>
                      )}

                      {viewData?.punch_out_image && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Check-Out Image</h5>
                          <img
                            src={String(viewData.punch_out_image)}
                            className="w-full h-48 object-contain rounded-lg border"
                            alt="Check-out"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 p-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setViewOpen(false)}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };



  // Permission Denied
  if (isEmployee && !hasAnyRegAccess) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Regularization Requests</h1>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view Regularization Requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render modals */}
      {ApproveRejectModal}
      <DetailsViewModal />

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Regularization Requests</h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <button
              onClick={fetchList}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
            >
              <svg
                className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
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

              <div className="flex items-center space-x-2"></div>
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
                    // Reload requests after clearing filters
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

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Regularization Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-In
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-Out
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Duration
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && items.length === 0 ? (
                // Ghost Loader
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-32"></div>
                        <div className="h-3 bg-gray-100 rounded w-20"></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                    <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded w-12"></div></td>
                    <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-8 bg-gray-100 rounded w-8"></div></td>
                  </tr>
                ))
              ) : (
                pageSlice.map((item) => {
                  const name = String(item.employee_name || item.employee || `Employee #${item.employee_id || "-"}`);
                  const statusRaw = String(item.status || "Pending");
                  const statusLower = statusRaw.toLowerCase();
                  const checkIn = fmtTime(item.punch_in_time || item.requested_check_in);
                  const checkOut = fmtTime(item.punch_out_time || item.requested_check_out);
                  const workDuration = fmtHm(item.total_work_minutes);

                  return (
                    <tr key={String(item.id)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {name}
                          </div>
                          <div className="text-sm text-gray-500">#{String(item.employee_id || "-")}</div>
                          {String(item.status_summary || '').toLowerCase().includes('no punch') && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="16" x2="12" y2="12"></line>
                                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                Created from missing attendance
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{String(item.attendance_date || "-")}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{checkIn}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{checkOut}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {workDuration}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          {getStatusIcon(statusRaw)}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(statusRaw)} capitalize`}>
                            {statusLower}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionDropdown item={item} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {visibleItems.length === 0 && !loading && (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No regularization requests found</h3>
            <p className="text-xs text-gray-500 mb-3">No regularization requests match your current filters.</p>
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
              }}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Clear Filters
            </button>
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
    </div>
  );
}