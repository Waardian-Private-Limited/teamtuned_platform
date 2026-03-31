"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Calendar, Clock, MapPin, RefreshCw, Search, Users, User, Phone, Briefcase, FileText, Download, X, AlertCircle } from 'lucide-react';
import { format } from "date-fns";

interface LaborerItem {
    id: number;
    name: string;
    phone_number: string | number;
    site_name: string;
    registered_image: string;
    start_punch_image?: string;
    status: string; // Present, etc. or null (Absent)
    first_in_time: string;
    last_out_time: string;
    total_active_minutes: number;
    session_count?: number;
    hourly_rate?: number;
    earned_amount?: number;
    breakdown?: {
        regular_day: { mins: number, cost: number };
        regular_night: { mins: number, cost: number };
        overtime_day: { mins: number, cost: number };
        overtime_night: { mins: number, cost: number };
        total_cost: number;
    }
    active_rate_info?: { type: 'Day' | 'Night' | 'Overtime'; value: number } | null;
    is_migrated?: number | boolean;
    registration_status?: string;
    primary_site_name?: string;
    punch_site_name?: string;
}

export default function LaborAttendanceList() {
    const [loadingList, setLoadingList] = useState(false);
    const [laborers, setLaborers] = useState<LaborerItem[]>([]);

    // Filters & Pagination
    const { role, permissions } = useAuth();
    const isEmployee = (role || "").toLowerCase() === "employee";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");
    const isLaborAdmin = (role || "").toLowerCase() === "labor admin" || hasPerm("LABOR_ADMIN");
    const isOrgAdmin = (role || "").toLowerCase() === "org admin" || (role || "").toLowerCase() === "orgadmin" || hasPerm("OrgAdmin");
    const canViewAll = canHRMode || hasPerm("MULTISITE_MANAGER") || isOrgAdmin || isLaborAdmin;

    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [hqMode, setHqMode] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
    const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);

    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalItems, setTotalItems] = useState(0);
    const [showFilters, setShowFilters] = useState(true);

    // Data
    const [inchargeSites, setInchargeSites] = useState<any[]>([]);
    const [allSites, setAllSites] = useState<any[]>([]);

    const [totalPages, setTotalPages] = useState(0);
    const [contractors, setContractors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [subcategories, setSubcategories] = useState<any[]>([]);

    // Modal
    const [viewSessionsLaborer, setViewSessionsLaborer] = useState<any | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showTerminated, setShowTerminated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch List
    const fetchList = useCallback(async () => {
        const effHq = hqMode && canHRMode;
        const effSite = selectedSiteId;

        // Block if not HQ Mode and No Site Selected (unless they can view all sites)
        if (!effHq && (!effSite || Number(effSite) <= 0) && !canViewAll) {
            setLaborers([]);
            setTotalItems(0);
            return;
        }

        setLoadingList(true);
        setError(null);
        try {
            const params: any = {
                date,
                page,
                limit,
                search: searchQuery,
                status: statusFilter === 'all' ? '' : statusFilter,
                site_id: selectedSiteId,
                contractor_id: selectedContractorId,
                category_id: selectedCategoryId,
                subcategory_id: selectedSubcategoryId,
                showTerminated: showTerminated ? 'true' : 'false',
            };

            const res = await apiClient<any>("/labor/attendance/daily-list", { params, withAuth: true });

            setLaborers(res.items || []);
            setTotalPages(res.pagination?.totalPages || 1);
            setTotalItems(res.pagination?.totalItems || res.items?.length || 0);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to fetch attendance logs. Please try again.");
            setLaborers([]);
            setTotalItems(0);
        } finally {
            setLoadingList(false);
        }
    }, [date, selectedSiteId, hqMode, canHRMode, statusFilter, searchQuery, page, limit, selectedContractorId, selectedCategoryId, selectedSubcategoryId, canViewAll, showTerminated]);

    // Reset filters when site changes
    useEffect(() => {
        setPage(1);
        setSelectedContractorId(null);
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
    }, [selectedSiteId]);

    // Initial Load - Sites
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
                const list = Array.isArray(res?.sites) ? res!.sites! : [];
                setInchargeSites(list);

                // Default selection logic:
                // If not Admin/HR/LaborAdmin, default to first incharge site
                if (!canViewAll && list.length > 0 && selectedSiteId == null) {
                    const sid = list[0]?.id;
                    setSelectedSiteId(typeof sid === "number" ? sid : parseInt(String(sid)) || null);
                }
            } catch (e) { }
        })();
    }, [canViewAll]);

    useEffect(() => {
        (async () => {
            if (!canViewAll) return;

            // If already loaded, just return
            if (allSites.length > 0) {
                return;
            }

            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                setAllSites(list);
            } catch { }
        })();
    }, [canViewAll, allSites.length]);

    // Fetch Filters Data (Categories)
    useEffect(() => {
        (async () => {
            try {
                const cats = await apiClient<any>("/labor/categories", { withAuth: true });
                setCategories(cats.categories || []);
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        })();
    }, []);

    // Fetch Contractors (Filtered by Site)
    useEffect(() => {
        (async () => {
            try {
                const params: any = {};
                if (selectedSiteId) params.site_id = selectedSiteId;

                const res = await apiClient<any>("/labor/contractors", { withAuth: true, params });
                setContractors(res.contractors || []);
            } catch (error) {
                console.error("Failed to fetch contractors", error);
            }
        })();
    }, [selectedSiteId]);

    // Fetch Subcategories
    useEffect(() => {
        if (selectedCategoryId) {
            (async () => {
                try {
                    const res = await apiClient<any>(`/labor/categories/${selectedCategoryId}/subcategories`, { withAuth: true });
                    setSubcategories(res.subcategories || []);
                } catch { setSubcategories([]); }
            })();
        } else {
            setSubcategories([]);
        }
    }, [selectedCategoryId]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const formatTime = (ts: string) => {
        if (!ts) return "-";
        return new Date(ts).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
    };

    const openSessionsModal = async (laborer: any) => {
        setViewSessionsLaborer(laborer);
        setLoadingSessions(true);
        try {
            const res = await apiClient<{ logs: any[] }>("/labor/attendance/logs", { withAuth: true, params: { laborer_id: laborer.id, date } });
            setSessions(res.logs || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSessions(false);
        }
    };



    // ... (render)

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Attendance Logs
                        </h1>
                        <p className="text-sm text-gray-500">Daily Laborer Presence & Details</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            title="Toggle Filters"
                        >
                            <Calendar className="w-4 h-4" /> {/* Reuse Calendar icon or find Filter icon if imported */}
                        </button>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <div className="relative">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-3 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button onClick={() => { fetchList(); }} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingList ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            {/* Search */}
                            <div className="flex-1 relative w-full">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search laborer by name or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Show Terminated Toggle */}
                            <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    id="showTerminated"
                                    checked={showTerminated}
                                    onChange={(e) => setShowTerminated(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="showTerminated" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Show Terminated
                                </label>
                            </div>

                            {/* HQ Mode Toggle */}
                            {canHRMode && (
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={hqMode}
                                        onChange={(e) => setHqMode(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">HR Mode</span>
                                </label>
                            )}

                            {/* Status Filter */}
                            <div className="w-full md:w-48">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="present">Present</option>
                                    <option value="active">Currently Active</option>
                                    <option value="completed">Completed Shift</option>
                                    <option value="absent">Absent</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                            {/* Site Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Site</label>
                                <select
                                    value={selectedSiteId || ""}
                                    onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {canViewAll && <option value="">All Sites</option>}
                                    {(canViewAll ? allSites : inchargeSites).map((site) => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Contractor Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Contractor</label>
                                <select
                                    value={selectedContractorId || ""}
                                    onChange={(e) => setSelectedContractorId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">All Contractors</option>
                                    {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Category</label>
                                <select
                                    value={selectedCategoryId || ""}
                                    onChange={(e) => {
                                        setSelectedCategoryId(e.target.value ? Number(e.target.value) : null);
                                        setSelectedSubcategoryId(null);
                                    }}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Subcategory Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Subcategory</label>
                                <select
                                    value={selectedSubcategoryId || ""}
                                    onChange={(e) => setSelectedSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    disabled={!selectedCategoryId}
                                >
                                    <option value="">All Subcategories</option>
                                    {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* List Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Attendance Log</h3>
                        <span className="text-xs text-gray-500">Showing {laborers.length} records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">Laborer</th>
                                    <th className="px-6 py-3">Site</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Sessions</th>
                                    <th className="px-6 py-3">First In</th>
                                    <th className="px-6 py-3">Last Out</th>
                                    <th className="px-6 py-3">Active Time</th>
                                    <th className="px-6 py-3">Current Rate</th>
                                    <th className="px-6 py-3 text-right">Earned</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingList ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                                                <span className="text-sm font-medium">Loading attendance records...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-red-500 bg-red-50/30">
                                            <div className="flex flex-col items-center gap-3">
                                                <AlertCircle className="w-10 h-10 text-red-500" />
                                                <div className="space-y-1">
                                                    <p className="font-semibold">{error}</p>
                                                    <button
                                                        onClick={() => fetchList()}
                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium underline underline-offset-4"
                                                    >
                                                        Retry Fetch
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : laborers.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-16 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <Users className="w-12 h-12 text-gray-300" />
                                                <div className="space-y-1">
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {showTerminated ? "No terminated laborers found" : "No laborers found"}
                                                    </p>
                                                    <p className="text-sm">Try adjusting your filters or search query</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : ( // ... Table rows ...
                                    laborers.map((emp) => {
                                        const isPresent = Boolean(emp.status);
                                        const isWorking = isPresent && !emp.last_out_time;

                                        return (
                                            <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                            {emp.registered_image ? (
                                                                <img src={emp.registered_image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Users className="w-5 h-5 text-gray-400 m-2" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="font-semibold text-gray-900">{emp.name}</div>
                                                                {emp.registration_status === 'terminated' && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-tight">
                                                                        Terminated
                                                                    </span>
                                                                )}
                                                                {(emp.is_migrated === 1 || emp.is_migrated === true) && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-tight">
                                                                        Migrated
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(emp.is_migrated === 1 || emp.is_migrated === true) && (
                                                                <div className="text-[10px] text-amber-600 font-medium mb-0.5">
                                                                    From: {emp.primary_site_name || 'Primary Site'}
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-gray-500">{emp.phone_number}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span>{emp.site_name || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {emp.status ? (
                                                        (() => {
                                                            const isCompleted = emp.status === 'Present' && emp.last_out_time;
                                                            const displayLabel = isCompleted ? 'Completed' : (emp.status === 'Present' ? 'Working Now' : (emp.status === 'Pending' ? 'Pending Out' : emp.status));
                                                            const colorClass = isCompleted
                                                                ? 'bg-green-50 text-green-700 border border-green-100'
                                                                : (emp.status === 'Present'
                                                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                                    : (emp.status === 'Pending'
                                                                        ? 'bg-orange-50 text-orange-700 border border-orange-100'
                                                                        : 'bg-gray-100 text-gray-700'));

                                                            return (
                                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                                                                    {displayLabel}
                                                                </span>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Absent</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-center">
                                                    {isPresent ? (
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                                                            {emp.session_count || 1}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                    {formatTime(emp.first_in_time)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {formatTime(emp.last_out_time)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isPresent ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="font-semibold text-gray-900">
                                                                {Math.floor((emp.total_active_minutes || 0) / 60)}h {(emp.total_active_minutes || 0) % 60}m
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {emp.active_rate_info ? (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${emp.active_rate_info.type === 'Overtime' ? 'bg-orange-100 text-orange-700' :
                                                                emp.active_rate_info.type === 'Night' ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-blue-50 text-blue-700'
                                                                }`}>
                                                                {emp.active_rate_info.type}
                                                            </span>
                                                            <span className="text-xs font-semibold text-gray-700">₹{emp.active_rate_info.value}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-right text-gray-900">
                                                    {emp.earned_amount ? `₹${emp.earned_amount}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isPresent && (
                                                        <button
                                                            onClick={() => openSessionsModal(emp)}
                                                            className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 flex-shrink-0">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="text-xs text-gray-600">
                                    Showing <span className="font-medium text-gray-900">{(page - 1) * limit + 1}</span> to{" "}
                                    <span className="font-medium text-gray-900">{Math.min(page * limit, totalItems)}</span> of{" "}
                                    <span className="font-medium text-gray-900">{totalItems}</span> results
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Rows per page */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">Rows per page:</span>
                                        <select
                                            value={limit}
                                            onChange={(e) => {
                                                setLimit(Number(e.target.value));
                                                setPage(1);
                                            }}
                                            className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>

                                    {/* Page navigation */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="p-1.5 border border-gray-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ArrowRight className="w-4 h-4 text-gray-600 rotate-180" />
                                        </button>

                                        <div className="flex items-center gap-1 hidden sm:flex">
                                            {(() => {
                                                const pages = [];
                                                const maxVisible = 5;
                                                let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                                                let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                                                if (endPage - startPage + 1 < maxVisible) {
                                                    startPage = Math.max(1, endPage - maxVisible + 1);
                                                }

                                                if (startPage > 1) {
                                                    pages.push(
                                                        <button
                                                            key={1}
                                                            onClick={() => setPage(1)}
                                                            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${page === 1
                                                                ? "bg-blue-600 text-white"
                                                                : "border border-gray-200 text-gray-700 hover:bg-white"
                                                                }`}
                                                        >
                                                            1
                                                        </button>
                                                    );
                                                    if (startPage > 2) {
                                                        pages.push(
                                                            <span key="ellipsis1" className="px-1 text-gray-400 text-xs">...</span>
                                                        );
                                                    }
                                                }

                                                for (let p = startPage; p <= endPage; p++) {
                                                    pages.push(
                                                        <button
                                                            key={p}
                                                            onClick={() => setPage(p)}
                                                            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${page === p
                                                                ? "bg-blue-600 text-white"
                                                                : "border border-gray-200 text-gray-700 hover:bg-white"
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                }

                                                if (endPage < totalPages) {
                                                    if (endPage < totalPages - 1) {
                                                        pages.push(
                                                            <span key="ellipsis2" className="px-1 text-gray-400 text-xs">...</span>
                                                        );
                                                    }
                                                    pages.push(
                                                        <button
                                                            key={totalPages}
                                                            onClick={() => setPage(totalPages)}
                                                            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${page === totalPages
                                                                ? "bg-blue-600 text-white"
                                                                : "border border-gray-200 text-gray-700 hover:bg-white"
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
                                            className="p-1.5 border border-gray-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ArrowRight className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {viewSessionsLaborer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Session Details</h3>
                                <p className="text-sm text-gray-500">{viewSessionsLaborer.name} • {date}</p>
                            </div>
                            <button onClick={() => setViewSessionsLaborer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <span className="sr-only">Close</span>
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {viewSessionsLaborer?.breakdown && (
                                <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">Cost Breakdown</h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Regular Day</span>
                                            <span className="font-medium text-gray-900">
                                                {Math.floor(viewSessionsLaborer.breakdown.regular_day.mins / 60)}h {viewSessionsLaborer.breakdown.regular_day.mins % 60}m
                                                <span className="ml-2 text-xs text-gray-500">(₹{viewSessionsLaborer.breakdown.regular_day.cost.toFixed(1)})</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Regular Night</span>
                                            <span className="font-medium text-gray-900">
                                                {Math.floor(viewSessionsLaborer.breakdown.regular_night.mins / 60)}h {viewSessionsLaborer.breakdown.regular_night.mins % 60}m
                                                <span className="ml-2 text-xs text-gray-500">(₹{viewSessionsLaborer.breakdown.regular_night.cost.toFixed(1)})</span>
                                            </span>
                                        </div>
                                        {viewSessionsLaborer.breakdown.overtime_day.mins > 0 && (
                                            <div className="flex justify-between items-center text-amber-700 font-medium">
                                                <span>Overtime Day</span>
                                                <span>
                                                    {Math.floor(viewSessionsLaborer.breakdown.overtime_day.mins / 60)}h {viewSessionsLaborer.breakdown.overtime_day.mins % 60}m
                                                    <span className="ml-2 text-xs opacity-80">(₹{viewSessionsLaborer.breakdown.overtime_day.cost.toFixed(1)})</span>
                                                </span>
                                            </div>
                                        )}
                                        {viewSessionsLaborer.breakdown.overtime_night.mins > 0 && (
                                            <div className="flex justify-between items-center text-amber-700 font-medium">
                                                <span>Overtime Night</span>
                                                <span>
                                                    {Math.floor(viewSessionsLaborer.breakdown.overtime_night.mins / 60)}h {viewSessionsLaborer.breakdown.overtime_night.mins % 60}m
                                                    <span className="ml-2 text-xs opacity-80">(₹{viewSessionsLaborer.breakdown.overtime_night.cost.toFixed(1)})</span>
                                                </span>
                                            </div>
                                        )}
                                        <div className="col-span-2 pt-2 mt-1 border-t border-gray-200 flex justify-between items-center font-bold text-gray-900">
                                            <span>Total</span>
                                            <span className="text-lg text-green-600">₹{viewSessionsLaborer.breakdown.total_cost.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {loadingSessions ? (
                                <div className="text-center py-8 text-gray-500">Loading sessions...</div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No session logs found.</div>
                            ) : (
                                <div className="space-y-4">
                                    {(() => {
                                        // Group logs into sessions (IN -> OUT pairs)
                                        // Logs are sorted DESC by punch_time. Reverse to process chronologically.
                                        const sortedLogs = [...sessions].sort((a, b) => new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime());
                                        const sessionGroups: any[] = [];
                                        let currentSession: any = null;

                                        sortedLogs.forEach((log) => {
                                            if (log.punch_type === 'IN') {
                                                // Start new session (if old one active, close it implicitly? No, assume strict pairing usually)
                                                // Actually, if we hit IN and have an open session, just push the open one as "incomplete" (shouldn't happen with strict logic but safety first)
                                                if (currentSession) {
                                                    sessionGroups.push(currentSession);
                                                }
                                                currentSession = {
                                                    start: log.punch_time,
                                                    startImage: log.image_url,
                                                    end: null,
                                                    endImage: null,
                                                    durationParams: null
                                                };
                                            } else if (log.punch_type === 'OUT') {
                                                if (currentSession) {
                                                    currentSession.end = log.punch_time;
                                                    currentSession.endImage = log.image_url;
                                                    // Calculate
                                                    const diff = new Date(log.punch_time).getTime() - new Date(currentSession.start).getTime();
                                                    currentSession.durationParams = diff;
                                                    sessionGroups.push(currentSession);
                                                    currentSession = null;
                                                } else {
                                                    // Orphan OUT punch? Ignore or show
                                                }
                                            }
                                        });

                                        // Push last open session
                                        if (currentSession) {
                                            // Working now
                                            const diff = new Date().getTime() - new Date(currentSession.start).getTime();
                                            currentSession.durationParams = diff;
                                            currentSession.isWorking = true;
                                            sessionGroups.push(currentSession);
                                        }

                                        // Render Sessions (Reverse order to show latest first)
                                        return sessionGroups.reverse().map((session, idx) => {
                                            const minutes = Math.floor((session.durationParams || 0) / 60000);
                                            const hrs = Math.floor(minutes / 60);
                                            const mins = minutes % 60;
                                            const durationStr = `${hrs}h ${mins}m`;

                                            return (
                                                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${session.isWorking ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
                                                            <span className="font-bold text-gray-800">
                                                                Session {sessionGroups.length - idx}
                                                            </span>
                                                            {session.isWorking && (
                                                                <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Working</span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm font-mono font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                                            {durationStr}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* IN */}
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> IN
                                                            </div>
                                                            <div className="text-sm font-semibold mb-2">
                                                                {new Date(session.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                                                            </div>
                                                            {session.startImage && (
                                                                <img
                                                                    src={session.startImage}
                                                                    className="w-full h-24 object-contain rounded-lg border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                                                    onClick={() => {
                                                                        setSelectedImage(session.startImage!);
                                                                        setShowImageModal(true);
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        {/* OUT */}
                                                        <div>
                                                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> OUT
                                                            </div>
                                                            <div className="text-sm font-semibold mb-2">
                                                                {session.end ? new Date(session.end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 'Active'}
                                                            </div>
                                                            {session.endImage ? (
                                                                <img
                                                                    src={session.endImage}
                                                                    className="w-full h-24 object-contain rounded-lg border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                                                    onClick={() => {
                                                                        setSelectedImage(session.endImage!);
                                                                        setShowImageModal(true);
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-24 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-xs text-gray-400 italic">
                                                                    Working...
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <LaborExportModal
                    current={{
                        siteId: selectedSiteId,
                        contractorId: selectedContractorId,
                        categoryId: selectedCategoryId,
                        subcategoryId: selectedSubcategoryId,
                        date: date,
                        status: statusFilter,
                        search: searchQuery
                    }}
                    siteOptions={canViewAll ? allSites : inchargeSites}
                    contractors={contractors}
                    categories={categories}
                    canViewAll={canViewAll}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {/* Image Modal */}
            {showImageModal && selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
                    <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Attendance Detail"
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
                        />
                    </div>
                </div>
            )}


        </div>
    );
}

// Labor Export Modal Component
function LaborExportModal({
    current,
    siteOptions,
    contractors,
    categories,
    canViewAll,
    onClose
}: {
    current: {
        siteId: number | null;
        contractorId: number | null;
        categoryId: number | null;
        subcategoryId: number | null;
        date: string;
        status: string;
        search: string;
    };
    siteOptions: any[];
    contractors: any[];
    categories: any[];
    canViewAll: boolean;
    onClose: () => void;
}) {
    const [local, setLocal] = useState({ ...current });
    const [exportType, setExportType] = useState<'daily' | 'month' | 'date_range'>('daily');
    const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
    const [startDate, setStartDate] = useState(local.date || format(new Date(), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(local.date || format(new Date(), "yyyy-MM-dd"));
    const [submitting, setSubmitting] = useState(false);
    const [subcategories, setSubcategories] = useState<any[]>([]);

    // Fetch subcategories when category changes
    useEffect(() => {
        if (local.categoryId) {
            (async () => {
                try {
                    const res = await apiClient<any>(`/labor/categories/${local.categoryId}/subcategories`, { withAuth: true });
                    setSubcategories(res.subcategories || []);
                } catch { setSubcategories([]); }
            })();
        } else {
            setSubcategories([]);
            setLocal(prev => ({ ...prev, subcategoryId: null }));
        }
    }, [local.categoryId]);

    const downloadLocal = async () => {
        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3006/api/v1';

            const body: any = {
                site_id: local.siteId,
                contractor_id: local.contractorId,
                category_id: local.categoryId,
                subcategory_id: local.subcategoryId,
                status: local.status === 'all' ? '' : local.status,
                search: local.search,
                format: exportFormat,
                export_type: exportType
            };

            if (exportType === 'month') {
                body.month = selectedMonth;
            } else if (exportType === 'date_range') {
                body.start_date = startDate;
                body.end_date = endDate;
            } else {
                body.date = local.date;
            }

            const res = await fetch(`${baseUrl}/labor/attendance/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Failed to download export');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            let filename = `Labor_Daily_${local.date}`;
            if (exportType === 'month') filename = `Labor_Monthly_${selectedMonth}`;
            if (exportType === 'date_range') filename = `Labor_Range_${startDate}_to_${endDate}`;
            a.download = `${filename}.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            onClose();
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to download export');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Export Labor Attendance</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-4 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
                    <button
                        onClick={() => setExportType('daily')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${exportType === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Daily Report
                    </button>
                    <button
                        onClick={() => setExportType('month')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${exportType === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Monthly Report
                    </button>
                    <button
                        onClick={() => setExportType('date_range')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${exportType === 'date_range' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Date Range
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Site */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Site</label>
                        <select
                            value={local.siteId ?? ""}
                            onChange={(e) => setLocal({ ...local, siteId: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            {canViewAll && <option value="">All Sites</option>}
                            {siteOptions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                    </div>

                    {/* Date / Month Picker */}
                    <div>
                        {exportType === 'daily' ? (
                            <>
                                <label className="block text-xs text-gray-500 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={local.date}
                                    onChange={(e) => setLocal({ ...local, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </>
                        ) : exportType === 'month' ? (
                            <>
                                <label className="block text-xs text-gray-500 mb-1">Month</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">From Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Till Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contractor */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Contractor</label>
                        <select
                            value={local.contractorId ?? ""}
                            onChange={(e) => setLocal({ ...local, contractorId: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">All Contractors</option>
                            {contractors.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                    </div>

                    {/* Status */}
                    {exportType === 'daily' && (
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Status</label>
                            <select
                                value={local.status}
                                onChange={(e) => setLocal({ ...local, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="present">Present</option>
                                <option value="active">Currently Active</option>
                                <option value="completed">Completed Shift</option>
                                <option value="absent">Absent</option>
                            </select>
                        </div>
                    )}

                    {/* Category */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Category</label>
                        <select
                            value={local.categoryId ?? ""}
                            onChange={(e) => setLocal({ ...local, categoryId: e.target.value ? Number(e.target.value) : null, subcategoryId: null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                    </div>

                    {/* Subcategory */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Subcategory</label>
                        <select
                            value={local.subcategoryId ?? ""}
                            onChange={(e) => setLocal({ ...local, subcategoryId: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            disabled={!local.categoryId}
                        >
                            <option value="">All Subcategories</option>
                            {subcategories.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                    </div>

                    {/* Export Format */}
                    <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Export Format</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="export_format"
                                    value="excel"
                                    checked={exportFormat === 'excel'}
                                    onChange={() => setExportFormat('excel')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-700">Excel (.xlsx)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="export_format"
                                    value="pdf"
                                    checked={exportFormat === 'pdf'}
                                    onChange={() => setExportFormat('pdf')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-700">PDF (.pdf)</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end mt-6 gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={downloadLocal}
                        disabled={submitting}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Download
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

