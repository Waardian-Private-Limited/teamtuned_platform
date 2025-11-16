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
  CheckCircle,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Image,
  FileText,
  RefreshCw
} from "lucide-react";

type IssueItem = Record<string, any>;

type Props = {
  defaultStatus?: string;
};

export default function VerificationIssues({ defaultStatus = "Pending" }: Props) {
  const [status, setStatus] = React.useState<string>(defaultStatus);
  const [items, setItems] = React.useState<IssueItem[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [activeItem, setActiveItem] = React.useState<IssueItem | null>(null);
  const [activeItemFull, setActiveItemFull] = React.useState<IssueItem | null>(null);
  const [detailsLoading, setDetailsLoading] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);

  // Session & site filtering state (HR mode like LeaveRequests)
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const isEmployee = (role || "").toLowerCase() === "employee";
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const canHRMode = !isEmployee || hasPerm("HR_MODE");
  const [hqMode, setHqMode] = React.useState<boolean>(false);
  const [inchargeSites, setInchargeSites] = React.useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = React.useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // Helper function to determine border colors based on mismatches
  const getBorderColor = (type: 'image' | 'map', checkType: 'in' | 'out') => {
    if (!activeItemFull && !activeItem) return 'border-gray-200';
    
    const item = activeItemFull || activeItem;
    
    const faceMismatch = checkType === 'in' 
      ? item?.has_face_mismatch_in 
      : item?.has_face_mismatch_out;
    
    const locationMismatch = checkType === 'in'
      ? item?.has_location_mismatch_in
      : item?.has_location_mismatch_out;

    // BOTH FaceMismatch AND LocationMismatch - red border for BOTH image and map
    if (faceMismatch && locationMismatch) {
      return 'border-red-500 border-2';
    }
    
    // Face mismatch only - red border for image only
    if (faceMismatch && type === 'image') {
      return 'border-red-500 border-2';
    }
    
    // Location mismatch only - red border for map only
    if (locationMismatch && type === 'map') {
      return 'border-red-500 border-2';
    }
    
    // No mismatches or only one mismatch that doesn't apply to this type
    return 'border-gray-200';
  };

  const fetchList = React.useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setStatusNotice(null);
    try {
      // Build params with HR mode/site filter gating like LeaveRequests
      const params: Record<string, string> = { page: "1", limit: "100" };
      if (status && status !== "All") params["status"] = status;
      const effHq = isOrgAdmin || (hqMode && canHRMode);
      const effSite = selectedSiteId;
      if (!effHq && (!effSite || Number(effSite) <= 0)) {
        setItems([]);
        setError("Select a site or enable HR mode to view verification issues");
        return;
      }
      if (effHq) {
        params["hq"] = "1";
        if (effSite) params["site_id"] = String(effSite);
      } else if (effSite) {
        params["site_id"] = String(effSite);
      }

      const res = await apiClient<any>("/attendance/verification-issues", {
        method: "GET",
        params,
        withAuth: true,
      });
      let list: any[] = Array.isArray(res) ? res : (res?.data || res?.rows || res?.issues || []);
      if (status === 'Pending' && list.length === 0) {
        // Fallback to All if no pending issues found
        const res2 = await apiClient<any>("/attendance/verification-issues", {
          method: "GET",
          params: { ...params, status: 'All' },
          withAuth: true,
        });
        list = Array.isArray(res2) ? res2 : (res2?.data || res2?.rows || res2?.issues || []);
        setStatusNotice('No Pending issues found. Showing All issues.');
      }
      const mapped = list.map((e: any) => ({ ...(e || {}) }));
      setItems(mapped);
      if (reset) {
        setPage(1);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load verification issues");
    } finally {
      setLoading(false);
    }
  }, [loading, status, hqMode, selectedSiteId, canHRMode, isOrgAdmin]);

  React.useEffect(() => {
    fetchList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hqMode, selectedSiteId]);

  // Load session and sites similar to LeaveRequests
  React.useEffect(() => {
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
      } catch {}

      try {
        const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
        const list = Array.isArray(res?.sites) ? res!.sites! : [];
        setInchargeSites(list as any[]);
        if (list.length > 0 && selectedSiteId == null) {
          const sid = list[0]?.id;
          const val = typeof sid === "number" ? sid : parseInt(String(sid)) || null;
          setSelectedSiteId(val);
        }
      } catch {}

      try {
        if (canHRMode) {
          const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
          const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
          setAllSites(list as any[]);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first site for non-HR/non-OrgAdmin users
  React.useEffect(() => {
    if (inchargeSites.length > 0 && !canHRMode && !isOrgAdmin && selectedSiteId === null) {
      const firstSiteId = inchargeSites[0]?.id;
      if (firstSiteId) {
        setSelectedSiteId(typeof firstSiteId === "number" ? firstSiteId : parseInt(String(firstSiteId)) || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inchargeSites, canHRMode, isOrgAdmin]);

  const openDetails = async (item: IssueItem) => {
    setActiveItem(item);
    setActiveItemFull(null);
    setModalOpen(true);
    // Lazy-load full details
    if (item?.attendance_id) {
      setDetailsLoading(true);
      try {
        const full = await apiClient<any>(`/attendance/verification-issues/${encodeURIComponent(String(item.attendance_id))}`, {
          method: 'GET',
          withAuth: true,
        });
        const data = Array.isArray(full) ? (full[0] || null) : (full?.data || full?.issue || full || null);
        if (data) setActiveItemFull(data);
      } catch (e: any) {
        // keep minimal details
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveItem(null);
    setActiveItemFull(null);
    setDetailsLoading(false);
  };

  const submitReview = async (payload: any) => {
    if (!activeItem) return;
    
    try {
      setActionLoading('submit_review');
      await apiClient<any>("/attendance/verification-issues/review", {
        method: "POST",
        body: payload,
        withAuth: true,
      });
      
      showNotification('Review submitted successfully', 'success');
      closeModal();
      fetchList(true);
    } catch (e: any) {
      showNotification(e?.message || 'Failed to submit review', 'error');
    } finally {
      setActionLoading(null);
    }
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

  // Formatting helpers
  const fmtDateTime = (v: any): string => {
    if (!v) return "-";
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return String(v);
    }
  };

  const fmtMinutes = (v: any): string => {
    const m = Number(v || 0);
    if (!m) return "0m";
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  };

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
  const ActionDropdown = ({ item, isLastRow = false }: { item: IssueItem, isLastRow?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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
      const dropdownHeight = 120; // Approximate dropdown height
      
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
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
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
                    openDetails(item);
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Review Modal Component
  const ReviewModal = () => {
    if (!modalOpen || !activeItem) return null;

    const item = activeItemFull || activeItem;

    const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
    const [showApproveEdit, setShowApproveEdit] = useState(false);
    const [approveStatus, setApproveStatus] = useState('');
    const [approveTimeline, setApproveTimeline] = useState('');
    const [rejectStatus, setRejectStatus] = useState('Present');
    const [rejectTimeline, setRejectTimeline] = useState('Full-Day');
    const [rejectReason, setRejectReason] = useState('');

    const issueTypes = Array.isArray(item.issue_types) ? item.issue_types.join(", ") : String(item.issue_type || "Verification");
    const statusVal = String(item.status || "Pending");
    const isFinalized = ["approved", "rejected"].includes(statusVal.toLowerCase());
    const [showReview, setShowReview] = useState(!isFinalized);

    const handleSubmit = () => {
      const payload: any = { 
        attendance_id: item.attendance_id, 
        decision 
      };

      if (decision === 'approve') {
        if (approveStatus) payload.marked_status = approveStatus;
        if (approveTimeline) payload.status_timeline = approveTimeline;
      } else {
        payload.marked_status = rejectStatus;
        payload.status_timeline = rejectTimeline;
        if (rejectReason) payload.remarks = rejectReason;
      }

      submitReview(payload);
    };

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Verification Issue Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {String(item.employee_name || "Employee")}
                </p>
              </div>
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
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Issue Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium">{String(item.attendance_date || "-")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Issues:</span>
                    <p className="font-medium">{issueTypes}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className={`font-medium ${getStatusColor(statusVal)} px-2 py-1 rounded-full text-xs`}>
                      {statusVal}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Check-In:</span>
                    <p className="font-medium">{fmtDateTime(item.punch_in_time)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Check-Out:</span>
                    <p className="font-medium">{fmtDateTime(item.punch_out_time)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Work Duration:</span>
                    <p className="font-medium">{fmtMinutes(item.total_work_minutes)}</p>
                  </div>
                </div>
              </div>

              {/* Time Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <span className="text-gray-600 text-sm">Late By</span>
                  <p className="font-medium text-lg">{fmtMinutes(item.late_by_minutes)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <span className="text-gray-600 text-sm">Early Exit</span>
                  <p className="font-medium text-lg">{fmtMinutes(item.early_exit_minutes)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <span className="text-gray-600 text-sm">Expected Work</span>
                  <p className="font-medium text-lg">{fmtMinutes(item.expected_minutes)}</p>
                </div>
              </div>

              {/* Location Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {item.punch_in_site_name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Check-In Site</h4>
                    <p className="text-sm text-gray-700">{String(item.punch_in_site_name)}</p>
                    {item.punch_in_lat && item.punch_in_lng && (
                      <div className="mt-2">
                        <iframe 
                          className={`w-full h-32 rounded-lg ${getBorderColor('map', 'in')}`}
                          src={`https://maps.google.com/maps?q=${item.punch_in_lat},${item.punch_in_lng}&z=15&output=embed`}
                          title="Check-in location"
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {item.punch_out_site_name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Check-Out Site</h4>
                    <p className="text-sm text-gray-700">{String(item.punch_out_site_name)}</p>
                    {item.punch_out_lat && item.punch_out_lng && (
                      <div className="mt-2">
                        <iframe 
                          className={`w-full h-32 rounded-lg ${getBorderColor('map', 'out')}`}
                          src={`https://maps.google.com/maps?q=${item.punch_out_lat},${item.punch_out_lng}&z=15&output=embed`}
                          title="Check-out location"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {item.punch_in_image && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Check-In Image
                    </h4>
                    <img 
                      src={String(item.punch_in_image)} 
                      className={`w-full h-48 object-cover rounded-lg ${getBorderColor('image', 'in')}`}
                      alt="Check-in"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {item.punch_out_image && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Check-Out Image
                    </h4>
                    <img 
                      src={String(item.punch_out_image)} 
                      className={`w-full h-48 object-cover rounded-lg ${getBorderColor('image', 'out')}`}
                      alt="Check-out"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {detailsLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading full details...
                </div>
              )}

              {/* Review Section */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Review</h4>
                  {isFinalized && !showReview && (
                    <button
                      onClick={() => setShowReview(true)}
                      className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                    >
                      Override
                    </button>
                  )}
                </div>

                {showReview && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={decision === 'approve'}
                          onChange={() => setDecision('approve')}
                          className="text-blue-600"
                        />
                        <ThumbsUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Approve</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={decision === 'reject'}
                          onChange={() => setDecision('reject')}
                          className="text-blue-600"
                        />
                        <ThumbsDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm">Reject</span>
                      </label>
                    </div>

                    {decision === 'approve' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-600 text-sm">Current Status:</span>
                            <p className="font-medium">{String(item.attendance_status || '-')}</p>
                          </div>
                          {String(item.attendance_status || '').toLowerCase() !== 'absent' && (
                            <div>
                              <span className="text-gray-600 text-sm">Current Timeline:</span>
                              <p className="font-medium">{String(item.status_timeline || '-')}</p>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => setShowApproveEdit(!showApproveEdit)}
                          className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                        >
                          {showApproveEdit ? 'Cancel Edit' : 'Edit Status'}
                        </button>

                        {showApproveEdit && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <select
                              value={approveStatus}
                              onChange={(e) => setApproveStatus(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="">No Change</option>
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                            </select>
                            <select
                              value={approveTimeline}
                              onChange={(e) => setApproveTimeline(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="">No Change</option>
                              <option value="Full-Day">Full-Day</option>
                              <option value="Half-Day">Half-Day</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {decision === 'reject' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <select
                            value={rejectStatus}
                            onChange={(e) => setRejectStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                          </select>
                          <select
                            value={rejectTimeline}
                            onChange={(e) => setRejectTimeline(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="Full-Day">Full-Day</option>
                            <option value="Half-Day">Half-Day</option>
                          </select>
                        </div>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          rows={3}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSubmit}
                        disabled={actionLoading === 'submit_review' || (decision === 'reject' && !rejectReason.trim())}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                      >
                        {actionLoading === 'submit_review' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : decision === 'approve' ? (
                          <ThumbsUp className="w-4 h-4" />
                        ) : (
                          <ThumbsDown className="w-4 h-4" />
                        )}
                        <span>
                          {actionLoading === 'submit_review' ? 'Submitting...' : 
                           decision === 'approve' ? 'Approve Request' : 'Reject Request'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Verification Issues</h1>
            <p className="text-gray-600 mt-1">Review and manage attendance verification issues</p>
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
              {[...Array(4)].map((_, i) => (
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
      {/* Render modal */}
      <ReviewModal />
      
      {/* Fixed Header Section */}
      <div className="sticky top-0 z-30 bg-white pb-6 border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verification Issues</h1>
            <p className="text-gray-600 mt-1">Review and manage attendance verification issues</p>
          </div>
        </div>

        {/* Compact Stats Cards - Single line layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span> 
                Total Issues
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
            {/* HR Mode Checkbox */}
            {canHRMode && !isOrgAdmin && (
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

            {/* Status Filter */}
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

            {/* Site Filter */}
            <div className="flex flex-col min-w-[160px]">
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

            {/* Reset Filters Button */}
            <button
              onClick={() => {
                setStatus("All");
                setSelectedSiteId(null);
                setHqMode(isOrgAdmin ? true : false);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagedItems.map((item, index) => {
                const name = String(item.employee_name || "-");
                const statusStr = String(item.status || "Pending");
                const issueTypes = Array.isArray(item.issue_types) ? item.issue_types.join(", ") : String(item.issue_type || "Verification");
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
                    <td className="px-6 py-4 text-sm text-gray-900">{String(item.attendance_date || "-")}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{issueTypes}</div>
                      {Number(item.issue_count || 0) > 1 && (
                        <div className="text-xs text-gray-500">({item.issue_count} issues)</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{fmtDateTime(item.punch_in_time)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{fmtDateTime(item.punch_out_time)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{fmtMinutes(item.total_work_minutes)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(statusStr)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(statusStr)} capitalize`}>
                          {statusStr.toLowerCase()}
                        </span>
                      </div>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No verification issues found</h3>
            <p className="text-gray-500 mb-4">No verification issues match your current filters.</p>
            <button
              onClick={() => { 
                setStatus("All");
                setSelectedSiteId(null);
                setHqMode(isOrgAdmin ? true : false);
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
            <p className="text-gray-500">Loading verification issues...</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, items.length)} of {items.length} issues
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