"use client";

import React from "react";
import {
    Eye, Pencil, Power, Users, Search, X, ChevronLeft, ChevronRight, Plus, MoreVertical, RefreshCw, Filter, Download, Building2, MapPin, Globe, ChevronDown, ChevronUp, CheckCircle,
    User,
    Briefcase
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

import { useAuth } from "@/context/AuthContext";
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
    latitude?: string | number | null;
    longitude?: string | number | null;
    has_expiry: boolean;
    expiry_date?: string | null;
    has_budget: boolean;
    budget_amount?: string | number | null;
    budget_used?: number;
    final_budget_allocated?: string | number | null;
    actual_budget_approved?: string | number | null;
    remaining_final_budget_allocated?: string | number | null;
};

type BudgetUsageData = {
    site: Site;
    active: {
        id: number;
        employee_id: number;
        first_name: string;
        last_name: string;
        designation: string;
        emp_code: number;
        amount: string;
        created_at: string;
    }[];
    history: {
        id: number;
        employee_id: number;
        first_name: string;
        last_name: string;
        designation: string;
        emp_code: number;
        amount: string;
        status: 'active' | 'released';
        created_at: string;
        released_at: string;
    }[];
    stats: {
        budget: number;
        used: number;
        remaining: number;
        final_allocated?: number;
        actual_approved?: number;
        remaining_final?: number;
    };
    ledger?: {
        month_year: string;
        final_budget_allocated: number;
        actual_budget_approved: number;
        total_budget: number;
        used_budget: number;
        remaining_budget: number;
        remaining_final_budget_allocated: number;
        snapshot_at: string;
    }[];
    pagination?: {
        active: { total: number; page: number; pageSize: number; pages: number };
        history: { total: number; page: number; pageSize: number; pages: number };
        ledger: { total: number; page: number; pageSize: number; pages: number };
    };
};

// Memoized form component to prevent re-renders and focus loss
const SiteFormFields = React.memo(({
    form,
    onChange,
    pinLoading,
    fetchPincodeDetails,
    originalFlags,
    idPrefix = "site",
    role
}: {
    form: Partial<Site>;
    onChange: (field: keyof Site, value: any) => void;
    pinLoading: boolean;
    fetchPincodeDetails: (pincode: string) => void;
    originalFlags?: { had_expiry_ever: boolean; had_budget_ever: boolean; original_budget_amount: string | number | null; original_budget_used: string | number | null; original_final_budget_allocated: string | number | null; original_actual_budget_approved: string | number | null };
    idPrefix?: string;
    role?: string | null;
}) => {
    return (
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

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                    <input
                        type="number"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.latitude as string || ""}
                        onChange={(e) => onChange("latitude", e.target.value)}
                        placeholder="e.g., 19.0760"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                    <input
                        type="number"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.longitude as string || ""}
                        onChange={(e) => onChange("longitude", e.target.value)}
                        placeholder="e.g., 72.8777"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    id={`${idPrefix}_is_head_office`}
                    type="checkbox"
                    checked={Boolean(form.is_head_office)}
                    onChange={(e) => onChange("is_head_office", e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`${idPrefix}_is_head_office`} className="text-sm font-medium text-gray-700">
                    Head Office (HQ)
                </label>
            </div>

            {/* Expiry Date Section */}
            <div className="md:col-span-2 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                    <input
                        id={`${idPrefix}_has_expiry`}
                        type="checkbox"
                        checked={Boolean(form.has_expiry)}
                        onChange={(e) => onChange("has_expiry", e.target.checked)}
                        disabled={originalFlags?.had_expiry_ever}
                        className={`rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 ${originalFlags?.had_expiry_ever ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <label htmlFor={`${idPrefix}_has_expiry`} className={`text-sm font-medium ${originalFlags?.had_expiry_ever ? 'text-gray-500' : 'text-gray-700'}`}>
                        Has Expiry Date
                        {originalFlags?.had_expiry_ever && <span className="ml-2 text-xs text-gray-500">(Locked)</span>}
                    </label>
                </div>

                {form.has_expiry && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                        <input
                            type="date"
                            value={form.expiry_date as string}
                            onChange={(e) => onChange("expiry_date", e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">Only future dates are allowed</p>
                    </div>
                )}
            </div>

            {/* Budget Section */}
            <div className="md:col-span-2 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                    <input
                        id={`${idPrefix}_has_budget`}
                        type="checkbox"
                        checked={Boolean(form.has_budget)}
                        onChange={(e) => onChange("has_budget", e.target.checked)}
                        disabled={originalFlags?.had_budget_ever}
                        className={`rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 ${originalFlags?.had_budget_ever ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <label htmlFor={`${idPrefix}_has_budget`} className={`text-sm font-medium ${originalFlags?.had_budget_ever ? 'text-gray-500' : 'text-gray-700'}`}>
                        Has Budget
                        {originalFlags?.had_budget_ever && <span className="ml-2 text-xs text-gray-500">(Locked)</span>}
                    </label>
                </div>

                {form.has_budget && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget Amount <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={form.budget_amount || ''}
                                    onChange={(e) => onChange("budget_amount", e.target.value)}
                                    disabled={originalFlags?.had_budget_ever}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${originalFlags?.had_budget_ever ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                                    placeholder="Enter total budget allocated"
                                />
                            </div>

                            {/* Comparison Fields - Locked once set, except for orgadmin */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Final Budget Allocated {originalFlags?.had_budget_ever && originalFlags?.original_final_budget_allocated && <span className="text-xs text-gray-500">(Locked)</span>}</label>
                                    <input
                                        type="number"
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border ${originalFlags?.had_budget_ever && originalFlags?.original_final_budget_allocated ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                                        value={form.final_budget_allocated || ''}
                                        onChange={(e) => onChange('final_budget_allocated', e.target.value)}
                                        disabled={!!(originalFlags?.had_budget_ever && originalFlags?.original_final_budget_allocated && role !== 'OrgAdmin')}
                                        placeholder="0.00"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Opening balance - locked once set</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Actual Budget Approved {originalFlags?.had_budget_ever && originalFlags?.original_actual_budget_approved && <span className="text-xs text-gray-500">(Locked)</span>}</label>
                                    <input
                                        type="number"
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border ${originalFlags?.had_budget_ever && originalFlags?.original_actual_budget_approved ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                                        value={form.actual_budget_approved || ''}
                                        onChange={(e) => onChange('actual_budget_approved', e.target.value)}
                                        disabled={!!(originalFlags?.had_budget_ever && originalFlags?.original_actual_budget_approved && role !== 'OrgAdmin')}
                                        placeholder="0.00"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Approved amount - locked once set</p>
                                </div>
                            </div>

                            {/* Display Remaining Final Budget (read-only, only in edit mode with existing value) */}
                            {form.remaining_final_budget_allocated !== undefined && form.remaining_final_budget_allocated !== null && form.remaining_final_budget_allocated !== '' && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-blue-900">Remaining Final Budget (Wallet)</span>
                                        <span className="text-lg font-bold text-blue-700">₹{Number(form.remaining_final_budget_allocated || 0).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">Auto-calculated: Final Allocated - Budget Used. Updated on monthly snapshots.</p>
                                </div>
                            )}
                        </div>
                        {/* Display stats if editing existing site with budget AND has usage */}
                        {Boolean(originalFlags?.had_budget_ever) && Number(form.budget_used) > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Used Budget:</span>
                                    <span className="font-medium text-gray-900">₹{Number(form.budget_used || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Remaining:</span>
                                    <span className={`font-medium ${(Number(form.budget_amount) - Number(form.budget_used || 0)) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{(Number(form.budget_amount) - Number(form.budget_used || 0)).toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div
                                        className={`h-1.5 rounded-full ${Number(form.budget_used) > Number(form.budget_amount) ? 'bg-red-500' : 'bg-blue-600'}`}
                                        style={{ width: `${Math.min(100, (Number(form.budget_used || 0) / Number(form.budget_amount || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    Budget amount cannot be changed once active.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
});

SiteFormFields.displayName = 'SiteFormFields';

export default function OrgAdminSitesPage() {
    const { role, permissions, user, organization, employee } = useAuth();
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
    const [filtersExpanded, setFiltersExpanded] = React.useState<boolean>(false);

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
        latitude: "",
        longitude: "",
        has_expiry: false,
        expiry_date: "",
        has_budget: false,
        budget_amount: "",
        budget_used: 0,
        final_budget_allocated: "",
        actual_budget_approved: ""
    });

    const [selectedSite, setSelectedSite] = React.useState<Site | null>(null);
    const [selectedSiteForIncharges, setSelectedSiteForIncharges] = React.useState<Site | null>(null);
    const [incharges, setIncharges] = React.useState<Array<{ employee_id: number; first_name: string; last_name: string; email?: string; phone_number?: string }>>([]);
    const [employees, setEmployees] = React.useState<any[]>([]);
    const [employeeQuery, setEmployeeQuery] = React.useState<string>("");
    const [inchargeSaving, setInchargeSaving] = React.useState<boolean>(false);

    // Budget Usage Modal
    const [showBudgetModal, setShowBudgetModal] = React.useState(false);
    const [budgetData, setBudgetData] = React.useState<BudgetUsageData | null>(null);
    const [budgetLoading, setBudgetLoading] = React.useState(false);
    const [budgetTab, setBudgetTab] = React.useState<'active' | 'history' | 'ledger'>('active');

    // Pagination state for each tab
    const [activePage, setActivePage] = React.useState(1);
    const [activePageSize] = React.useState(10);
    const [historyPage, setHistoryPage] = React.useState(1);
    const [historyPageSize] = React.useState(10);
    const [ledgerPage, setLedgerPage] = React.useState(1);
    const [ledgerPageSize] = React.useState(10);

    // Track original flags to prevent disabling once enabled
    const [originalSiteFlags, setOriginalSiteFlags] = React.useState<{
        had_expiry_ever: boolean;
        had_budget_ever: boolean;
        original_budget_amount: string | number | null;
        original_budget_used: string | number | null;
        original_final_budget_allocated: string | number | null;
        original_actual_budget_approved: string | number | null;
    }>({
        had_expiry_ever: false,
        had_budget_ever: false,
        original_budget_amount: null,
        original_budget_used: null,
        original_final_budget_allocated: null,
        original_actual_budget_approved: null,
    });

    // Permissions
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

    const onChange = React.useCallback((key: keyof Site, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    // // const {role, permissions, organization} = useAuth();



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
                    city: city || prev.city,
                    state: state || prev.state,
                    country: prev.country || "India",
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
                latitude: s.latitude,
                longitude: s.longitude,
                has_expiry: s.has_expiry,
                expiry_date: s.expiry_date ? s.expiry_date.toString().substring(0, 10) : "",
                has_budget: s.has_budget,
                budget_amount: s.budget_amount || "",
                budget_used: s.budget_used || 0,
                final_budget_allocated: s.final_budget_allocated || "",
                actual_budget_approved: s.actual_budget_approved || "",
                remaining_final_budget_allocated: s.remaining_final_budget_allocated || "",
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
                // Session fetch removed (using useAuth)
                const session = { authenticated: true, role: role, employee: { permissions } };
                if (session?.authenticated) {
                    // setRole(session.role || null);
                    // setPermissions(session.employee?.permissions || []);
                }
            } catch (_) { }
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
                latitude: form.latitude || null,
                longitude: form.longitude || null,
                has_expiry: Boolean(form.has_expiry),
                expiry_date: form.has_expiry ? (form.expiry_date || null) : null,
                has_budget: Boolean(form.has_budget),
                budget_amount: form.has_budget && form.budget_amount ? Number(form.budget_amount) : null,
                final_budget_allocated: form.has_budget && form.final_budget_allocated ? Number(form.final_budget_allocated) : null,
                actual_budget_approved: form.has_budget && form.actual_budget_approved ? Number(form.actual_budget_approved) : null,
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
                latitude: "",
                longitude: "",
                has_expiry: false,
                expiry_date: "",
                has_budget: false,
                budget_amount: "",
                budget_used: 0,
                final_budget_allocated: "",
                actual_budget_approved: ""
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

    const openCreate = () => {
        // Reset form to empty state
        setForm({
            name: "",
            code: "",
            address: "",
            pincode: "",
            city: "",
            state: "",
            country: "",
            is_head_office: false,
            latitude: "",
            longitude: "",
            has_expiry: false,
            expiry_date: "",
            has_budget: false,
            budget_amount: "",
            budget_used: 0,
            final_budget_allocated: "",
            actual_budget_approved: ""
        });
        setSelectedSite(null);
        setOriginalSiteFlags({
            had_expiry_ever: false,
            had_budget_ever: false,
            original_budget_amount: null,
            original_budget_used: null,
            original_final_budget_allocated: null,
            original_actual_budget_approved: null,
        });
        setShowCreateModal(true);
    };

    const closeEdit = () => {
        if (typeof window !== 'undefined') localStorage.removeItem('lastEditedSiteId');
        setShowEditModal(false);
    };

    const openEdit = (site: Site) => {
        if (typeof window !== 'undefined') localStorage.setItem('lastEditedSiteId', String(site.id));
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
            latitude: site.latitude ? String(site.latitude) : "",
            longitude: site.longitude ? String(site.longitude) : "",
            has_expiry: Boolean(site.has_expiry),
            expiry_date: site.expiry_date ? String(site.expiry_date).split('T')[0] : "",
            has_budget: Boolean(site.has_budget),
            budget_amount: site.budget_amount ? String(site.budget_amount) : "",
            budget_used: site.budget_used || 0,
            final_budget_allocated: site.final_budget_allocated ? String(site.final_budget_allocated) : "",
            actual_budget_approved: site.actual_budget_approved ? String(site.actual_budget_approved) : "",
            remaining_final_budget_allocated: site.remaining_final_budget_allocated ? String(site.remaining_final_budget_allocated) : "",
        });
        // Track if these features were ever enabled (to lock them)
        setOriginalSiteFlags({
            had_expiry_ever: Boolean(site.has_expiry),
            had_budget_ever: Boolean(site.has_budget),
            original_budget_amount: site.budget_amount || null,
            original_budget_used: site.budget_used || null,
            original_final_budget_allocated: site.final_budget_allocated || null,
            original_actual_budget_approved: site.actual_budget_approved || null,
        });
        setShowEditModal(true);
    };

    // Restore functionality for edit site modal
    React.useEffect(() => {
        if (sites.length > 0 && typeof window !== 'undefined' && !showEditModal) {
            const cachedId = localStorage.getItem('lastEditedSiteId');
            if (cachedId) {
                const siteToRestore = sites.find(s => s.id === Number(cachedId));
                if (siteToRestore) {
                    openEdit(siteToRestore);
                }
            }
        }
    }, [sites]);

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
                latitude: data.site.latitude,
                longitude: data.site.longitude,
                has_expiry: data.site.has_expiry,
                expiry_date: data.site.expiry_date,
                has_budget: data.site.has_budget,
                budget_amount: data.site.budget_amount,
                budget_used: data.site.budget_used, // Added budget_used
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
                latitude: form.latitude || null,
                longitude: form.longitude || null,
                has_expiry: Boolean(form.has_expiry),
                expiry_date: form.has_expiry ? (form.expiry_date || null) : null,
                has_budget: Boolean(form.has_budget),
                budget_amount: form.has_budget && form.budget_amount ? Number(form.budget_amount) : null,
                final_budget_allocated: form.has_budget && form.final_budget_allocated ? Number(form.final_budget_allocated) : null,
                actual_budget_approved: form.has_budget && form.actual_budget_approved ? Number(form.actual_budget_approved) : null,
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
                latitude: data.site.latitude,
                longitude: data.site.longitude,
                has_expiry: data.site.has_expiry,
                expiry_date: data.site.expiry_date,
                has_budget: data.site.has_budget,
                budget_amount: data.site.budget_amount,
                budget_used: data.site.budget_used, // Added budget_used
            };
            setSites((prev) => prev.map((s) => (s.id === selectedSite.id ? updated : s)));
            closeEdit();
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
            } catch { }
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

    const openBudgetUsage = async (site: Site, resetPagination = false) => {
        if (resetPagination) {
            setActivePage(1);
            setHistoryPage(1);
            setLedgerPage(1);
        }
        setBudgetLoading(true);
        setShowBudgetModal(true);
        setSelectedSite(site);
        try {
            const params = new URLSearchParams({
                activePage: String(resetPagination ? 1 : activePage),
                activePageSize: String(activePageSize),
                historyPage: String(resetPagination ? 1 : historyPage),
                historyPageSize: String(historyPageSize),
                ledgerPage: String(resetPagination ? 1 : ledgerPage),
                ledgerPageSize: String(ledgerPageSize)
            });
            const data = await apiClient<BudgetUsageData>(`/sites/${site.id}/budget-usage?${params.toString()}`);
            setBudgetData(data);
        } catch (err: any) {
            console.error("Error fetching budget usage:", err);
            setBudgetData(null);
        } finally {
            setBudgetLoading(false);
        }
    };

    // Handler for pagination changes
    const handlePageChange = (tab: 'active' | 'history' | 'ledger', newPage: number) => {
        if (!selectedSite) return;

        if (tab === 'active') {
            setActivePage(newPage);
        } else if (tab === 'history') {
            setHistoryPage(newPage);
        } else if (tab === 'ledger') {
            setLedgerPage(newPage);
        }

        // Re-fetch with new page
        setTimeout(() => openBudgetUsage(selectedSite), 0);
    };

    const removeIncharge = async (employeeId: number) => {
        if (!selectedSiteForIncharges) return;
        try {
            await apiClient(`/sites/${selectedSiteForIncharges.id}/incharges/${employeeId}`, { method: "DELETE" });
            await fetchSiteIncharges(selectedSiteForIncharges.id);
        } catch { }
    };

    // Status colors and icons
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-700 bg-green-50 border border-green-200';
            case 'inactive': return 'text-red-700 bg-red-50 border border-red-200';
            default: return 'text-gray-700 bg-gray-50 border border-gray-200';
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
        return isHQ ? 'text-blue-700 bg-blue-50 border border-blue-200' : 'text-gray-700 bg-gray-50 border border-gray-200';
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
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                        <div className={`fixed ${placeUp ? 'bottom-auto' : 'top-auto'} w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[101]`}
                            style={{
                                left: triggerRef.current ? `${triggerRef.current.getBoundingClientRect().right - 192}px` : '0',
                                top: placeUp ? 'auto' : triggerRef.current ? `${triggerRef.current.getBoundingClientRect().bottom + 4}px` : '0',
                                bottom: placeUp && triggerRef.current ? `${window.innerHeight - triggerRef.current.getBoundingClientRect().top + 4}px` : 'auto'
                            }}
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
                                {!!site.has_budget && (
                                    <button
                                        onClick={() => { openBudgetUsage(site); setIsOpen(false); }}
                                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <Briefcase className="w-4 h-4" />
                                        <span>Budget Usage</span>
                                    </button>
                                )}

                                <div className="border-t border-gray-100 my-1" />

                                {(role !== "Employee" || hasPerm("SITE_DELETE")) && (
                                    <button
                                        onClick={() => {
                                            toggleStatus(site);
                                            setIsOpen(false);
                                        }}
                                        className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${site.status === "inactive" ? "text-green-700 hover:bg-green-50" : "text-red-700 hover:bg-red-50"
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
                <div className="bg-white rounded-xl  border border-gray-200 p-0 overflow-hidden">
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
                <div className="bg-white rounded-xl  border border-gray-200 p-8 text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
                    <p className="text-gray-500">You do not have permission to view sites.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Render Modals */}
            {/* View Site Modal */}
            {
                showViewModal && selectedSite && (
                    <div className="fixed inset-0  bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
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

                                    {(selectedSite.latitude || selectedSite.longitude) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Latitude</h4>
                                                <p className="mt-1">{selectedSite.latitude || '-'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Longitude</h4>
                                                <p className="mt-1">{selectedSite.longitude || '-'}</p>
                                            </div>
                                        </div>
                                    )}

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

                                    {/* Expiry Date - Only show if has_expiry is true */}
                                    {selectedSite.has_expiry && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500">Expiry Date</h4>
                                            <p className="mt-1 text-gray-900">
                                                {selectedSite.expiry_date ? new Date(selectedSite.expiry_date).toLocaleDateString('en-IN', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : '-'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Budget - Only show if has_budget is true */}
                                    {selectedSite.has_budget && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500">Budget Amount</h4>
                                            <p className="mt-1 text-gray-900 font-medium">
                                                {selectedSite.budget_amount ? `₹${Number(selectedSite.budget_amount).toLocaleString('en-IN', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}` : '-'}
                                            </p>
                                        </div>
                                    )}
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
                )
            }

            {/* Edit Site Modal */}
            {
                showEditModal && selectedSite && (
                    <div className="fixed inset-0  bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">Edit Site</h3>
                                    <button
                                        onClick={closeEdit}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                <SiteFormFields
                                    form={form}
                                    onChange={onChange}
                                    pinLoading={pinLoading}
                                    fetchPincodeDetails={fetchPincodeDetails}
                                    idPrefix="edit"
                                    originalFlags={originalSiteFlags}
                                />
                            </div>

                            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    onClick={closeEdit}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={!isValid() || saving}
                                    className={`px-4 py-2 rounded-lg transition-colors ${isValid() && !saving
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        }`}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Site Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0  bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
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
                                <SiteFormFields
                                    form={form}
                                    onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
                                    pinLoading={pinLoading}
                                    fetchPincodeDetails={fetchPincodeDetails}
                                    originalFlags={originalSiteFlags}
                                    idPrefix="create"
                                    role={role}
                                />
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
                                    className={`px-4 py-2 rounded-lg transition-colors ${isValid() && !saving
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        }`}
                                >
                                    {saving ? 'Saving...' : 'Add Site'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Incharges Modal */}
            {
                showInchargesModal && selectedSiteForIncharges && (
                    <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                )
            }

            {/* Header */}
            <div className="bg-white rounded-xl  border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Sites Management</h1>
                        <p className="text-sm text-gray-600 mt-0.5">{totalItems} sites found</p>
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
                        {(role !== "Employee" || hasPerm("SITE_ADD")) && (
                            <button
                                onClick={openCreate}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Site</span>
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
                                    placeholder="Search sites..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />

                            <input
                                type="text"
                                placeholder="Country"
                                value={countryFilter}
                                onChange={(e) => setCountryFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1">
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

                                <input
                                    type="text"
                                    placeholder="State"
                                    value={stateFilter}
                                    onChange={(e) => setStateFilter(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm w-40"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={applyFilters}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={clearFilters}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sites Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] relative">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HQ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sites.map((site) => (
                                <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div>
                                            <div className="font-medium text-gray-900 text-sm">{site.name}</div>
                                            {site.address && (
                                                <div className="text-xs text-gray-500 truncate max-w-xs">{site.address}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                                            {site.code}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">
                                            {site.city || 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-500">{site.country || 'N/A'}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center space-x-1.5">
                                            {getStatusIcon(site.status || 'active')}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(site.status || 'active')} capitalize`}>
                                                {site.status || 'active'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHQColor(Boolean(site.is_head_office))}`}>
                                            {site.is_head_office ? 'HQ' : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <ActionDropdown site={site} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {sites.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No sites found</h3>
                        <p className="text-xs text-gray-500 mb-3">No sites match your current filters.</p>
                        {(role !== "Employee" || hasPerm("SITE_ADD")) && (
                            <button
                                onClick={openCreate}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm mx-auto"
                            >
                                <Plus className="w-3 h-3" />
                                <span>Add First Site</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {
                totalItems > 0 && (
                    <div className="flex items-center justify-between bg-white rounded-xl  border border-gray-200 p-3">
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
                )
            }

            {/* Budget Usage Modal */}
            {showBudgetModal && selectedSite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Budget Usage: {selectedSite.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">Track effective budget consumption by active employees</p>
                            </div>
                            <button onClick={() => setShowBudgetModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {budgetLoading ? (
                            <div className="p-12 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : budgetData ? (
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <p className="text-sm font-medium text-blue-600 mb-1">Total Budget</p>
                                        <p className="text-2xl font-bold text-blue-900">₹{Number(budgetData.stats.budget).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                                        <p className="text-sm font-medium text-amber-600 mb-1">Used Budget</p>
                                        <p className="text-2xl font-bold text-amber-900">₹{Number(budgetData.stats.used).toLocaleString()}</p>
                                    </div>
                                    <div className={`p-4 rounded-lg border ${budgetData.stats.remaining < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                        <p className={`text-sm font-medium mb-1 ${budgetData.stats.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>Remaining</p>
                                        <p className="text-2xl font-bold mt-1 text-green-700">₹{budgetData.stats.remaining.toLocaleString()}</p>
                                        <p className="text-xs text-green-600 mt-1">Available for allocation</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        <p className="text-sm font-medium text-purple-600">Final Alloc. Budget</p>
                                        <p className="text-xl font-bold mt-1 text-purple-700">₹{(budgetData.stats.final_allocated || 0).toLocaleString()}</p>
                                        <p className="text-xs text-purple-600 mt-1">Project Total</p>
                                    </div>
                                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                                        <p className="text-sm font-medium text-teal-600">Actual Budget Approved</p>
                                        <p className="text-xl font-bold mt-1 text-teal-700">₹{(budgetData.stats.actual_approved || 0).toLocaleString()}</p>
                                        <p className="text-xs text-teal-600 mt-1">Officially approved</p>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <p className="text-sm font-medium text-indigo-600">Rem. Final Budget</p>
                                        <p className="text-xl font-bold mt-1 text-indigo-700">₹{(budgetData.stats.remaining_final || 0).toLocaleString()}</p>
                                        <p className="text-xs text-indigo-600 mt-1">After total usage</p>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-gray-200 mb-4">
                                    <button
                                        onClick={() => setBudgetTab('active')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${budgetTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Active Salaries
                                    </button>
                                    <button
                                        onClick={() => setBudgetTab('history')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${budgetTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Release History
                                    </button>
                                    <button
                                        onClick={() => setBudgetTab('ledger')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${budgetTab === 'ledger' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Monthly Ledger
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="overflow-hidden rounded-lg border border-gray-200">
                                    {budgetTab === 'ledger' ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3">Month</th>
                                                        <th className="px-4 py-3 text-right">Final Alloc.</th>
                                                        <th className="px-4 py-3 text-right">Approved</th>
                                                        <th className="px-4 py-3 text-right">Total Budget</th>
                                                        <th className="px-4 py-3 text-right">Used</th>
                                                        <th className="px-4 py-3 text-right">Remaining</th>
                                                        <th className="px-4 py-3">Snapshot Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(budgetData.ledger || []).map((row, i) => (
                                                        <tr key={i} className="border-b hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-medium">{row.month_year}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">₹{Number(row.final_budget_allocated).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">₹{Number(row.actual_budget_approved).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right text-gray-900 font-medium">₹{Number(row.total_budget).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right text-amber-600">₹{Number(row.used_budget).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right text-green-600">₹{Number(row.remaining_budget).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                                {new Date(row.snapshot_at).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!budgetData.ledger || budgetData.ledger.length === 0) && (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                                No ledger history found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            {/* Ledger Pagination */}
                                            {budgetData.pagination && budgetData.pagination.ledger.pages > 1 && (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                                    <div className="text-sm text-gray-700">
                                                        Page {budgetData.pagination.ledger.page} of {budgetData.pagination.ledger.pages} ({budgetData.pagination.ledger.total} records)
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handlePageChange('ledger', ledgerPage - 1)}
                                                            disabled={ledgerPage === 1 || budgetLoading}
                                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Previous
                                                        </button>
                                                        <button
                                                            onClick={() => handlePageChange('ledger', ledgerPage + 1)}
                                                            disabled={ledgerPage >= budgetData.pagination.ledger.pages || budgetLoading}
                                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">                                            <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Captured</th>
                                                    {budgetTab === 'history' && (
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    )}
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {(budgetTab === 'active' ? budgetData.active : budgetData.history).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={budgetTab === 'history' ? 5 : 4} className="px-6 py-8 text-center text-gray-500 text-sm">
                                                            No records found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    ((budgetTab === 'active' ? budgetData.active : budgetData.history) as any[]).map((record) => (
                                                        <tr key={record.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {record.first_name} {record.last_name}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">#{record.emp_code}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {record.designation || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                ₹{Number(record.amount).toLocaleString()}
                                                            </td>
                                                            {budgetTab === 'history' && (
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                        {record.status === 'active' ? 'Active' : 'Released'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {new Date(record.status === 'released' && record.released_at ? record.released_at : record.created_at).toLocaleDateString()}
                                                                <div className="text-xs text-gray-400">
                                                                    {new Date(record.status === 'released' && record.released_at ? record.released_at : record.created_at).toLocaleTimeString()}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                            {/* Active Pagination */}
                                            {budgetData.pagination && budgetTab === 'active' && budgetData.pagination.active.pages > 1 && (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                                    <div className="text-sm text-gray-700">
                                                        Page {activePage} of {budgetData.pagination.active.pages} ({budgetData.pagination.active.total} records)
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handlePageChange('active', activePage - 1)}
                                                            disabled={activePage === 1 || budgetLoading}
                                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Previous
                                                        </button>
                                                        <button
                                                            onClick={() => handlePageChange('active', activePage + 1)}
                                                            disabled={activePage >= budgetData.pagination.active.pages || budgetLoading}
                                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {budgetTab === 'history' && budgetData.pagination && budgetData.pagination.history.pages > 1 && (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                                    <div className="text-sm text-gray-700">
                                                        Page {budgetData.pagination.history.page} of {budgetData.pagination.history.pages} ({budgetData.pagination.history.total} records)
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handlePageChange('history', historyPage - 1)}
                                                            disabled={historyPage === 1 || budgetLoading}
                                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Previous
                                                        </button>
                                                        <button
                                                            onClick={() => handlePageChange('history', historyPage + 1)}
                                                            disabled={historyPage >= budgetData.pagination.history.pages || budgetLoading}
                                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-red-500">Failed to load budget data</div>
                        )
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'active': return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
        case 'inactive': return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
        default: return <div className="w-2 h-2 rounded-full bg-gray-500"></div>;
    }
};

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'inactive': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getHQColor = (isHQ: boolean) => {
    return isHQ ? 'bg-purple-100 text-purple-800' : 'text-gray-400';
};
