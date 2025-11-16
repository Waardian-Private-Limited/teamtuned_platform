"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
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
  MapPin
} from "lucide-react";

type LeaveItem = Record<string, any>;

type Props = {
  defaultHQ?: boolean;
  showHQToggle?: boolean;
  externalControl?: boolean;
  hqMode?: boolean;
  selectedSiteId?: number | null;
};

export default function LeaveRequests({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
  const [hqMode, setHqMode] = React.useState<boolean>(extHq ?? defaultHQ);
  const [inchargeSites, setInchargeSites] = React.useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = React.useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(extSiteId ?? null);
  const [status, setStatus] = React.useState<string>("All");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [items, setItems] = React.useState<LeaveItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Session-based permission gating
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const isEmployee = (role || "").toLowerCase() === "employee";
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const hasAnyLeaveAccess = !isEmployee || ["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"].some((c) => hasPerm(c));
  const canHRMode = !isEmployee || hasPerm("HR_MODE");

  // Modal state for clean approve/reject flow
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [modalMode, setModalMode] = React.useState<"approve" | "reject">("approve");
  const [modalReason, setModalReason] = React.useState<string>("");
  const [activeItem, setActiveItem] = React.useState<LeaveItem | null>(null);

  // Details view modal state
  const [viewOpen, setViewOpen] = React.useState<boolean>(false);
  const [viewLoading, setViewLoading] = React.useState<boolean>(false);
  const [viewError, setViewError] = React.useState<string | null>(null);
  const [viewData, setViewData] = React.useState<Record<string, any> | null>(null);

  // Client-side pagination
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // Action loading states
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Auto-select first site for non-HR/non-OrgAdmin users on first load
  React.useEffect(() => {
    if (inchargeSites.length > 0 && !canHRMode && !isOrgAdmin && selectedSiteId === null) {
      const firstSiteId = inchargeSites[0]?.id;
      if (firstSiteId) {
        setSelectedSiteId(typeof firstSiteId === "number" ? firstSiteId : parseInt(String(firstSiteId)) || null);
      }
    }
  }, [inchargeSites, canHRMode, isOrgAdmin, selectedSiteId]);

  React.useEffect(() => {
    (async () => {
      // Load session for role & permissions
      try {
        const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole((session.role || null) as string | null);
          setPermissions(session.employee?.permissions || []);
          // Force HR mode on by default for OrgAdmins
          if ((session.role || '').toLowerCase() === 'orgadmin') {
            setHqMode(true);
          }
        }
      } catch {}

      try {
        const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
        const list = Array.isArray(res?.sites) ? res!.sites! : [];
        setInchargeSites(list as any[]);
        if (list.length > 0 && selectedSiteId == null) {
          const sid = list[0]?.id;
          setSelectedSiteId(typeof sid === "number" ? sid : parseInt(String(sid)) || null);
        }
      } catch (e) {
        // ignore
      }

      // If HR mode is available, fetch all sites to allow optional filtering in HQ mode
      try {
        if (canHRMode) {
          const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
          const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
          setAllSites(list as any[]);
        }
      } catch {}
    })();
  }, []);

  // Reactively fetch all sites when HR capability becomes available
  React.useEffect(() => {
    (async () => {
      if (!canHRMode || allSites.length > 0) return;
      try {
        const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
        const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
        setAllSites(list as any[]);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canHRMode]);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (status && status !== "All") params["status"] = status;
      const effHq = isOrgAdmin || (((externalControl ? (extHq ?? hqMode) : hqMode)) && canHRMode);
      const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;
      // Guard: require either HR mode or a selected site
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
      if (fromDate) params["from_date"] = fromDate;
      if (toDate) params["to_date"] = toDate;

      const res = await apiClient<any>("/leaves/requests", { method: "GET", params, withAuth: true });
      const list: any[] = Array.isArray(res) ? res : (res?.rows || res?.requests || res?.data || []);
      setItems(list.map((e: any) => ({ ...(e || {}) })));
      setPage(1); // reset to first page when filters change
    } catch (e: any) {
      setError(e?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [status, hqMode, selectedSiteId, fromDate, toDate]);

  React.useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await apiClient<any>(`/organization/employees/${empId}` , { method: "GET", withAuth: true });
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

  // Helper functions for modern notifications
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
    notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${
      type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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

  // Date formatting helpers
  function parseDateFlexible(v: any): Date | null {
    if (!v) return null;
    const s = String(v);
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    // Try YYYY-MM-DD
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
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Action Dropdown Component with improved positioning
  const ActionDropdown = ({ item, isLastRow = false }: { item: LeaveItem, isLastRow?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
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

    // Calculate if dropdown should open upwards for last rows
    const getDropdownPosition = () => {
      if (!dropdownRef.current) return {};
      
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 160; // Approximate dropdown height
      
      if ((spaceBelow < dropdownHeight && rect.top > dropdownHeight) || isLastRow) {
        return { bottom: '100%', top: 'auto' };
      }
      return { top: '100%', bottom: 'auto' };
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
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
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div 
              className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20"
              style={getDropdownPosition()}
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

  // Modern Modal Components
  const ApproveRejectModal = () => {
    if (!modalOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                    <p className="font-medium">{Number(activeItem.duration_days || activeItem.days || 0)} days</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 ${
                modalMode === "approve" 
                  ? 'bg-green-600 hover:bg-green-700 disabled:opacity-50' 
                  : 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
              }`}
            >
              {modalMode === "approve" ? (
                <>
                  <ThumbsUp className="w-4 h-4" />
                  <span>Approve Leave</span>
                </>
              ) : (
                <>
                  <ThumbsDown className="w-4 h-4" />
                  <span>Reject Leave</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Details View Modal
  const DetailsViewModal = () => {
    if (!viewOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
            {viewLoading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
            
            {viewError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>{viewError}</span>
                </div>
              </div>
            )}
            
            {!viewLoading && !viewError && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Role</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.role_name ?? viewData?.role ?? "—")}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Designation</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.designation ?? "—")}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.department_name ?? viewData?.department ?? "—")}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.contact?.phone || viewData?.phone || "—")}
                    </p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.contact?.email || viewData?.email || "—")}
                    </p>
                  </div>
                </div>

                {/* Leave Balances */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Leave Balances</h4>
                  {Array.isArray(viewData?.leave_balances) && viewData.leave_balances.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {viewData.leave_balances.map((b: any, idx: number) => {
                        const total = Number(b.total_allocated || 0);
                        const used = Number(b.used || 0);
                        const remaining = Math.max(total - used, 0);
                        const expiry = b.expiry_date ? formatDateHuman(b.expiry_date) : null;
                        
                        return (
                          <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-gray-900">{String(b.leave_type || b.type || "Leave")}</h5>
                              {expiry && (
                                <span className="text-xs text-gray-500">Expires {expiry}</span>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total:</span>
                                <span className="font-semibold">{total}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Used:</span>
                                <span className="font-semibold text-orange-600">{used}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Remaining:</span>
                                <span className="font-semibold text-green-600">{remaining}</span>
                              </div>
                              {b.carry_forward && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Carry Forward:</span>
                                  <span className="font-semibold text-blue-600">{Number(b.carry_forward)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No leave balance information available</p>
                    </div>
                  )}
                </div>
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

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
            <p className="text-gray-600 mt-1">Manage and review employee leave requests</p>
          </div>
        </div>
        
        {/* Compact Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="animate-pulse">
            <div className="flex flex-wrap items-center gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded w-40"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 border-b border-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Render modals */}
      <ApproveRejectModal />
      <DetailsViewModal />
      
      {/* Fixed Header Section */}
      <div className="sticky top-0 z-30 bg-white pb-6 border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
            <p className="text-gray-600 mt-1">Manage and review employee leave requests</p>
          </div>
        </div>

        {/* Compact Stats Cards - Single line layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span> 
                Total Requests
              </div>
              <div className="text-lg font-semibold">{items.length}</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span> 
                Pending
              </div>
              <div className="text-lg font-semibold">
                {items.filter(item => String(item.status).toLowerCase() === 'pending').length}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span> 
                Approved
              </div>
              <div className="text-lg font-semibold">
                {items.filter(item => String(item.status).toLowerCase() === 'approved').length}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span> 
                Rejected
              </div>
              <div className="text-lg font-semibold">
                {items.filter(item => String(item.status).toLowerCase() === 'rejected').length}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Filters - All in one line */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {!externalControl && showHQToggle && canHRMode && !isOrgAdmin && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
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

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 min-w-[160px]">
              <Search className="w-4 h-4 text-gray-400" />
              <select 
                className="bg-transparent border-none focus:ring-0 text-sm w-full"
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="flex flex-col min-w-[140px]">
              <label className="text-xs text-gray-600 mb-1">From Date</label>
              <input 
                type="date" 
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
              />
            </div>

            <div className="flex flex-col min-w-[140px]">
              <label className="text-xs text-gray-600 mb-1">To Date</label>
              <input 
                type="date" 
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
              />
            </div>

            {!externalControl && (
              <div className="flex flex-col min-w-[160px]">
                <label className="text-xs text-gray-600 mb-1">Site</label>
                <select
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  {hqMode && canHRMode ? (
                    <option value="">All Sites</option>
                  ) : (
                    <option value="">Select Site</option>
                  )}
                  {((hqMode && canHRMode) ? allSites : inchargeSites).length === 0 && <option value="">No sites</option>}
                  {((hqMode && canHRMode) ? allSites : inchargeSites).map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {String(s.name || s.site_name || s.id)}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              className="ml-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permission Warning */}
      {isEmployee && !hasAnyLeaveAccess && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Access Denied</p>
              <p className="text-sm mt-1">You do not have permission to view Leave Requests.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Scrollable Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagedItems.map((item, index) => {
                const name = String(item.employee_name || item.employee || `Employee #${item.employee_id || "-"}`);
                const type = String(item.type || item.leave_type || "");
                const statusRaw = String(item.status || "Pending");
                const statusLower = statusRaw.toLowerCase();
                const start = formatDateHuman(item.start_date || item.from || "");
                const end = formatDateHuman(item.end_date || item.to || "");
                const reason = String(item.reason || item.rejection_reason || item.reject_reason || "");
                const days = Number(item.duration_days || item.days || 0);
                const isLastRow = index === pagedItems.length - 1;
                
                return (
                  <tr key={String(item.id)} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{name}</div>
                          <div className="text-xs text-gray-500">#{String(item.employee_id || "-")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{type}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{start}</div>
                      <div className="text-xs text-gray-500">to {end}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {days} day{days !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(statusRaw)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(statusRaw)} capitalize`}>
                          {statusLower}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {reason ? (
                        <span className="text-xs text-gray-700 line-clamp-2">{reason}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <ActionDropdown item={item} isLastRow={isLastRow} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {!loading && items.length === 0 && !error && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests found</h3>
            <p className="text-gray-500 mb-4">No leave requests match your current filters.</p>
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
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {loading && items.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading leave requests...</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, items.length)} of {items.length} requests
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
            
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}