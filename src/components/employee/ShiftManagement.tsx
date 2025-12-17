"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import {
    Save, X, Edit2, ArrowLeft, Filter, ChevronDown, ChevronUp, Search,
    Clock, Calendar, User, CheckCircle, ChevronLeft, ChevronRight
} from "lucide-react";

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    department_id: number | null;
    department_name: string | null;
    shift_start_time: string | null;
    shift_end_time: string | null;
    week_off_days: string[];
    site_names: string[];
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShiftManagement() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Popup state
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editShiftStart, setEditShiftStart] = useState('');
    const [editShiftEnd, setEditShiftEnd] = useState('');
    const [editWeekOffs, setEditWeekOffs] = useState<Set<string>>(new Set());

    // Bulk edit state
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [bulkShiftStart, setBulkShiftStart] = useState('');
    const [bulkShiftEnd, setBulkShiftEnd] = useState('');
    const [bulkWeekOffs, setBulkWeekOffs] = useState<Set<string>>(new Set());

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState<number | null>(null);
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [pageSize, setPageSize] = useState(50);

    // Modern notification system
    const createNotificationContainer = () => {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        const container = createNotificationContainer();
        const notification = document.createElement('div');
        notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
    }, [selectedDept, currentPage, pageSize]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                limit: pageSize
            };
            if (selectedDept) params.department_id = selectedDept;
            if (searchTerm) params.search = searchTerm;

            const data = await apiClient<any>('/organization/employees/shifts', {
                method: 'GET',
                params,
                withAuth: true
            });
            setEmployees(data.employees || []);
            if (data.pagination) {
                setTotalPages(data.pagination.totalPages);
                setTotalEmployees(data.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            showNotification('Failed to load employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await apiClient<any[]>('/organization/departments', {
                method: 'GET',
                withAuth: true
            });
            setDepartments(data || []);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const openEditPopup = (emp: Employee) => {
        setEditingEmployee(emp);
        setEditShiftStart(emp.shift_start_time || '');
        setEditShiftEnd(emp.shift_end_time || '');
        setEditWeekOffs(new Set(emp.week_off_days || []));
        setShowEditPopup(true);
    };

    const closeEditPopup = () => {
        setShowEditPopup(false);
        setEditingEmployee(null);
        setEditShiftStart('');
        setEditShiftEnd('');
        setEditWeekOffs(new Set());
    };

    const toggleWeekOff = (day: string) => {
        const newWeekOffs = new Set(editWeekOffs);
        if (newWeekOffs.has(day)) {
            newWeekOffs.delete(day);
        } else {
            newWeekOffs.add(day);
        }
        setEditWeekOffs(newWeekOffs);
    };

    const toggleBulkWeekOff = (day: string) => {
        const newWeekOffs = new Set(bulkWeekOffs);
        if (newWeekOffs.has(day)) {
            newWeekOffs.delete(day);
        } else {
            newWeekOffs.add(day);
        }
        setBulkWeekOffs(newWeekOffs);
    };

    const saveEdit = async () => {
        if (!editingEmployee) return;

        try {
            setSaving(true);
            await apiClient(`/organization/employees/${editingEmployee.id}/shift`, {
                method: 'PUT',
                body: {
                    shift_start_time: editShiftStart || null,
                    shift_end_time: editShiftEnd || null,
                    week_off_days: Array.from(editWeekOffs)
                },
                withAuth: true
            });

            await fetchEmployees();
            closeEditPopup();
            showNotification('Shift updated successfully', 'success');
        } catch (error) {
            console.error('Failed to save shift:', error);
            showNotification('Failed to save changes', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        if (selectedIds.size === employees.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(employees.map(e => e.id)));
        }
    };

    const bulkUpdate = async () => {
        if (selectedIds.size === 0) {
            showNotification('Please select employees to update', 'error');
            return;
        }

        if (!bulkShiftStart && !bulkShiftEnd && bulkWeekOffs.size === 0) {
            showNotification('Please set at least one field to update', 'error');
            return;
        }

        try {
            setSaving(true);
            const updates = Array.from(selectedIds).map(id => ({
                employee_id: id,
                shift_start_time: bulkShiftStart || undefined,
                shift_end_time: bulkShiftEnd || undefined,
                week_off_days: bulkWeekOffs.size > 0 ? Array.from(bulkWeekOffs) : undefined
            }));

            await apiClient('/organization/employees/shifts/bulk', {
                method: 'PUT',
                body: { updates },
                withAuth: true
            });

            await fetchEmployees();
            setSelectedIds(new Set());
            setShowBulkEdit(false);
            setBulkShiftStart('');
            setBulkShiftEnd('');
            setBulkWeekOffs(new Set());
            showNotification(`Successfully updated ${selectedIds.size} employee(s)`, 'success');
        } catch (error) {
            console.error('Failed to bulk update:', error);
            showNotification('Failed to update shifts', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            emp.first_name.toLowerCase().includes(search) ||
            emp.last_name.toLowerCase().includes(search) ||
            emp.email.toLowerCase().includes(search)
        );
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
                            <p className="text-gray-600 mt-1">Manage employee shift timings and week-offs</p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Filter size={18} />
                            Filters
                            {filtersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    {/* Collapsible Filters */}
                    {filtersExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        value={selectedDept || ''}
                                        onChange={(e) => setSelectedDept(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={fetchEmployees}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-blue-900 font-medium">
                                {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''} selected
                            </p>
                            <button
                                onClick={() => setShowBulkEdit(!showBulkEdit)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {showBulkEdit ? 'Cancel Bulk Edit' : 'Bulk Update'}
                            </button>
                        </div>

                        {showBulkEdit && (
                            <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Shift Start</label>
                                        <input
                                            type="time"
                                            value={bulkShiftStart}
                                            onChange={(e) => setBulkShiftStart(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Shift End</label>
                                        <input
                                            type="time"
                                            value={bulkShiftEnd}
                                            onChange={(e) => setBulkShiftEnd(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Week Off Days</label>
                                    <div className="flex flex-wrap gap-2">
                                        {WEEK_DAYS.map(day => (
                                            <button
                                                key={day}
                                                onClick={() => toggleBulkWeekOff(day)}
                                                className={`px-4 py-2 rounded-lg border-2 transition-colors ${bulkWeekOffs.has(day)
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={bulkUpdate}
                                        disabled={saving}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center gap-2"
                                    >
                                        {saving ? 'Saving...' : <><Save size={18} /> Apply to Selected</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === employees.length && employees.length > 0}
                                            onChange={selectAll}
                                            className="rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shift Start</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shift End</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Week Off</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            No employees found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(emp.id)}
                                                    onChange={() => toggleSelection(emp.id)}
                                                    className="rounded border-gray-300"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-sm text-gray-500">{emp.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {emp.department_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {emp.shift_start_time || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {emp.shift_end_time || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {emp.week_off_days.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {emp.week_off_days.map(day => (
                                                            <span key={day} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                                {day}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => openEditPopup(emp)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination - EmployeeManagement Style */}
                {filteredEmployees.length > 0 && (
                    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
                        <div className="text-xs text-gray-600">
                            Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * pageSize, totalEmployees)}</span> of{' '}
                            <span className="font-medium">{totalEmployees}</span> employees
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
                                    disabled={currentPage <= 1}
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
                                        if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);

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
                                            if (startPage > 2) pages.push(<span key="ellipsis1" className="px-1 text-gray-500">...</span>);
                                        }

                                        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                                            pages.push(
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`px-2 py-1 rounded text-xs transition-colors ${currentPage === pageNum
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

            {/* Edit Popup Modal */}
            {showEditPopup && editingEmployee && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Clock className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Edit Shift</h3>
                                    <p className="text-sm text-gray-600">{editingEmployee.first_name} {editingEmployee.last_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeEditPopup}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Employee Info */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <User className="w-5 h-5 text-gray-600" />
                                    <span className="font-medium text-gray-900">{editingEmployee.first_name} {editingEmployee.last_name}</span>
                                </div>
                                <p className="text-sm text-gray-600 ml-8">{editingEmployee.email}</p>
                                {editingEmployee.department_name && (
                                    <p className="text-sm text-gray-600 ml-8">{editingEmployee.department_name}</p>
                                )}
                            </div>

                            {/* Shift Times */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Shift Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={editShiftStart}
                                        onChange={(e) => setEditShiftStart(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Shift End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={editShiftEnd}
                                        onChange={(e) => setEditShiftEnd(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Week Off Days */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Week Off Days (Select multiple)
                                </label>
                                <div className="grid grid-cols-4 gap-3">
                                    {WEEK_DAYS.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => toggleWeekOff(day)}
                                            className={`px-4 py-3 rounded-lg border-2 transition-all ${editWeekOffs.has(day)
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                {editWeekOffs.has(day) && <CheckCircle size={16} />}
                                                <span className="font-medium">{day}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {editWeekOffs.size > 0 && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        Selected: {Array.from(editWeekOffs).join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                            <button
                                onClick={closeEditPopup}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
