"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Smartphone,
  Monitor,
  RefreshCw,
  LogOut,
  Search,
  X,
  Wifi,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface DeviceRow {
  id: number;
  user_id: number;
  device_id: string;
  device_type: "mobile" | "web";
  device_name: string | null;
  ip_address: string | null;
  last_seen: string | null;
  is_active: number;
  created_at: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  mobile_device_id: string | null;
}

interface GroupedUser {
  user_id: number;
  email: string;
  name: string;
  phone: string | null;
  mobile_device_id: string | null;
  devices: DeviceRow[];
}

function relativeTime(dateStr: string | null) {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatIST(dateStr: string | null) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (3600000 * 5.5));
    
    const day = String(istTime.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[istTime.getMonth()];
    const year = istTime.getFullYear();
    
    let hours = istTime.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = String(istTime.getMinutes()).padStart(2, '0');
    
    return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm} (IST)`;
  } catch (e) {
    return dateStr || "N/A";
  }
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search, Filter & Pagination states
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mobile" | "web">("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalEntries, setTotalEntries] = useState<number>(0);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Custom UI dropdown & modal states
  const [activeDropdownUserId, setActiveDropdownUserId] = useState<number | null>(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState<GroupedUser | null>(null);

  // Modern Confirmation Modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: 'info',
    onConfirm: () => { },
  });

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const closeConfirmation = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      if (filter !== "all") params.set("device_type", filter);

      const data = await apiClient<{ success: boolean; devices: DeviceRow[]; total?: number }>("/auth/admin/devices?" + params.toString(), {
        withAuth: true,
      });
      if (data.success) {
        setDevices(data.devices || []);
        setTotalEntries(data.total || 0);
      } else {
        setError("Failed to load devices");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const forceLogout = async (deviceId: number) => {
    setActionLoading(`logout-${deviceId}`);
    try {
      const data = await apiClient<{ success: boolean; message: string }>(`/auth/admin/devices/${deviceId}`, {
        method: "DELETE",
        withAuth: true,
      });
      if (data.success) {
        showToast("success", "Device logged out successfully");
        await load();
      } else {
        showToast("error", data.message || "Failed to logout device");
      }
    } catch (e: any) {
      showToast("error", e?.message || "Failed to logout device");
    } finally {
      setActionLoading(null);
    }
  };

  const executeResetDeviceLock = async (userId: number, userName: string) => {
    setActionLoading(`reset-${userId}`);
    try {
      const data = await apiClient<{ success: boolean; message: string }>(`/auth/admin/devices/reset-lock/${userId}`, {
        method: "POST",
        withAuth: true,
      });
      if (data.success) {
        showToast("success", `Device lock reset for ${userName}`);
        await load();
        
        // Refresh the selected user's devices inside the modal if it's currently open
        setSelectedUserForModal(prev => {
          if (prev && prev.user_id === userId) {
            return { ...prev, mobile_device_id: null };
          }
          return prev;
        });
      } else {
        showToast("error", data.message || "Failed to reset device lock");
      }
    } catch (e: any) {
      showToast("error", e?.message || "Failed to reset device lock");
    } finally {
      setActionLoading(null);
    }
  };

  const resetDeviceLock = (userId: number, userName: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Reset Device Lock",
      message: `Are you sure you want to reset the device lock for ${userName}? This will allow them to log in from a new mobile device.`,
      type: 'warning',
      onConfirm: () => {
        closeConfirmation();
        executeResetDeviceLock(userId, userName);
      }
    });
  };

  // Group devices by user
  const grouped: GroupedUser[] = React.useMemo(() => {
    const map = new Map<number, GroupedUser>();
    for (const d of devices) {
      if (!map.has(d.user_id)) {
        map.set(d.user_id, {
          user_id: d.user_id,
          email: d.email,
          name: [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email,
          phone: d.phone,
          mobile_device_id: d.mobile_device_id,
          devices: [],
        });
      }
      if (d.id) {
        map.get(d.user_id)!.devices.push(d);
      }
    }
    return Array.from(map.values());
  }, [devices]);

  // Derived pagination helpers
  const pageStart = (page - 1) * pageSize;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  // Render stats totals from active list context
  const totalActive = devices.filter((d) => d.is_active === 1).length;
  const totalMobile = devices.filter((d) => d.device_type === "mobile" && d.is_active === 1).length;
  const totalWeb = devices.filter((d) => d.device_type === "web" && d.is_active === 1).length;

  // Confirmation Modal Component
  const ConfirmationModal = () => {
    if (!confirmationModal.isOpen) return null;

    const icon = confirmationModal.type === 'danger'
      ? <AlertCircle className="w-6 h-6 text-red-600" />
      : confirmationModal.type === 'warning'
        ? <AlertCircle className="w-6 h-6 text-amber-600" />
        : <AlertCircle className="w-6 h-6 text-blue-600" />;

    const btnClass = confirmationModal.type === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : confirmationModal.type === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
        <div className="relative w-full max-w-md transform rounded-2xl bg-white p-6 text-left shadow-xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${confirmationModal.type === 'danger' ? 'bg-red-100' : confirmationModal.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900 truncate">
                {confirmationModal.title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {confirmationModal.message}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              onClick={closeConfirmation}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none ${btnClass}`}
              onClick={confirmationModal.onConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Modals & Overlays */}
      <ConfirmationModal />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employee Devices</h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Type Filter */}
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="web">Web</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total Active Sessions</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{totalActive}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Wifi className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Mobile Sessions</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{totalMobile}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Smartphone className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Web Sessions</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{totalWeb}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Monitor className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Table Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-xl border border-gray-200">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading devices…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-red-500 bg-white rounded-xl border border-gray-200">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="font-medium">{error}</p>
          <button onClick={load} className="text-sm underline text-blue-600">Try again</button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 bg-white rounded-xl border border-gray-200">
          <Smartphone className="w-10 h-10 text-gray-300" />
          <p className="font-medium text-gray-600">No employees found</p>
          <p className="text-sm">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primary Device ID (Mobile Lock)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Sessions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grouped.map((user) => {
                  const activeSessions = user.devices.filter((d) => d.is_active === 1);
                  return (
                    <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                      {/* Column 1: Employee context */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {(user.name[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {user.email} {user.phone ? `• ${user.phone}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Mobile device lock context */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.mobile_device_id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-100 font-medium flex items-center gap-1">
                              <span>ID:</span>
                              <code className="bg-violet-100 px-1 py-0.5 rounded text-[10px] font-mono select-all">
                                {user.mobile_device_id}
                              </code>
                            </span>
                            <button
                              onClick={() => resetDeviceLock(user.user_id, user.name)}
                              disabled={actionLoading === `reset-${user.user_id}`}
                              className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px] font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
                              title="Reset — allows user to log in from a different mobile device"
                            >
                              {actionLoading === `reset-${user.user_id}` ? (
                                <RefreshCw size={11} className="animate-spin" />
                              ) : (
                                "Reset"
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded border border-gray-200">
                            No Device Lock
                          </span>
                        )}
                      </td>

                      {/* Column 3: Active Sessions count */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="text-xs font-semibold bg-gray-50 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                          {activeSessions.length} active
                        </span>
                      </td>

                      {/* Column 4: Actions menu */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setActiveDropdownUserId(
                                activeDropdownUserId === user.user_id ? null : user.user_id
                              )
                            }
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-all border border-gray-200"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {activeDropdownUserId === user.user_id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveDropdownUserId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 text-xs font-semibold text-gray-700 text-left">
                                <button
                                  onClick={() => {
                                    setActiveDropdownUserId(null);
                                    setSelectedUserForModal(user);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                >
                                  <Smartphone size={14} className="text-gray-400" />
                                  Manage Devices ({user.devices.length})
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && grouped.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{pageStart + 1}</span> to <span className="font-medium">{Math.min(pageStart + pageSize, totalEntries)}</span> of <span className="font-medium">{totalEntries}</span> employees
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

      {/* Device Management Modal Overlay */}
      {selectedUserForModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Active Device Sessions</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedUserForModal.name} • {selectedUserForModal.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForModal(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100">
              {selectedUserForModal.devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Smartphone size={32} className="text-gray-300 mb-2" />
                  <p className="text-xs font-medium">No active device sessions found</p>
                </div>
              ) : (
                selectedUserForModal.devices.map((device) => {
                  const isMobile = device.device_type === "mobile";
                  return (
                    <div key={device.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isMobile ? "bg-violet-100" : "bg-blue-100"
                            }`}
                        >
                          {isMobile ? (
                            <Smartphone size={18} className="text-violet-600" />
                          ) : (
                            <Monitor size={18} className="text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                            <span>
                              {device.device_name || (isMobile ? "Mobile Device" : "Web Browser")}
                            </span>
                            {isMobile && device.device_id === selectedUserForModal.mobile_device_id && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-200">
                                Primary
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
                            {device.ip_address && (
                              <span className="flex items-center gap-1">
                                <Wifi size={10} />
                                {device.ip_address}
                              </span>
                            )}
                            <span className="flex items-center gap-1" title={`Relative: ${relativeTime(device.last_seen)}`}>
                              <Clock size={10} />
                              {formatIST(device.last_seen)}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${device.is_active === 1 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                                }`}
                            >
                              {device.is_active === 1 ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {device.is_active === 1 && (
                        <button
                          onClick={async () => {
                            await forceLogout(device.id);
                            // Set is_active to 0 locally in modal list
                            setSelectedUserForModal((prev) => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                devices: prev.devices.map((d) =>
                                  d.id === device.id ? { ...d, is_active: 0 } : d
                                ),
                              };
                            });
                          }}
                          disabled={actionLoading === `logout-${device.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `logout-${device.id}` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <LogOut size={12} />
                          )}
                          Logout
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedUserForModal(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold shadow-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
