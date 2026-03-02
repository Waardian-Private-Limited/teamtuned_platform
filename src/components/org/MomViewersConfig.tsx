"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Users, Plus, Trash2, Shield, Eye } from "lucide-react";
import EmployeeSelectionModal from "./EmployeeSelectionModal";

type MomViewer = {
    id: number;
    employee_id: number;
    employee_name: string;
    designation: string | null;
    department_name: string | null;
    can_view_all: boolean;
    can_approve: boolean;
};

export default function MomViewersConfig() {
    const [viewers, setViewers] = useState<MomViewer[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
    const [canViewAll, setCanViewAll] = useState(true);
    const [canApprove, setCanApprove] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [viewersData, employeesData, rolesData, departmentsData] = await Promise.all([
                apiClient<MomViewer[]>('/meetings/config/viewers', { withAuth: true }),
                apiClient<{ employees: any[] }>('/organization/employees', { withAuth: true }),
                apiClient<{ roles: any[] }>('/wallet-workflow/options', { withAuth: true }),
                apiClient<{ departments: any[] }>('/organization/departments', { withAuth: true }),
            ]);

            setViewers(Array.isArray(viewersData) ? viewersData : []);
            setEmployees(Array.isArray(employeesData) ? employeesData : employeesData?.employees || []);
            setRoles(Array.isArray(rolesData) ? rolesData : rolesData?.roles || []);
            setDepartments(Array.isArray(departmentsData) ? departmentsData : departmentsData?.departments || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            showError('Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeSelect = (employeeId: number) => {
        setSelectedEmployee(employeeId);
        setShowEmployeeModal(false);
        setShowPermissionsModal(true);
    };

    const handleAddViewer = async () => {
        if (!selectedEmployee) {
            showError('Please select an employee');
            return;
        }

        setSaving(true);
        try {
            await apiClient('/meetings/config/viewers', {
                method: 'POST',
                withAuth: true,
                body: {
                    employee_id: selectedEmployee,
                    can_view_all: canViewAll,
                    can_approve: canApprove,
                },
            });

            showSuccess('MoM viewer added successfully');
            setShowPermissionsModal(false);
            setSelectedEmployee(null);
            setCanViewAll(true);
            setCanApprove(false);
            fetchData();
        } catch (error: any) {
            showError(error.message || 'Failed to add viewer');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveViewer = async (id: number) => {
        if (!confirm('Are you sure you want to remove this viewer?')) return;

        try {
            await apiClient(`/meetings/config/viewers/${id}`, {
                method: 'DELETE',
                withAuth: true,
            });

            showSuccess('Viewer removed successfully');
            fetchData();
        } catch (error: any) {
            showError(error.message || 'Failed to remove viewer');
        }
    };

    const selectedEmployeeIds = viewers.map(v => v.employee_id);
    const selectedEmployeeName = selectedEmployee
        ? employees.find(e => e.id === selectedEmployee)?.first_name + ' ' + employees.find(e => e.id === selectedEmployee)?.last_name
        : '';

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading configuration...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">MoM Viewers Configuration</h2>
                        <p className="text-sm text-gray-600">
                            Configure which employees can view all meetings and approve meeting minutes.
                            <br />
                            <span className="text-xs text-gray-500">Note: Assigned employees can always view their assigned meetings.</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowEmployeeModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Viewer
                    </button>
                </div>

                {viewers.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No MoM viewers configured yet.</p>
                        <p className="text-sm text-gray-500 mt-1">Click "Add Viewer" to configure who can view and approve meetings.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {viewers.map((viewer) => (
                            <div
                                key={viewer.id}
                                className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{viewer.employee_name}</div>
                                        <div className="text-sm text-gray-600">
                                            {viewer.designation && <span>{viewer.designation}</span>}
                                            {viewer.designation && viewer.department_name && <span> • </span>}
                                            {viewer.department_name && <span>{viewer.department_name}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        {viewer.can_view_all && (
                                            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                <Eye className="w-3 h-3" />
                                                View All
                                            </div>
                                        )}
                                        {viewer.can_approve && (
                                            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                <Shield className="w-3 h-3" />
                                                Can Approve
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveViewer(viewer.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Employee Selection Modal */}
            <EmployeeSelectionModal
                isOpen={showEmployeeModal}
                onClose={() => setShowEmployeeModal(false)}
                onSelect={handleEmployeeSelect}
                employees={employees}
                roles={roles}
                departments={departments}
                selectedEmployeeIds={selectedEmployeeIds}
                title="Select MoM Viewer"
            />

            {/* Permissions Configuration Modal */}
            {showPermissionsModal && (
                <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Permissions</h3>

                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Selected Employee:</div>
                            <div className="font-semibold text-gray-900">{selectedEmployeeName}</div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={canViewAll}
                                    onChange={(e) => setCanViewAll(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="font-medium text-gray-900">Can View All Meetings</div>
                                    <div className="text-sm text-gray-600">Employee can see all meetings in the organization</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={canApprove}
                                    onChange={(e) => setCanApprove(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="font-medium text-gray-900">Can Approve MoM's</div>
                                    <div className="text-sm text-gray-600">Employee can approve and finalize meeting minutes</div>
                                </div>
                            </label>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setShowPermissionsModal(false);
                                    setSelectedEmployee(null);
                                    setCanViewAll(true);
                                    setCanApprove(false);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddViewer}
                                disabled={!selectedEmployee || saving}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Adding...' : 'Add Viewer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
