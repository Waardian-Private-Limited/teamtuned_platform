"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { 
  Plus, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Filter,
  Calendar,
  Download,
  Upload,
  Clock
} from "lucide-react";

type Holiday = {
  id?: number;
  holiday_date: string; // YYYY-MM-DD
  name: string;
  type?: string | null;
  is_optional?: number | boolean;
  description?: string | null;
};

export default function HolidayCalendarManager() {
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

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
  });
  const [saving, setSaving] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [selectedHoliday, setSelectedHoliday] = React.useState<Holiday | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Permissions
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
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
  }, [startDate, endDate, searchTerm, typeFilter, currentPage, pageSize, canView]);

  React.useEffect(() => {
    // Load session for role and permissions
    (async () => {
      try {
        const session = await apiClient<{ 
          authenticated: boolean; 
          role: string; 
          employee?: { permissions?: string[] } | null 
        }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole(session.role || null);
          setPermissions(session.employee?.permissions || []);
        }
      } catch (_) {}
    })();
  }, []);

  React.useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Debounced search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!canView) return;
      setCurrentPage(1);
      fetchHolidays();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? !!checked : value,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        holiday_date: form.holiday_date,
        name: form.name,
        type: form.type || null,
        is_optional: !!form.is_optional,
        description: form.description || null,
      };
      await apiClient(`/holiday`, {
        method: "POST",
        body: payload,
        withAuth: true,
      });
      setForm({ holiday_date: "", name: "", type: "", is_optional: false, description: "" });
      setShowCreateModal(false);
      setSuccess("Holiday added successfully");
      await fetchHolidays();
    } catch (e: any) {
      setError(e?.message || "Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setForm({
      holiday_date: String(holiday.holiday_date).slice(0, 10),
      name: holiday.name,
      type: holiday.type || "",
      is_optional: !!holiday.is_optional,
      description: holiday.description || "",
    });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!selectedHoliday?.id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        holiday_date: form.holiday_date,
        name: form.name,
        type: form.type || null,
        is_optional: !!form.is_optional,
        description: form.description || null,
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

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiClient(`/holiday/import`, { 
        method: "POST", 
        body: fd, 
        withAuth: true 
      });
      setFile(null);
      setSuccess("Holidays imported successfully");
      await fetchHolidays();
    } catch (e: any) {
      setError(e?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const applyFilters = () => {
    // Only reset page; fetch is triggered by effect when dependencies change
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setTypeFilter("all");
    setCurrentPage(1);
  };

  // Type colors
  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'public': return 'text-blue-600 bg-blue-50';
      case 'restricted': return 'text-orange-600 bg-orange-50';
      case 'company': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getOptionalColor = (isOptional: boolean | number) => {
    return isOptional ? 'text-purple-600 bg-purple-50' : 'text-gray-600 bg-gray-50';
  };

  // Action Dropdown Component
  const ActionDropdown = ({ holiday }: { holiday: Holiday }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

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

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={actionLoading === `delete-${holiday.id}`}
        >
          {actionLoading === `delete-${holiday.id}` ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <MoreVertical className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="py-1">
                <button
                  onClick={() => { 
                    openView(holiday); 
                    setIsOpen(false); 
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
                
                {canEdit && (
                  <button
                    onClick={() => { 
                      openEdit(holiday); 
                      setIsOpen(false); 
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Holiday</span>
                  </button>
                )}
                
                <div className="border-t border-gray-100 my-1" />
                
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
            <p className="text-gray-600 mt-1">Manage organization holidays and time off</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (!canView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
            <p className="text-gray-600 mt-1">Manage organization holidays and time off</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view the holiday calendar.</p>
        </div>
      </div>
    );
  }

  // Create Holiday Modal
  const CreateHolidayModal = () => {
    if (!showCreateModal) return null;
    
    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Add New Holiday</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            </div>

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
            </div>

            <div className="flex items-center space-x-2">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Optional description"
                value={form.description || ""}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </form>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Add Holiday'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Edit Holiday Modal
  const EditHolidayModal = () => {
    if (!showEditModal || !selectedHoliday) return null;
    
    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Edit Holiday</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
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
            </div>

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
            </div>

            <div className="flex items-center space-x-2">
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
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={saving}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // View Holiday Modal
  const ViewHolidayModal = () => {
    if (!showViewModal || !selectedHoliday) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
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
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date</h4>
                <p className="mt-1 text-gray-900">
                  {new Date(selectedHoliday.holiday_date).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Type</h4>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedHoliday.type ?? null)} capitalize`}>
                    {selectedHoliday.type || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Holiday Name</h4>
              <p className="mt-1 text-lg font-medium text-gray-900">{selectedHoliday.name}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Optional Holiday</h4>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOptionalColor(!!selectedHoliday.is_optional)}`}>
                  {selectedHoliday.is_optional ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {selectedHoliday.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="mt-1 text-gray-900">{selectedHoliday.description}</p>
              </div>
            )}
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
    );
  };

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal || !selectedHoliday) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Delete Holiday</h3>
          </div>
          
          <div>
            <p className="text-gray-600">
              Are you sure you want to delete the holiday "<span className="font-semibold">{selectedHoliday.name}</span>" on{" "}
              <span className="font-semibold">
                {new Date(selectedHoliday.holiday_date).toLocaleDateString()}
              </span>?
              This action cannot be undone.
            </p>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === `delete-${selectedHoliday.id}`}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !actionLoading
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {actionLoading ? 'Deleting...' : 'Delete Holiday'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Render Modals */}
      <CreateHolidayModal />
      <EditHolidayModal />
      <ViewHolidayModal />
      <DeleteConfirmationModal />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Holiday Calendar</h1>
          <p className="text-gray-600 mt-0.5 text-sm">Manage organization holidays and time off</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Holiday</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search holidays..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="public">Public Holiday</option>
            <option value="restricted">Restricted Holiday</option>
            <option value="company">Company Holiday</option>
          </select>
          
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={applyFilters}
              className="px-2.5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-1"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-2.5 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex-1"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Import Holidays</h4>
              <p className="text-xs text-gray-600">Upload a CSV file to import multiple holidays at once</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-600"
              />
              <button
                onClick={handleImport}
                disabled={importing || !file}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  !importing && file
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Importing...' : 'Import CSV'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Optional</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holidays.map((holiday) => (
                <tr key={holiday.id ?? `${holiday.holiday_date}-${holiday.name}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(holiday.holiday_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                    {holiday.description && (
                      <div className="text-sm text-gray-500 line-clamp-1">{holiday.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(holiday.type ?? null)} capitalize`}>
                      {holiday.type || 'Not specified'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOptionalColor(!!holiday.is_optional)}`}>
                      {holiday.is_optional ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <ActionDropdown holiday={holiday} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {holidays.length === 0 && !loading && (
          <div className="text-center py-10">
            <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1.5">No holidays found</h3>
            <p className="text-gray-500 mb-3 text-sm">No holidays match your current filters.</p>
            {canAdd && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto">
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Holiday</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} holidays
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
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