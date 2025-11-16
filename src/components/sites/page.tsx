"use client";

import React from "react";
import { Eye, Pencil, Power, Users, Search, X, ChevronLeft, ChevronRight, Plus, MoreVertical, RefreshCw, Filter, Download, Building2, MapPin, Globe } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

type Site = {
  id: number;
  name: string;
  code: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: "active" | "inactive" | string;
  is_head_office?: boolean;
};

export default function OrgAdminSitesPage() {
  const [sites, setSites] = React.useState<Site[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  
  // Filters
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [hqOnly, setHqOnly] = React.useState<boolean>(false);
  const [cityFilter, setCityFilter] = React.useState<string>("");
  const [stateFilter, setStateFilter] = React.useState<string>("");
  const [countryFilter, setCountryFilter] = React.useState<string>("");
  
  // Pagination
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = React.useState<boolean>(false);
  const [showViewModal, setShowViewModal] = React.useState<boolean>(false);
  const [showEditModal, setShowEditModal] = React.useState<boolean>(false);
  const [showInchargesModal, setShowInchargesModal] = React.useState<boolean>(false);
  
  // Form and state
  const [saving, setSaving] = React.useState<boolean>(false);
  const [pinLoading, setPinLoading] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<Site>>({
    name: "",
    code: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    country: "",
    is_head_office: false,
  });

  const [selectedSite, setSelectedSite] = React.useState<Site | null>(null);
  const [selectedSiteForIncharges, setSelectedSiteForIncharges] = React.useState<Site | null>(null);
  const [incharges, setIncharges] = React.useState<Array<{ employee_id: number; first_name: string; last_name: string; email?: string; phone_number?: string }>>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [employeeQuery, setEmployeeQuery] = React.useState<string>("");
  const [inchargeSaving, setInchargeSaving] = React.useState<boolean>(false);

  // Permissions
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  const onChange = (key: keyof Site, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fetchPincodeDetails = async (pin: string) => {
    if (!pin || pin.length !== 6) return;
    setPinLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const status = data?.[0]?.Status;
      if (status === "Success") {
        const po = data?.[0]?.PostOffice?.[0];
        const city = po?.District || "";
        const state = po?.State || "";
        setForm((prev) => ({
          ...prev,
          city: city || (prev.city as string),
          state: state || (prev.state as string),
          country: (prev.country as string) || "India",
        }));
      }
    } catch (_) {
      // ignore errors silently
    } finally {
      setPinLoading(false);
    }
  };

  const fetchSites = async () => {
    if (role === "Employee" && !hasPerm("SITE_VIEW")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (hqOnly) params.hq = "true";
      if (cityFilter.trim()) params.city = cityFilter.trim();
      if (stateFilter.trim()) params.state = stateFilter.trim();
      if (countryFilter.trim()) params.country = countryFilter.trim();
      params.page = String(currentPage);
      params.pageSize = String(pageSize);
      
      const data = await apiClient<{ sites: any[]; page: number; pageSize: number; total: number; pages: number }>("/sites", { method: "GET", params });
      const normalized: Site[] = (data.sites || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        address: s.address_line ?? s.address,
        pincode: s.pincode,
        city: s.city,
        state: s.state,
        country: s.country,
        status: s.status ?? "active",
        is_head_office: s.is_head_office,
      }));
      setSites(normalized);
      setTotalItems(Number(data.total || 0));
      setTotalPages(Number(data.pages || 1));
    } catch (e: any) {
      setError(e?.message || "Failed to load sites");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{
          authenticated: boolean;
          role: string;
          employee?: { permissions?: string[] } | null;
        }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole(session.role || null);
          setPermissions(session.employee?.permissions || []);
        }
      } catch (_) {}
    })();
  }, []);

  React.useEffect(() => {
    fetchSites();
  }, [role, permissions]);

  // Re-fetch for pagination changes
  React.useEffect(() => {
    if (!role || (role === "Employee" && !hasPerm("SITE_VIEW"))) return;
    fetchSites();
  }, [currentPage, pageSize]);

  // Debounced search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!role || (role === "Employee" && !hasPerm("SITE_VIEW"))) return;
      setCurrentPage(1);
      fetchSites();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const applyFilters = () => {
    setCurrentPage(1);
    fetchSites();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setHqOnly(false);
    setCityFilter("");
    setStateFilter("");
    setCountryFilter("");
    setCurrentPage(1);
    fetchSites();
  };

  const isValid = () => {
    return Boolean((form.name || "").trim()) && Boolean((form.code || "").trim());
  };

  const addSite = async () => {
    if (!isValid()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: (form.name || "").trim(),
        code: (form.code || "").trim(),
        address: (form.address || "").trim() || null,
        pincode: (form.pincode || "").trim() || null,
        city: (form.city || "").trim() || null,
        state: (form.state || "").trim() || null,
        country: (form.country || "").trim() || null,
        is_head_office: Boolean(form.is_head_office),
      };
      const data = await apiClient<{ site: any }>("/sites", { method: "POST", body: payload });
      setShowCreateModal(false);
      setForm({
        name: "",
        code: "",
        address: "",
        pincode: "",
        city: "",
        state: "",
        country: "",
        is_head_office: false,
      });
      fetchSites(); // Refresh the list
    } catch (e: any) {
      setError(e?.message || "Failed to add site");
    } finally {
      setSaving(false);
    }
  };

  const openView = (site: Site) => {
    setSelectedSite(site);
    setShowViewModal(true);
  };

  const openEdit = (site: Site) => {
    setSelectedSite(site);
    setForm({
      name: site.name,
      code: site.code,
      address: site.address || "",
      pincode: site.pincode || "",
      city: site.city || "",
      state: site.state || "",
      country: site.country || "",
      is_head_office: Boolean(site.is_head_office),
    });
    setShowEditModal(true);
  };

  const toggleStatus = async (site: Site) => {
    const next = site.status === "inactive" ? "active" : "inactive";
    try {
      setActionLoading(`status-${site.id}`);
      const data = await apiClient<{ site: any }>(`/sites/${site.id}/status`, { method: "PATCH", body: { status: next } });
      const updated: Site = {
        id: data.site.id,
        name: data.site.name,
        code: data.site.code,
        address: data.site.address_line ?? data.site.address,
        pincode: data.site.pincode,
        city: data.site.city,
        state: data.site.state,
        country: data.site.country,
        status: data.site.status ?? next,
        is_head_office: data.site.is_head_office,
      };
      setSites((prev) => prev.map((s) => (s.id === site.id ? updated : s)));
      if (selectedSite?.id === site.id) setSelectedSite(updated);
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const saveEdit = async () => {
    if (!selectedSite) return;
    if (!isValid()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: (form.name || "").trim(),
        code: (form.code || "").trim(),
        address: (form.address || "").trim() || null,
        pincode: (form.pincode || "").trim() || null,
        city: (form.city || "").trim() || null,
        state: (form.state || "").trim() || null,
        country: (form.country || "").trim() || null,
        is_head_office: Boolean(form.is_head_office),
      };
      const data = await apiClient<{ site: any }>(`/sites/${selectedSite.id}`, { method: "PUT", body: payload });
      const updated: Site = {
        id: data.site.id,
        name: data.site.name,
        code: data.site.code,
        address: data.site.address_line ?? data.site.address,
        pincode: data.site.pincode,
        city: data.site.city,
        state: data.site.state,
        country: data.site.country,
        status: data.site.status ?? selectedSite.status,
        is_head_office: data.site.is_head_office,
      };
      setSites((prev) => prev.map((s) => (s.id === selectedSite.id ? updated : s)));
      setShowEditModal(false);
      setSelectedSite(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update site");
    } finally {
      setSaving(false);
    }
  };

  const fetchSiteIncharges = async (siteId: number) => {
    try {
      const data = await apiClient<{ incharges: any[] }>(`/sites/${siteId}/incharges`, { method: "GET" });
      setIncharges(Array.isArray(data?.incharges) ? data.incharges : []);
    } catch (e: any) {
      setIncharges([]);
    }
  };

  const openIncharges = async (site: Site) => {
    setSelectedSiteForIncharges(site);
    setShowInchargesModal(true);
    await fetchSiteIncharges(site.id);
    if (!employees.length) {
      try {
        const emps = await apiClient<any[]>("/organization/employees", { method: "GET" });
        setEmployees(Array.isArray(emps) ? emps : []);
      } catch {}
    }
  };

  const assignIncharge = async (employeeId: number) => {
    if (!selectedSiteForIncharges) return;
    setInchargeSaving(true);
    try {
      await apiClient(`/sites/${selectedSiteForIncharges.id}/incharges`, { method: "POST", body: { employee_id: employeeId } });
      await fetchSiteIncharges(selectedSiteForIncharges.id);
    } catch (e: any) {
      // swallow error
    } finally {
      setInchargeSaving(false);
    }
  };

  const removeIncharge = async (employeeId: number) => {
    if (!selectedSiteForIncharges) return;
    try {
      await apiClient(`/sites/${selectedSiteForIncharges.id}/incharges/${employeeId}`, { method: "DELETE" });
      await fetchSiteIncharges(selectedSiteForIncharges.id);
    } catch {}
  };

  // Status colors and icons
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'inactive': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getHQColor = (isHQ: boolean) => {
    return isHQ ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-50';
  };

  // Action Dropdown Component
  const ActionDropdown = ({ site }: { site: Site }) => {
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
        // Decide dropdown placement based on viewport space below the trigger
        const rect = triggerRef.current?.getBoundingClientRect();
        const spaceBelow = typeof window !== 'undefined' ? (window.innerHeight - (rect?.bottom || 0)) : 0;
        const approxMenuHeight = 200; // approximate height of the menu
        setPlaceUp(spaceBelow < approxMenuHeight + 16);
      }
    }, [isOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen((o) => !o)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={actionLoading === `status-${site.id}`}
        >
          {actionLoading === `status-${site.id}` ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <MoreVertical className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
            <div className={`absolute right-0 ${placeUp ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'} w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[60]`}
            >
              <div className="py-1">
                {(role !== "Employee" || hasPerm("SITE_VIEW")) && (
                  <button
                    onClick={() => { openView(site); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}
                
                {(role !== "Employee" || hasPerm("SITE_EDIT")) && (
                  <button
                    onClick={() => { openEdit(site); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Site</span>
                  </button>
                )}
                
                <button
                  onClick={() => { openIncharges(site); setIsOpen(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Incharges</span>
                </button>
                
                <div className="border-t border-gray-100 my-1" />
                
                {(role !== "Employee" || hasPerm("SITE_DELETE")) && (
                  <button
                    onClick={() => {
                      toggleStatus(site);
                      setIsOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${
                      site.status === "inactive" ? "text-green-700 hover:bg-green-50" : "text-red-700 hover:bg-red-50"
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{site.status === "inactive" ? "Activate" : "Deactivate"}</span>
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
  if (loading && sites.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
            <p className="text-gray-600 mt-1">Manage and monitor all organization sites</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden">
          <div className="bg-gray-50">
            <div className="grid grid-cols-6 gap-4 px-6 py-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 px-6 py-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-28"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (role === "Employee" && !hasPerm("SITE_VIEW")) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
            <p className="text-gray-600 mt-1">Manage and monitor all organization sites</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view sites.</p>
        </div>
      </div>
    );
  }

  // View Site Modal
  const ViewSiteModal = () => {
    if (!showViewModal || !selectedSite) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white/95 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Site Details</h3>
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
                  <h4 className="text-sm font-medium text-gray-500">Site Name</h4>
                  <p className="text-lg font-medium mt-1">{selectedSite.name}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Site Code</h4>
                  <p className="text-lg font-medium mt-1">{selectedSite.code}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Address</h4>
                <p className="mt-1 text-gray-900">{selectedSite.address || '-'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">City</h4>
                  <p className="mt-1">{selectedSite.city || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">State</h4>
                  <p className="mt-1">{selectedSite.state || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Country</h4>
                  <p className="mt-1">{selectedSite.country || '-'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Pincode</h4>
                  <p className="mt-1">{selectedSite.pincode || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Head Office</h4>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getHQColor(Boolean(selectedSite.is_head_office))}`}>
                      {selectedSite.is_head_office ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <div className="mt-1 flex items-center space-x-2">
                  {getStatusIcon(selectedSite.status || 'active')}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSite.status || 'active')} capitalize`}>
                    {selectedSite.status || 'active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowViewModal(false);
                openEdit(selectedSite);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Site
            </button>
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

  // Edit Site Modal
  const EditSiteModal = () => {
    if (!showEditModal || !selectedSite) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white/95 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Edit Site</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.name as string}
                  onChange={(e) => onChange("name", e.target.value)}
                  placeholder="e.g., Head Office"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.code as string}
                  onChange={(e) => onChange("code", e.target.value)}
                  placeholder="e.g., HO-MUM"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.address as string}
                  onChange={(e) => onChange("address", e.target.value)}
                  placeholder="Street, locality, landmark"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.pincode as string}
                  onChange={(e) => {
                    onChange("pincode", e.target.value);
                    if (e.target.value.length === 6) fetchPincodeDetails(e.target.value);
                  }}
                  placeholder="e.g., 400001"
                />
                {pinLoading && <p className="mt-1 text-xs text-gray-600">Fetching pincode details...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.city as string}
                  onChange={(e) => onChange("city", e.target.value)}
                  placeholder="e.g., Mumbai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.state as string}
                  onChange={(e) => onChange("state", e.target.value)}
                  placeholder="e.g., Maharashtra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.country as string}
                  onChange={(e) => onChange("country", e.target.value)}
                  placeholder="e.g., India"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is_head_office"
                  type="checkbox"
                  checked={Boolean(form.is_head_office)}
                  onChange={(e) => onChange("is_head_office", e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_head_office" className="text-sm font-medium text-gray-700">
                  Head Office (HQ)
                </label>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={!isValid() || saving}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isValid() && !saving
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

  // Create Site Modal
  const CreateSiteModal = () => {
    if (!showCreateModal) return null;
    
    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white/95 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Add New Site</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.name as string}
                  onChange={(e) => onChange("name", e.target.value)}
                  placeholder="e.g., Head Office"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.code as string}
                  onChange={(e) => onChange("code", e.target.value)}
                  placeholder="e.g., HO-MUM"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.address as string}
                  onChange={(e) => onChange("address", e.target.value)}
                  placeholder="Street, locality, landmark"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.pincode as string}
                  onChange={(e) => {
                    onChange("pincode", e.target.value);
                    if (e.target.value.length === 6) fetchPincodeDetails(e.target.value);
                  }}
                  placeholder="e.g., 400001"
                />
                {pinLoading && <p className="mt-1 text-xs text-gray-600">Fetching pincode details...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.city as string}
                  onChange={(e) => onChange("city", e.target.value)}
                  placeholder="e.g., Mumbai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.state as string}
                  onChange={(e) => onChange("state", e.target.value)}
                  placeholder="e.g., Maharashtra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.country as string}
                  onChange={(e) => onChange("country", e.target.value)}
                  placeholder="e.g., India"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="create_is_head_office"
                  type="checkbox"
                  checked={Boolean(form.is_head_office)}
                  onChange={(e) => onChange("is_head_office", e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="create_is_head_office" className="text-sm font-medium text-gray-700">
                  Head Office (HQ)
                </label>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addSite}
              disabled={!isValid() || saving}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isValid() && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Add Site'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Incharges Modal
  const InchargesModal = () => {
    if (!showInchargesModal || !selectedSiteForIncharges) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Manage Incharges — {selectedSiteForIncharges.name}
              </h3>
              <button
                onClick={() => {
                  setShowInchargesModal(false);
                  setSelectedSiteForIncharges(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-semibold mb-4">Current Incharges</h4>
                <div className="border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                  {incharges.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No incharges assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {incharges.map((ic) => (
                        <div key={ic.employee_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">
                              {ic.first_name} {ic.last_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {ic.email || ''}
                              {ic.phone_number ? ` · ${ic.phone_number}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => removeIncharge(ic.employee_id)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-semibold mb-4">Assign New Incharge</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Search employees by name, email or phone"
                    value={employeeQuery}
                    onChange={(e) => setEmployeeQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <div className="border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                    {employees
                      .filter((e) => {
                        const q = employeeQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(q) ||
                          (e.email || '').toLowerCase().includes(q) ||
                          (e.phone || '').toLowerCase().includes(q)
                        );
                      })
                      .map((e) => (
                        <div key={e.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">
                              {e.first_name} {e.last_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {e.email || ''}
                              {e.phone ? ` · ${e.phone}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => assignIncharge(e.id)}
                            disabled={inchargeSaving}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {inchargeSaving ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => {
                setShowInchargesModal(false);
                setSelectedSiteForIncharges(null);
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Render Modals */}
      <ViewSiteModal />
      <EditSiteModal />
      <CreateSiteModal />
      <InchargesModal />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all organization sites</p>
        </div>
        {(role !== "Employee" || hasPerm("SITE_ADD")) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Site</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <input
            type="text"
            placeholder="City"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <input
            type="text"
            placeholder="State"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="text"
            placeholder="Country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              id="hq-only"
              type="checkbox"
              checked={hqOnly}
              onChange={(e) => setHqOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="hq-only" className="text-sm text-gray-700">
              Head Office only
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Sites Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Office</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{site.name}</div>
                      {site.address && (
                        <div className="text-sm text-gray-500 line-clamp-1">{site.address}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {site.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {site.city || 'N/A'}, {site.state || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">{site.country || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(site.status || 'active')}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(site.status || 'active')} capitalize`}>
                        {site.status || 'active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getHQColor(Boolean(site.is_head_office))}`}>
                      {site.is_head_office ? 'HQ' : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ActionDropdown site={site} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sites.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sites found</h3>
            <p className="text-gray-500 mb-4">No sites match your current filters.</p>
            {(role !== "Employee" || hasPerm("SITE_ADD")) && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto">
                <Plus className="w-4 h-4" />
                <span>Add First Site</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="font-medium">{totalItems}</span> sites
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
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
                        className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                          currentPage === 1
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                      );
                    }
                  }
                  
                  for (let page = startPage; page <= endPage; page++) {
                    pages.push(
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                          currentPage === page
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
                        <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                          currentPage === totalPages
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
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}