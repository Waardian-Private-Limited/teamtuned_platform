"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Filter,
    Users,
    Building,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Eye,
    RefreshCw,
    X,
    Download,
    FileText,
    Loader2,
    CheckCircle,
    AlertCircle,
    MoreVertical,
    Pause,
    Play,
    Hammer
} from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import SalarySlipEditorModal from "./SalarySlipEditorModal";

const SalarySlipGenerator = () => {
    const { role, permissions, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalItems: 0 });

    // Filters
    const [search, setSearch] = useState("");

    // HR Mode & Site Logic
    const isEmployee = (role || "").toLowerCase() === "employee";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canHRMode = !isEmployee || hasPerm("HR_MODE");

    const [hqMode, setHqMode] = useState(false);
    const [siteId, setSiteId] = useState<string>("");
    const [inchargeSites, setInchargeSites] = useState<any[]>([]);
    const [allSites, setAllSites] = useState<any[]>([]);

    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [slipStatus, setSlipStatus] = useState("all"); // Generated, Not Generated, Held
    const [employeeStatus, setEmployeeStatus] = useState("active"); // active, inactive, all

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Custom Editor
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);

    useEffect(() => {
        const loadSites = async () => {
            try {
                // 1. Incharge Sites
                const resIncharge = await apiClient.get("/attendance/incharge-sites");
                const listIncharge = resIncharge.sites || [];
                setInchargeSites(listIncharge);

                // Default to first incharge site if available
                if (listIncharge.length > 0 && !siteId) {
                    setSiteId(String(listIncharge[0].id));
                }

                // 2. All Sites (if HR)
                if (canHRMode) {
                    const resAll = await apiClient.get("/sites", { incharge_only: "0" });
                    setAllSites(resAll.sites || resAll.data || []);
                    // Enable HQ mode by default for HRs if they have access
                    setHqMode(true);
                }
            } catch (err) {
                console.error("Failed to fetch sites", err);
            }
        };
        loadSites();
    }, [canHRMode]);

    useEffect(() => {
        // Prevent 400 Bad Request: If not in HQ mode and no site selected, don't fetch.
        if (!hqMode && !siteId) return;

        fetchEmployees();
        setSelectedIds([]);
    }, [pagination.page, pagination.limit, siteId, month, year, slipStatus, employeeStatus, hqMode]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);

            const params: any = {
                page: pagination.page,
                limit: pagination.limit,
                search,
                month,
                year,
            };

            // Site / HQ Logic
            if (hqMode && canHRMode) {
                params.hq = "1";
                if (siteId) params.site_id = siteId;
            } else {
                if (siteId) params.site_id = siteId;
            }

            // Status Filter (Active/Inactive)
            if (employeeStatus) {
                params.status = employeeStatus;
            }

            const res = await apiClient.get("/attendance/payroll-list", params);

            let filteredItems = res.items || [];

            // Client-side slip status filter (functionality kept from original)
            if (slipStatus === "generated") {
                filteredItems = filteredItems.filter((i: any) => i.s3_url);
            } else if (slipStatus === "not_generated") {
                filteredItems = filteredItems.filter((i: any) => !i.s3_url);
            } else if (slipStatus === "held") {
                filteredItems = filteredItems.filter((i: any) => i.is_held);
            }

            setEmployees(filteredItems);
            setPagination(res.pagination || { page: 1, limit: 10, totalPages: 1, totalItems: 0 });
        } catch (err) {
            toast.error("Failed to fetch employees");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (ids: number[]) => {
        if (!ids.length) return;
        try {
            setGenerating(ids.length === 1 ? String(ids[0]) : "bulk");
            const res = await apiClient.post("/attendance/payroll-generate", {
                employee_ids: ids,
                month,
                year,
                site_id: siteId
            });

            const successCount = res.results.filter((r: any) => r.status === "success").length;
            const failCount = res.results.length - successCount;

            if (successCount > 0) {
                toast.success(`Successfully generated ${successCount} salary slip(s)`);
                fetchEmployees();
            }
            if (failCount > 0) {
                toast.error(`Failed to generate ${failCount} salary slip(s)`);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to generate salary slips");
        } finally {
            setGenerating(null);
        }
    };

    const handleHoldToggle = async (emp: any) => {
        try {
            await apiClient.post("/attendance/payroll-hold", {
                employee_id: emp.id,
                month,
                year,
                is_held: !emp.is_held
            });
            toast.success(`Salary slip ${!emp.is_held ? 'held' : 'unheld'} successfully`);
            fetchEmployees();
        } catch (err: any) {
            toast.error(err.message || "Failed to update hold status");
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === employees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(employees.map(e => e.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);



    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Salary Slip Generator</h1>
                    <p className="text-gray-500">Manage and generate monthly salary slips for employees</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => handleGenerate(selectedIds)}
                            disabled={generating === "bulk"}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            {generating === "bulk" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Generate Selected ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Employees</p>
                            <p className="text-xl font-bold text-gray-900">{pagination.totalItems}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Generated</p>
                            <p className="text-xl font-bold text-gray-900">{employees.filter(e => e.s3_url).length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Pause className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">On Hold</p>
                            <p className="text-xl font-bold text-gray-900">{employees.filter(e => e.is_held).length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-xl font-bold text-gray-900">{employees.filter(e => !e.s3_url).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                    {/* HR Mode Toggle */}
                    {canHRMode && (
                        <div className="lg:col-span-2">
                            <label className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100 h-[42px] cursor-pointer hover:bg-blue-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={hqMode}
                                    onChange={(e) => setHqMode(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-blue-900 select-none">HR Mode (All)</span>
                            </label>
                        </div>
                    )}

                    {/* Site Selector */}
                    <div className={canHRMode ? "lg:col-span-2" : "lg:col-span-3"}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Site</label>
                        <select
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={siteId}
                            onChange={(e) => setSiteId(e.target.value)}
                        >
                            {hqMode && canHRMode ? (
                                <option value="">All Sites</option>
                            ) : (
                                <option value="" disabled>Select Site</option>
                            )}
                            {(canHRMode ? allSites : inchargeSites).map((s) => (
                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
                        <select
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                        <select
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                        >
                            {YEARS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search employees..."
                            />
                        </div>
                    </div>

                    {/* Row 2 */}

                    {/* Report Status */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Report Status</label>
                        <select
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={slipStatus}
                            onChange={(e) => setSlipStatus(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="generated">Generated</option>
                            <option value="not_generated">Not Generated</option>
                            <option value="held">Held</option>
                        </select>
                    </div>

                    {/* Employee Status */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Emp Status</label>
                        <select
                            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={employeeStatus}
                            onChange={(e) => setEmployeeStatus(e.target.value)}
                        >
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                            <option value="all">All Employees</option>
                        </select>
                    </div>

                    <div className="lg:col-span-2 lg:col-start-11">
                        <button
                            onClick={() => {
                                setPagination({ ...pagination, page: 1 });
                                fetchEmployees();
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedIds.length === employees.length && employees.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Site / Dept</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cycle</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4 text-center text-gray-400">Loading...</td>
                                    </tr>
                                ))
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="w-8 h-8 text-gray-200" />
                                            <p>No employees found for this criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.includes(emp.id)}
                                                onChange={() => toggleSelect(emp.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {emp.profile_image_url ? (
                                                    <img src={emp.profile_image_url} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {emp.first_name[0]}{emp.last_name[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900">{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-xs text-gray-500">ID: TT-{emp.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                                    <Building className="w-3 h-3" /> {emp.site_name}
                                                </p>
                                                <p className="text-xs text-gray-500">{emp.department_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 uppercase text-xs font-mono text-gray-600">
                                            {emp.cycle_start} to {emp.cycle_end}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ₹{emp.salary.net_payment.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {emp.is_held ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                                                    <Pause className="w-3 h-3" /> Held
                                                </span>
                                            ) : emp.s3_url ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1 w-fit">
                                                    <CheckCircle className="w-3 h-3" /> Generated
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1 w-fit">
                                                    <RefreshCw className="w-3 h-3" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {emp.s3_url && (
                                                    <a
                                                        href={emp.s3_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Slip"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleGenerate([emp.id])}
                                                    disabled={generating === String(emp.id)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Generate/Regenerate"
                                                >
                                                    {generating === String(emp.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingEmployee(emp);
                                                        setEditorOpen(true);
                                                    }}
                                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                    title="Custom Generator"
                                                >
                                                    <Hammer className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleHoldToggle(emp)}
                                                    className={`p-2 rounded-lg transition-colors ${emp.is_held ? 'text-blue-600 hover:bg-blue-50' : 'text-amber-600 hover:bg-amber-50'}`}
                                                    title={emp.is_held ? "Release Hold" : "Hold Slip"}
                                                >
                                                    {emp.is_held ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-500">
                            Showing <span className="font-medium text-gray-900">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.totalItems)}</span> of <span className="font-medium text-gray-900">{pagination.totalItems}</span> employees
                        </p>
                        <select
                            value={pagination.limit}
                            onChange={(e) => setPagination({ ...pagination, limit: Number(e.target.value), page: 1 })}
                            className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                            <option value="100">100 per page</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            disabled={pagination.page === 1}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium px-4">Page {pagination.page} of {pagination.totalPages}</span>
                        <button
                            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            disabled={pagination.page === pagination.totalPages}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Modal */}
            {editorOpen && editingEmployee && (
                <SalarySlipEditorModal
                    isOpen={editorOpen}
                    onClose={() => {
                        setEditorOpen(false);
                        setEditingEmployee(null);
                        fetchEmployees();
                    }}
                    employeeId={editingEmployee.id}
                    initialData={editingEmployee}
                    cycleStart={editingEmployee.cycle_start}
                    cycleEnd={editingEmployee.cycle_end}
                />
            )}
        </div>
    );
};

export default SalarySlipGenerator;
