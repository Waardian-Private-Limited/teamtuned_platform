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
  Plus,
  ChevronDown,
  ChevronUp,
  Users
} from "lucide-react";

type LeaveItem = Record<string, any>;

type Props = {
  defaultHQ?: boolean;
  showHQToggle?: boolean;
  externalControl?: boolean;
  hqMode?: boolean;
  selectedSiteId?: number | null;
};

function useCountUp(target: number, duration = 800) {
  const [v, setV] = useState(0);
  const { role, permissions, user, organization, employee } = useAuth();

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

export default function LeaveRequests({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
  const { role, permissions, user, employee } = useAuth();
  // Permissions
  const isEmployee = (role || "").toLowerCase() === "employee";
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const hasAnyLeaveAccess = !isEmployee || ["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"].some((c) => hasPerm(c));
  const canHRMode = !isEmployee || hasPerm("HR_MODE");
  const canAddLeave = isOrgAdmin || hasPerm("LEAVE_ADD");

  // State
  const [hqMode, setHqMode] = useState<boolean>(extHq ?? defaultHQ);
  const [inchargeSites, setInchargeSites] = useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(extSiteId ?? null);
  const [status, setStatus] = useState<string>("All");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [stats, setStats] = useState<{ pending_overall: number; month_approved: number; month_rejected: number; month_total: number } | null>(null);
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
  const [activeItem, setActiveItem] = useState<LeaveItem | null>(null);

  // Details view modal state
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewData, setViewData] = useState<Record<string, any> | null>(null);

  // Add Leave modal state
  const [addLeaveOpen, setAddLeaveOpen] = useState<boolean>(false);
  const [employees, setEmployees] = useState<Array<Record<string, any>>>([]);
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  const [addLeaveForm, setAddLeaveForm] = useState({
    employee_id: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    session: "Full Day",
    reason: "",
  });

  // Stats animation
  const pendingCount = useCountUp(stats?.pending_overall || 0);
  const approvedCount = useCountUp(stats?.month_approved || 0);
  const rejectedCount = useCountUp(stats?.month_rejected || 0);
  const totalCount = useCountUp(stats?.month_total || 0);

  // Filtered items
  const visibleItems = React.useMemo(() => {
    return items.filter((it) => {
      const s = String(it.status || '').toLowerCase();
      return s === 'pending' || s === 'approved' || s === 'rejected';
    });
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
      if (status && status !== "All") params["status"] = status;
      const effHq = isOrgAdmin || (((externalControl ? (extHq ?? hqMode) : hqMode)) && canHRMode);
      const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;

      if (!effHq && (!effSite || Number(effSite) <= 0)) {
        setItems([]);
        throw new Error("Select a site or enable HR mode to view leave requests");
      }
      if (effHq) {
        params["hq"] = "1";
        if (effSite) params["site_id"] = String(effSite);
      } else if (effSite) {
        params["site_id"] = String(effSite);
      }
      if (fromDate) params["start"] = fromDate;
      if (toDate) params["end"] = toDate;

      const res = await apiClient<any>("/leaves/requests", { method: "GET", params, withAuth: true });
      const list: any[] = Array.isArray(res) ? res : (res?.items || res?.rows || res?.requests || res?.data || []);
      setItems(list.map((e: any) => ({ ...(e || {}) })));
      setPage(1);
    } catch (e: any) {
      setError(e?.message || "Failed to load leave requests");
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
        const res = await apiClient<any>("/leaves/requests/stats", { method: "GET", params, withAuth: true });
        const data = (res?.data ?? res) as any;
        setStats({
          pending_overall: Number(data?.pending_overall || 0),
          month_approved: Number(data?.month_approved || 0),
          month_rejected: Number(data?.month_rejected || 0),
          month_total: Number(data?.month_total || 0),
        });
      } catch (_) {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [status, externalControl ? extHq : hqMode, externalControl ? extSiteId : selectedSiteId, fromDate, toDate]);

  const approve = async (id: number) => {
    try {
      setActionLoading(`approve_${id}`);
      await apiClient(`/leaves/requests/${id}`, { method: "PATCH", body: { status: "approved" }, withAuth: true });
      setItems((prev) => prev.map((r) => (Number(r.id) === id ? { ...r, status: "approved" } : r)));
      showNotification('Leave request approved successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
      showNotification(e?.message || "Failed to approve leave request", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id: number, reason: string) => {
    try {
      setActionLoading(`reject_${id}`);
      await apiClient(`/leaves/requests/${id}`, { method: "PATCH", body: { status: "rejected", reject_reason: reason }, withAuth: true });
      setItems((prev) => prev.map((r) => (Number(r.id) === id ? { ...r, status: "rejected", reject_reason: reason } : r)));
      showNotification('Leave request rejected successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
      showNotification(e?.message || "Failed to reject leave request", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openModal = (item: LeaveItem, mode: "approve" | "reject") => {
    setActiveItem(item);
    setModalMode(mode);
    setModalReason("");
    setModalOpen(true);
  };

  const openDetailsView = async (item: LeaveItem) => {
    setActiveItem(item);
    setViewOpen(true);
    setViewLoading(true);
    setViewError(null);
    setViewData(null);
    try {
      const empId = Number(item.employee_id || item.employeeId || item.employee_id_pk || item.emp_id);
      if (!empId || Number.isNaN(empId)) throw new Error("Invalid employee id");
      const res = await apiClient<any>(`/organization/employees/${empId}`, { method: "GET", withAuth: true });
      const data = (res?.data ?? res) as Record<string, any>;
      setViewData(data || {});
    } catch (e: any) {
      setViewError(e?.message || "Failed to load employee details");
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
      await approve(id);
      closeModal();
      return;
    }
    const reason = modalReason.trim();
    if (!reason) return;
    await reject(id, reason);
    closeModal();
  };

  // Add Leave functions
  const openAddLeaveModal = async () => {
    setAddLeaveOpen(true);
    if (employees.length === 0) {
      try {
        const res = await apiClient<any>("/organization/employees", { method: "GET", withAuth: true });
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setEmployees(list);
      } catch (e) {
        console.error("Failed to fetch employees", e);
      }
    }
    if (leaveTypes.length === 0) {
      try {
        const res = await apiClient<any>("/leaves/types", { method: "GET", withAuth: true });
        const types = Array.isArray(res?.types) ? res.types.map((t: any) => t.name || t) : [];
        setLeaveTypes(types.length > 0 ? types : ["Casual Leave", "Sick Leave", "Earned Leave"]);
      } catch (e) {
        setLeaveTypes(["Casual Leave", "Sick Leave", "Earned Leave"]);
      }
    }
  };

  const closeAddLeaveModal = () => {
    setAddLeaveOpen(false);
    setAddLeaveForm({
      employee_id: "",
      leave_type: "",
      start_date: "",
      end_date: "",
      session: "Full Day",
      reason: "",
    });
  };

  const submitAddLeave = async () => {
    try {
      if (!addLeaveForm.employee_id || !addLeaveForm.leave_type || !addLeaveForm.start_date || !addLeaveForm.end_date) {
        showNotification("Please fill all required fields", "error");
        return;
      }

      setActionLoading("add_leave");
      await apiClient("/leaves/apply", {
        method: "POST",
        body: {
          employee_id: Number(addLeaveForm.employee_id),
          leave_type: addLeaveForm.leave_type,
          start_date: addLeaveForm.start_date,
          end_date: addLeaveForm.end_date,
          session: addLeaveForm.session,
          reason: addLeaveForm.reason,
          auto_approve: true,
        },
        withAuth: true,
      });
      showNotification("Leave added and approved successfully", "success");
      closeAddLeaveModal();
      fetchList();
    } catch (e: any) {
      showNotification(e?.message || "Failed to add leave", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
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

  function parseDateFlexible(v: any): Date | null {
    if (!v) return null;
    const s = String(v);
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    const m = s.match(/^\s*(\d{4})-(\d{2})-(\d{2})\s*$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      const dt = new Date(y, mo, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    return null;
  }

  function formatDateHuman(v: any): string {
    const dt = parseDateFlexible(v);
    if (!dt) return String(v || "");
    return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

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
  const ActionDropdown = ({ item }: { item: LeaveItem }) => {
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

                {statusLower === "pending" && (!isEmployee || hasPerm("LEAVE_APPROVE")) && (
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

  // Modal Components
  const ApproveRejectModal = () => {
    if (!modalOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Leave Request Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Employee:</span>
                    <p className="font-medium">{String(activeItem.employee_name || activeItem.employee || "Employee")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Leave Type:</span>
                    <p className="font-medium">{String(activeItem.type || activeItem.leave_type || "Leave")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium">{Number(activeItem.duration_days || activeItem.days || 0).toFixed(1)} days</p>
                    {activeItem.session && activeItem.session !== 'Full Day' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                        {activeItem.session}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Period:</span>
                    <p className="font-medium">
                      {formatDateHuman(activeItem.start_date || activeItem.from)} - {formatDateHuman(activeItem.end_date || activeItem.to)}
                    </p>
                  </div>
                </div>
              </div>

              {modalMode === "reject" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this leave request..."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
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
              {modalMode === "approve" ? "Approve Leave" : "Reject Leave"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DetailsViewModal = () => {
    if (!viewOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Employee Details</h3>
              <button
                onClick={() => setViewOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Name</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.name || activeItem?.employee_name || "—")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Employee ID</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.id || activeItem?.employee_id || "—")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.department_name ?? viewData?.department ?? "—")}
                    </p>
                  </div>
                </div>

                {activeItem && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Leave Request Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Leave Type:</span>
                          <p className="font-medium">{String(activeItem.type || activeItem.leave_type || "—")}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Duration:</span>
                          <p className="font-medium">{Number(activeItem.duration_days || activeItem.days || 0).toFixed(1)} days</p>
                          {activeItem.session && activeItem.session !== 'Full Day' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                              {activeItem.session}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Start Date:</span>
                          <p className="font-medium">{formatDateHuman(activeItem.start_date || activeItem.from)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">End Date:</span>
                          <p className="font-medium">{formatDateHuman(activeItem.end_date || activeItem.to)}</p>
                        </div>
                      </div>

                      {activeItem.reason && (
                        <div>
                          <span className="text-sm text-gray-600">Reason:</span>
                          <p className="text-sm mt-1">{String(activeItem.reason)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
    );
  };

  const AddLeaveModal = () => {
    if (!addLeaveOpen) return null;

    const duration = calculateDuration(addLeaveForm.start_date, addLeaveForm.end_date);

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Add Leave</h3>
              <button
                onClick={closeAddLeaveModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={addLeaveForm.employee_id}
                  onChange={(e) => setAddLeaveForm({ ...addLeaveForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()} - {emp.employee_id || emp.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={addLeaveForm.leave_type}
                  onChange={(e) => setAddLeaveForm({ ...addLeaveForm, leave_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addLeaveForm.start_date}
                    onChange={(e) => setAddLeaveForm({ ...addLeaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addLeaveForm.end_date}
                    onChange={(e) => setAddLeaveForm({ ...addLeaveForm, end_date: e.target.value })}
                    min={addLeaveForm.start_date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Session Selector - Only for single-day leaves */}
              {duration === 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session
                  </label>
                  <select
                    value={addLeaveForm.session}
                    onChange={(e) => setAddLeaveForm({ ...addLeaveForm, session: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Full Day">Full Day</option>
                    <option value="Morning">Morning Session (Half Day)</option>
                    <option value="Afternoon">Afternoon Session (Half Day)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select Morning or Afternoon for half-day leave
                  </p>
                </div>
              )}

              {duration > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Duration: {duration === 1 && (addLeaveForm.session === 'Morning' || addLeaveForm.session === 'Afternoon') ? '0.5' : duration} day{duration !== 1 || (addLeaveForm.session !== 'Morning' && addLeaveForm.session !== 'Afternoon') ? 's' : ''}
                      {duration === 1 && (addLeaveForm.session === 'Morning' || addLeaveForm.session === 'Afternoon') && (
                        <span className="ml-2 text-xs">({addLeaveForm.session})</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={addLeaveForm.reason}
                  onChange={(e) => setAddLeaveForm({ ...addLeaveForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for leave..."
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={closeAddLeaveModal}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitAddLeave}
              disabled={actionLoading === "add_leave"}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {actionLoading === "add_leave" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Add & Approve Leave</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <div className="h-9 bg-gray-200 rounded flex-1 animate-pulse"></div>
            <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden">
          <div className="bg-gray-50">
            <div className="grid grid-cols-7 gap-4 px-4 py-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4 px-4 py-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (isEmployee && !hasAnyLeaveAccess) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view Leave Requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render modals */}
      <ApproveRejectModal />
      <DetailsViewModal />
      <AddLeaveModal />

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
          </div>
          <div className="flex items-center space-x-3">
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
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {canAddLeave && (
              <button
                onClick={openAddLeaveModal}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Leave</span>
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
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Pending (Overall)</p>
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
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">This Month Approved</p>
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
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">This Month Rejected</p>
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
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">This Month Total</p>
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

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pageSlice.map((item) => {
                const name = String(item.employee_name || item.employee || `Employee #${item.employee_id || "-"}`);
                const type = String(item.type || item.leave_type || "");
                const statusRaw = String(item.status || "Pending");
                const statusLower = statusRaw.toLowerCase();
                const start = formatDateHuman(item.start_date || item.from || "");
                const end = formatDateHuman(item.end_date || item.to || "");
                const reason = String(item.reason || item.rejection_reason || item.reject_reason || "");
                const days = Number(item.duration_days || item.days || 0);

                return (
                  <tr key={String(item.id)} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {name}
                        </div>
                        <div className="text-sm text-gray-500">#{String(item.employee_id || "-")}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{type}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{start}</div>
                      <div className="text-xs text-gray-500">to {end}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {days.toFixed(1)} day{days !== 1 ? 's' : ''}
                        </span>
                        {item.session && item.session !== 'Full Day' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {item.session}
                          </span>
                        )}
                      </div>
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
                      {reason ? (
                        <span className="text-xs text-gray-700 line-clamp-2">{reason}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActionDropdown item={item} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleItems.length === 0 && !loading && (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No leave requests found</h3>
            <p className="text-xs text-gray-500 mb-3">No leave requests match your current filters.</p>
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
