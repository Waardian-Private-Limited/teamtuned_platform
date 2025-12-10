"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

type Holiday = {
  id?: number;
  holiday_date: string; // YYYY-MM-DD
  name: string;
  type?: string | null;
  is_optional?: number | boolean;
  description?: string | null;
  status?: "active" | "inactive";
};

export default function HolidayCalendarManager() {
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [successTimer, setSuccessTimer] = React.useState<number>(0);
  const [orgTimezone, setOrgTimezone] = React.useState<string>('Asia/Kolkata');

  // Filters & UI State
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [filtersExpanded, setFiltersExpanded] = React.useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showViewModal, setShowViewModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  // Form states
  const [form, setForm] = React.useState<Holiday>({
    holiday_date: "",
    name: "",
    type: "",
    is_optional: false,
    description: "",
    status: "active"
  });
  const [saving, setSaving] = React.useState(false);
  const [selectedHoliday, setSelectedHoliday] = React.useState<Holiday | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Use centralized auth
  const { role, permissions } = useAuth();

  // Permissions
  const hasPerm = React.useCallback(
    (codes: string | string[]) => {
      const list = (permissions || []).map((p) => (p || "").toUpperCase());
      const arr = Array.isArray(codes) ? codes : [codes];
      return arr.some((c) => list.includes(c.toUpperCase()));
    },
    [permissions]
  );

  const isOrgAdmin = (role || "") === "OrgAdmin";
  const canView = isOrgAdmin || hasPerm(["HOLIDAY_VIEW", "HOLIDAY_ADD", "HOLIDAY_EDIT", "HOLIDAY_DELETE"]);
  const canAdd = isOrgAdmin || hasPerm("HOLIDAY_ADD");
  const canEdit = isOrgAdmin || hasPerm("HOLIDAY_EDIT");
  const canDelete = isOrgAdmin || hasPerm("HOLIDAY_DELETE");

  const fetchHolidays = React.useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (searchTerm) query.set("search", searchTerm);
      if (startDate) query.set("start", startDate);
      if (endDate) query.set("end", endDate);
      if (typeFilter && typeFilter !== "all") query.set("type", typeFilter);
      if (statusFilter && statusFilter !== "all") query.set("status", statusFilter);
      query.set("page", String(currentPage));
      query.set("pageSize", String(pageSize));

      const data = await apiClient<any>(`/holiday${query.toString() ? `?${query.toString()}` : ""}`, {
        method: "GET",
        withAuth: true
      });

      if (Array.isArray(data)) {
        setHolidays(data);
        setTotalItems(data.length);
        setTotalPages(1);
      } else {
        const list = Array.isArray(data.holidays) ? data.holidays : [];
        setHolidays(list);
        setTotalItems(Number(data.total || 0));
        setTotalPages(Number(data.pages || 0));
        if (typeof data.page === "number") setCurrentPage(data.page);
        if (typeof data.pageSize === "number") setPageSize(data.pageSize);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchTerm, typeFilter, statusFilter, currentPage, pageSize, canView]);

  React.useEffect(() => {
    // Load organization timezone
    (async () => {
      try {
        const prof = await apiClient<{ organization?: { timezone?: string } }>("/organization/profile", { method: "GET", withAuth: true });
        const tzRaw = prof?.organization?.timezone || 'Asia/Kolkata';
        setOrgTimezone(tzRaw);
      } catch (_) {
        setOrgTimezone('Asia/Kolkata');
      }
    })();
  }, []);

  React.useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Auto-dismiss success messages after 15 seconds with countdown
  React.useEffect(() => {
    if (success) {
      setSuccessTimer(15);
      const countdown = setInterval(() => {
        setSuccessTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setSuccess(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    } else {
      setSuccessTimer(0);
    }
  }, [success]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        setCurrentPage(1);
        fetchHolidays();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? !!checked : value,
    }));
  };

  const resetForm = () => {
    setForm({
      holiday_date: "",
      name: "",
      type: "",
      is_optional: false,
      description: "",
      status: "active"
    });
  };



  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation
    if (!form.holiday_date) {
      setError("Holiday date is required");
      return;
    }
    if (!form.name.trim()) {
      setError("Holiday name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        holiday_date: form.holiday_date,
        name: form.name.trim(),
        type: form.type || null,
        is_optional: !!form.is_optional,
        description: form.description?.trim() || null,
        status: form.status || "active"
      };

      await apiClient(`/holiday`, {
        method: "POST",
        body: payload,
        withAuth: true,
      });

      resetForm();
      setShowCreateModal(false);
      setSuccess("Holiday added successfully");
      await fetchHolidays();
    } catch (e: any) {
      setError(e?.message || "Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);

    // Parse the date properly - extract YYYY-MM-DD format
    let dateStr = "";
    if (holiday.holiday_date) {
      const str = String(holiday.holiday_date);
      // Match YYYY-MM-DD pattern anywhere in the string
      const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        // Try to parse as date and format
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, '0');
          const day = String(parsed.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
      }
    }

    setForm({
      holiday_date: dateStr,
      name: holiday.name,
      type: holiday.type || "",
      is_optional: !!holiday.is_optional,
      description: holiday.description || "",
      status: holiday.status || "active"
    });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!selectedHoliday?.id) return;

    // Validation
    if (!form.holiday_date) {
      setError("Holiday date is required");
      return;
    }
    if (!form.name.trim()) {
      setError("Holiday name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        holiday_date: form.holiday_date,
        name: form.name.trim(),
        type: form.type || null,
        is_optional: !!form.is_optional,
        description: form.description?.trim() || null,
        status: form.status || "active"
      };

      await apiClient(`/holiday/${selectedHoliday.id}`, {
        method: "PUT",
        body: payload,
        withAuth: true
      });

      setShowEditModal(false);
      setSelectedHoliday(null);
      setSuccess("Holiday updated successfully");
      await fetchHolidays();
    } catch (e: any) {
      setError(e?.message || "Failed to update holiday");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedHoliday?.id) return;
    setActionLoading(`delete-${selectedHoliday.id}`);
    try {
      await apiClient(`/holiday/${selectedHoliday.id}`, {
        method: "DELETE",
        withAuth: true
      });
      setShowDeleteModal(false);
      setSelectedHoliday(null);
      setSuccess("Holiday deleted successfully");
      await fetchHolidays();
    } catch (e: any) {
      setError(e?.message || "Failed to delete holiday");
    } finally {
      setActionLoading(null);
    }
  };

  const openView = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setShowViewModal(true);
  };

  const toggleStatus = async (holiday: Holiday) => {
    const next = holiday.status === "inactive" ? "active" : "inactive";
    try {
      setActionLoading(`status-${holiday.id}`);
      const payload = { status: next };

      await apiClient(`/holiday/${holiday.id}/status`, {
        method: "PATCH",
        body: payload,
        withAuth: true
      });

      // Update local state
      const updated: Holiday = {
        ...holiday,
        status: next as "active" | "inactive"
      };

      setHolidays((prev) => prev.map((h) => (h.id === holiday.id ? updated : h)));
      if (selectedHoliday?.id === holiday.id) setSelectedHoliday(updated);
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchHolidays();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
    fetchHolidays();
  };

  // Type colors
  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'public': return 'text-blue-700 bg-blue-50 border border-blue-200';
      case 'restricted': return 'text-orange-700 bg-orange-50 border border-orange-200';
      case 'company': return 'text-green-700 bg-green-50 border border-green-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getOptionalColor = (isOptional: boolean | number) => {
    return isOptional ? 'text-purple-700 bg-purple-50 border border-purple-200' : 'text-gray-700 bg-gray-50 border border-gray-200';
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-50 border border-green-200';
      case 'inactive': return 'text-red-700 bg-red-50 border border-red-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'inactive': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return <AlertCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: orgTimezone
      });
    } catch (e) {
      return dateString;
    }
  };

  // Action Dropdown Component
  const ActionDropdown = ({ holiday }: { holiday: Holiday }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [placeUp, setPlaceUp] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
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

    React.useEffect(() => {
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
          disabled={actionLoading === `delete-${holiday.id}` || actionLoading === `status-${holiday.id}`}
        >
          {actionLoading === `delete-${holiday.id}` || actionLoading === `status-${holiday.id}` ? (
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
                  onClick={() => { openView(holiday); setIsOpen(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>

                {canEdit && (
                  <button
                    onClick={() => { openEdit(holiday); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Holiday</span>
                  </button>
                )}

                <div className="border-t border-gray-100 my-1" />

                {canEdit && (
                  <button
                    onClick={() => {
                      toggleStatus(holiday);
                      setIsOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${holiday.status === "inactive"
                      ? "text-green-700 hover:bg-green-50"
                      : "text-red-700 hover:bg-red-50"
                      }`}
                  >
                    {holiday.status === "inactive" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{holiday.status === "inactive" ? "Activate" : "Deactivate"}</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => {
                      openDelete(holiday);
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Loading State
  if (loading && holidays.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Holiday Calendar</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage organization holidays</p>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden">
          <div className="bg-gray-50">
            <div className="grid grid-cols-6 gap-4 px-4 py-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (!canView) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Holiday Calendar</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage organization holidays</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view the holiday calendar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render Modals */}
      {/* View Holiday Modal */}
      {showViewModal && selectedHoliday && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Holiday Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Date</h4>
                    <p className="text-lg font-medium mt-1">
                      {formatDate(selectedHoliday.holiday_date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Timezone: {orgTimezone}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <div className="mt-1 flex items-center space-x-2">
                      {getStatusIcon(selectedHoliday.status || 'active')}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedHoliday.status || 'active')} capitalize`}>
                        {selectedHoliday.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Holiday Name</h4>
                  <p className="text-lg font-medium mt-1">{selectedHoliday.name}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Type</h4>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(selectedHoliday.type ?? null)} capitalize`}>
                        {selectedHoliday.type || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Optional Holiday</h4>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getOptionalColor(!!selectedHoliday.is_optional)}`}>
                        {selectedHoliday.is_optional ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedHoliday.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Description</h4>
                    <p className="mt-1 text-gray-900">{selectedHoliday.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {canEdit && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEdit(selectedHoliday);
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Edit Holiday
                </button>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Holiday Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add New Holiday</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      name="holiday_date"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.holiday_date}
                      onChange={handleChange}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Timezone: {orgTimezone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Inactive holidays won't be considered for leave calculations.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holiday Name<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter holiday name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Clear, descriptive name for the holiday.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      name="type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.type || ""}
                      onChange={handleChange}
                    >
                      <option value="">Select type</option>
                      <option value="public">Public Holiday</option>
                      <option value="restricted">Restricted Holiday</option>
                      <option value="company">Company Holiday</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Category for the holiday.</p>
                  </div>

                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      id="is_optional"
                      name="is_optional"
                      type="checkbox"
                      checked={!!form.is_optional}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_optional" className="text-sm text-gray-700">
                      Optional Holiday
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Optional description or notes"
                    value={form.description || ""}
                    onChange={handleChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">Additional context or information about the holiday.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                  setError(null);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className={`px-4 py-2 rounded-lg transition-colors ${!saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
              >
                {saving ? 'Saving...' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {showEditModal && selectedHoliday && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Edit Holiday</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedHoliday(null);
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      name="holiday_date"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.holiday_date}
                      onChange={handleChange}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Timezone: {orgTimezone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Inactive holidays won't be considered for leave calculations.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holiday Name<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Clear, descriptive name for the holiday.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      name="type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.type || ""}
                      onChange={handleChange}
                    >
                      <option value="">Select type</option>
                      <option value="public">Public Holiday</option>
                      <option value="restricted">Restricted Holiday</option>
                      <option value="company">Company Holiday</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Category for the holiday.</p>
                  </div>

                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      id="edit_is_optional"
                      name="is_optional"
                      type="checkbox"
                      checked={!!form.is_optional}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="edit_is_optional" className="text-sm text-gray-700">
                      Optional Holiday
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={form.description || ""}
                    onChange={handleChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">Additional context or information about the holiday.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedHoliday(null);
                  setError(null);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className={`px-4 py-2 rounded-lg transition-colors ${!saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedHoliday && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Delete Holiday</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedHoliday(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete the holiday "<strong>{selectedHoliday.name}</strong>" on{" "}
                <strong>{formatDate(selectedHoliday.holiday_date)}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedHoliday(null);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === `delete-${selectedHoliday.id}`}
                className={`px-4 py-2 rounded-lg transition-colors ${!actionLoading
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
              >
                {actionLoading ? 'Deleting...' : 'Delete Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Holiday Calendar</h1>
            <p className="text-sm text-gray-600 mt-0.5">{totalItems} holidays found</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {canAdd && (
              <button
                onClick={openCreate}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Holiday</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search holidays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />

              <input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="public">Public Holiday</option>
                <option value="restricted">Restricted Holiday</option>
                <option value="company">Company Holiday</option>
              </select>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <div className="flex items-center space-x-2">
                <button
                  onClick={applyFilters}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>{success}</span>
              {successTimer > 0 && (
                <span className="ml-2 text-xs text-green-600">
                  (Auto-closing in {successTimer}s)
                </span>
              )}
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-700 hover:text-green-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Holidays Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Optional</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {holidays.map((holiday) => (
                <tr key={holiday.id ?? `${holiday.holiday_date}-${holiday.name}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(holiday.holiday_date)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {holiday.holiday_date}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{holiday.name}</div>
                    {holiday.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{holiday.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(holiday.type ?? null)} capitalize`}>
                      {holiday.type || 'Not specified'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getOptionalColor(!!holiday.is_optional)}`}>
                      {holiday.is_optional ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1.5">
                      {getStatusIcon(holiday.status || 'active')}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(holiday.status || 'active')} capitalize`}>
                        {holiday.status || 'active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ActionDropdown holiday={holiday} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {holidays.length === 0 && !loading && (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No holidays found</h3>
            <p className="text-xs text-gray-500 mb-3">No holidays match your current filters.</p>
            {canAdd && (
              <button
                onClick={openCreate}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm mx-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Add First Holiday</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-3">
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="font-medium">{totalItems}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${currentPage === 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-1 text-gray-500">...</span>
                      );
                    }
                  }
                  for (let page = startPage; page <= endPage; page++) {
                    pages.push(
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-1 text-gray-500">...</span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${currentPage === totalPages
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
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