"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import {
    Search,
    Filter,
    Check,
    Users,
    Loader2,
    ArrowRight,
    CheckSquare,
    Square,
    ChevronLeft,
    ChevronRight,
    MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Department {
    id: number;
    name: string;
}

interface Role {
    id: number;
    name: string;
}

interface Site {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    department_id: number | null;
    department_name: string | null;
    role_id: number | null;
    role_name: string | null;
    designation: string | null;
    status: string;
}

interface PaginatedResponse {
    data: Employee[];
    total: number;
    page: number;
    limit: number;
}

export default function DeptRoleMapper() {
    // Data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [sites, setSites] = useState<Site[]>([]);

    // Loading & Stats
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<number | 'all'>('all');
    const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
    const [siteFilter, setSiteFilter] = useState<number | 'all'>('all');
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);

    // Bulk Update State
    const [targetDept, setTargetDept] = useState<number | 'no_change'>('no_change');
    const [targetRole, setTargetRole] = useState<number | 'no_change'>('no_change');
    const [applying, setApplying] = useState(false);

    // Initial Load (Metadata)
    // Initial Load (Metadata)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [deptRes, roleRes, siteRes] = await Promise.all([
                    apiClient<any>('/organization/departments'),
                    apiClient<any>('/organization/roles'),
                    apiClient<any>('/sites'),
                ]);

                // Helper to extract array from various response formats
                const getArray = (res: any, key?: string) => {
                    if (!res) return [];
                    if (Array.isArray(res)) return res;
                    if (key && Array.isArray(res[key])) return res[key];
                    if (res.data && Array.isArray(res.data)) return res.data;
                    // Fallback for specific keys if not passed
                    if (res.sites && Array.isArray(res.sites)) return res.sites;
                    if (res.departments && Array.isArray(res.departments)) return res.departments;
                    if (res.roles && Array.isArray(res.roles)) return res.roles;
                    return [];
                };

                setDepartments(getArray(deptRes, 'departments'));
                setRoles(getArray(roleRes, 'roles'));
                setSites(getArray(siteRes, 'sites'));
            } catch (error) {
                console.error('Failed to load metadata', error);
                toast.error('Failed to load filters');
            } finally {
                setLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    // Fetch Employees (Server-side)
    const fetchEmployees = useCallback(async () => {
        setLoadingData(true);
        try {
            const params: any = {
                page: page.toString(),
                limit: limit.toString(),
                status: 'Active', // Default to active? Or allow filter? Assuming active for assignments usually.
            };

            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (deptFilter !== 'all') params.department_id = deptFilter.toString();
            if (roleFilter !== 'all') params.role_id = roleFilter.toString();
            if (siteFilter !== 'all') params.site_id = siteFilter.toString();

            const res = await apiClient<any>('/organization/employees', { params });

            // Handle response format (API returns {data, total} or array?)
            // Based on typical controller, paginated returns { data: [], total: N }
            // If it returns array directly (non-paginated logic fallback), handle it.
            let data: Employee[] = [];
            let total = 0;

            if (Array.isArray(res)) {
                data = res;
                total = res.length;
            } else if (res.data && Array.isArray(res.data)) {
                data = res.data;
                total = res.total || res.data.length;
            }

            setEmployees(data);
            setTotalRecords(total);
        } catch (error) {
            console.error('Failed to fetch employees', error);
            toast.error('Failed to load employees');
        } finally {
            setLoadingData(false);
        }
    }, [page, limit, searchTerm, deptFilter, roleFilter, siteFilter]);

    // Trigger Fetch
    useEffect(() => {
        // Debounce search slightly
        const timer = setTimeout(() => {
            fetchEmployees();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchEmployees]);

    // Reset page on filter change (except page change itself)
    useEffect(() => {
        setPage(1);
    }, [searchTerm, deptFilter, roleFilter, siteFilter]);

    // Selection Logic
    const handleSelectAll = () => {
        if (selectedIds.size === employees.length && employees.length > 0) {
            setSelectedIds(new Set());
        } else {
            // Select only currently visible page
            const newSet = new Set(selectedIds);
            employees.forEach(e => newSet.add(e.id));
            setSelectedIds(newSet);
        }
    };

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleApply = async () => {
        if (selectedIds.size === 0) return;
        if (targetDept === 'no_change' && targetRole === 'no_change') {
            toast('Select a Department or Role to assign', { icon: 'ℹ️' });
            return;
        }

        setApplying(true);
        try {
            const payload: any = { ids: Array.from(selectedIds) };
            if (targetDept !== 'no_change') payload.department_id = targetDept;
            if (targetRole !== 'no_change') payload.role_id = targetRole;

            // Updated: apiClient sends as JSON automatically, do NOT stringify manually
            const res = await apiClient<{ success: boolean; message: string }>('/organization/employees/bulk-assign', {
                method: 'POST',
                body: payload // FIX: unexpected token error was due to double stringify
            });

            if (res.success) {
                toast.success(res.message);
                // Refresh data to show updates
                fetchEmployees();
                setSelectedIds(new Set());
                setTargetDept('no_change');
                setTargetRole('no_change');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update employees');
        } finally {
            setApplying(false);
        }
    };

    const totalPages = Math.ceil(totalRecords / limit);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 h-full">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading Mapper...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header / Filters */}
            <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Team Mapper
                        </h2>
                        <p className="text-xs text-gray-500">Bulk assign departments and roles</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto">
                        <Search className="w-4 h-4 text-gray-400 ml-2" />
                        <input
                            type="text"
                            placeholder="Search by name, email..."
                            className="text-sm border-none outline-none focus:ring-0 w-full md:w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Filter className="w-4 h-4 text-gray-400 mr-1" />

                    <select
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none max-w-[150px]"
                        value={deptFilter}
                        onChange={e => setDeptFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>

                    <select
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none max-w-[150px]"
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">All Roles</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>

                    <select
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none max-w-[150px]"
                        value={siteFilter}
                        onChange={e => setSiteFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">All Sites</option>
                        {sites.map(s => (
                            <option key={s.id} value={s.id}>{s.name || `Site #${s.id}`}</option>
                        ))}
                    </select>

                    <div className="ml-auto flex items-center gap-2">
                        {loadingData && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                        <span className="text-xs font-medium text-gray-500">
                            {totalRecords} Employees
                        </span>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-1 border-l border-gray-300 pl-2 ml-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loadingData}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gray-600 min-w-[30px] text-center">
                                {page} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loadingData}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto relative">
                {loadingData && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                        {/* Transparent loader overlay */}
                    </div>
                )}

                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="p-3 w-10 text-center border-b border-gray-200">
                                <button onClick={handleSelectAll} className="flex items-center justify-center">
                                    {selectedIds.size === employees.length && employees.length > 0 ? (
                                        <CheckSquare className="w-4 h-4 text-blue-600" />
                                    ) : (
                                        <Square className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                            </th>
                            <th className="p-3 border-b border-gray-200">Employee</th>
                            <th className="p-3 border-b border-gray-200 hidden sm:table-cell">Department</th>
                            <th className="p-3 border-b border-gray-200 hidden sm:table-cell">Role</th>
                            <th className="p-3 border-b border-gray-200 sm:hidden">Info</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                                    {loadingData ? 'Loading...' : 'No employees found matching filter.'}
                                </td>
                            </tr>
                        ) : (
                            employees.map(emp => {
                                const isSelected = selectedIds.has(emp.id);
                                return (
                                    <tr
                                        key={emp.id}
                                        className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                                        onClick={() => toggleSelection(emp.id)}
                                    >
                                        <td className="p-3 text-center">
                                            <div className={`w-4 h-4 mx-auto border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</span>
                                                <span className="text-xs text-gray-500">{emp.designation || 'No Designation'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 hidden sm:table-cell">
                                            {emp.department_name ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                    {emp.department_name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="p-3 hidden sm:table-cell">
                                            {emp.role_name ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                    {emp.role_name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                                            )}
                                        </td>
                                        {/* Mobile view combined */}
                                        <td className="p-3 sm:hidden">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs text-purple-700">{emp.department_name || '-'}</div>
                                                <div className="text-xs text-amber-700">{emp.role_name || '-'}</div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Sticky Action Footer */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bg-white border-t border-gray-200 p-4 shadow-lg z-20 flex flex-col md:flex-row items-center gap-4 justify-between sticky bottom-0"
                    >
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                {selectedIds.size}
                            </span>
                            <span>employees selected</span>
                            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-500 hover:underline ml-2">
                                Clear
                            </button>
                        </div>

                        <div className="flex flex-1 items-center gap-2 w-full md:w-auto overflow-x-auto">
                            <ArrowRight className="text-gray-300 w-4 h-4 shrink-0" />

                            <div className="flex flex-col w-full md:w-48">
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Assign Department</label>
                                <select
                                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                                    value={targetDept}
                                    onChange={e => setTargetDept(e.target.value === 'no_change' ? 'no_change' : Number(e.target.value))}
                                >
                                    <option value="no_change">No Change</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col w-full md:w-48">
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Assign Role</label>
                                <select
                                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                                    value={targetRole}
                                    onChange={e => setTargetRole(e.target.value === 'no_change' ? 'no_change' : Number(e.target.value))}
                                >
                                    <option value="no_change">No Change</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleApply}
                            disabled={applying || (targetDept === 'no_change' && targetRole === 'no_change')}
                            className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all whitespace-nowrap"
                        >
                            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Apply Changes
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
