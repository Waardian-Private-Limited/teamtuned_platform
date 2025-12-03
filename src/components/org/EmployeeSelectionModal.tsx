"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

type Employee = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role_name?: string;
    department_name?: string;
    role_id?: number;
    department_id?: number;
};

type Role = {
    id: number;
    name: string;
};

type Department = {
    id: number;
    name: string;
};

type EmployeeSelectionModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (employeeId: number) => void;
    employees: Employee[];
    roles: Role[];
    departments?: Department[];
    selectedEmployeeIds?: number[]; // Already selected employees in other levels
    title?: string;
};

export default function EmployeeSelectionModal({
    isOpen,
    onClose,
    onSelect,
    employees,
    roles,
    departments = [],
    selectedEmployeeIds = [],
    title = "Select Employee",
}: EmployeeSelectionModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Reset filters and pagination when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setSelectedRoleId(null);
            setSelectedDepartmentId(null);
            setShowFilters(false);
            setCurrentPage(1);
        }
    }, [isOpen]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedRoleId, selectedDepartmentId]);

    if (!isOpen) return null;

    // Filter employees
    const filteredEmployees = employees.filter((emp) => {
        // Exclude already selected employees
        if (selectedEmployeeIds.includes(emp.id)) {
            return false;
        }

        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            !searchQuery ||
            emp.first_name.toLowerCase().includes(searchLower) ||
            emp.last_name.toLowerCase().includes(searchLower) ||
            emp.email.toLowerCase().includes(searchLower) ||
            (emp.role_name && emp.role_name.toLowerCase().includes(searchLower));

        // Role filter
        const matchesRole = !selectedRoleId || emp.role_id === selectedRoleId;

        // Department filter
        const matchesDepartment = !selectedDepartmentId || emp.department_id === selectedDepartmentId;

        return matchesSearch && matchesRole && matchesDepartment;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

    const handleSelect = (employeeId: number) => {
        onSelect(employeeId);
        onClose();
    };

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="p-6 border-b border-gray-200 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                        <Filter className="w-4 h-4" />
                        {showFilters ? "Hide Filters" : "Show Filters"}
                    </button>

                    {/* Filters */}
                    {showFilters && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            {/* Role Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Filter by Role
                                </label>
                                <select
                                    value={selectedRoleId || ""}
                                    onChange={(e) =>
                                        setSelectedRoleId(e.target.value ? Number(e.target.value) : null)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">All Roles</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Department Filter */}
                            {departments.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Filter by Department
                                    </label>
                                    <select
                                        value={selectedDepartmentId || ""}
                                        onChange={(e) =>
                                            setSelectedDepartmentId(
                                                e.target.value ? Number(e.target.value) : null
                                            )
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Employee List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredEmployees.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600">
                                {selectedEmployeeIds.length > 0 && employees.length === selectedEmployeeIds.length
                                    ? "All employees are already selected in other levels"
                                    : "No employees found matching your criteria"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {paginatedEmployees.map((emp) => (
                                <button
                                    key={emp.id}
                                    onClick={() => handleSelect(emp.id)}
                                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 group-hover:text-indigo-900">
                                                {emp.first_name} {emp.last_name}
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">{emp.email}</div>
                                            <div className="flex items-center gap-3 mt-2">
                                                {emp.role_name && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {emp.role_name}
                                                    </span>
                                                )}
                                                {emp.department_name && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {emp.department_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            →
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        {/* Results Info */}
                        <span className="text-sm text-gray-600">
                            Showing {filteredEmployees.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} employees
                        </span>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => goToPage(pageNum)}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Cancel Button */}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
