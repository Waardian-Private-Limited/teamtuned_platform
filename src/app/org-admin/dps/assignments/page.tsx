"use client";

import React, { useEffect, useState } from 'react';
import { UserPlus, Building, CheckCircle2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DpsAssignmentsPage() {
    const router = useRouter();
    const [sites, setSites] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<Record<number, any[]>>({});
    const [loading, setLoading] = useState(true);

    // modal states
    const [assignModal, setAssignModal] = useState<any>(null); // holds site object
    const [selectedEmployee, setSelectedEmployee] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const [sitesRes, empRes] = await Promise.all([
                apiClient<any>('/dps-schedule/sites', { method: 'GET', withAuth: true }),
                apiClient<any>('/organization/employees', { method: 'GET', withAuth: true })
            ]);

            const fetchedSites = sitesRes?.sites || [];
            setSites(fetchedSites);

            if (Array.isArray(empRes)) {
                setEmployees(empRes);
            } else if (empRes?.employees) {
                setEmployees(empRes.employees);
            } else if (empRes?.data) {
                setEmployees(empRes.data);
            }

            // fetch assignments for all sites
            const assignmentsMap: Record<number, any[]> = {};
            for (let site of fetchedSites) {
                const asgRes = await apiClient<any>(`/dps-schedule/${site.id}/assignments`, { method: 'GET', withAuth: true });
                if (asgRes?.employees) {
                    assignmentsMap[site.id] = asgRes.employees;
                }
            }
            setAssignments(assignmentsMap);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedEmployee || !assignModal) return;
        try {
            const { apiClient } = await import('@/lib/apiClient');
            await apiClient(`/dps-schedule/${assignModal.id}/assign`, {
                method: 'POST',
                withAuth: true,
                body: { siteId: assignModal.id, employeeId: Number(selectedEmployee) }
            });
            alert('Employee assigned successfully');
            setAssignModal(null);
            setSelectedEmployee('');
            fetchInitialData(); // fresh load to see the updated assignment
        } catch (error) {
            alert('Failed to assign employee. They might already be assigned.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-10">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <UserPlus className="text-blue-600" size={40} />
                        DPS Plan Assignments
                    </h1>
                    <p className="text-gray-500 text-lg font-medium">Assign employees to handle daily target updates for Site DPS Schedules.</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[2fr_2fr_1fr] gap-4 p-6 bg-gray-50/50 border-b border-gray-100 font-bold text-xs text-gray-400 uppercase tracking-wider">
                    <div className="pl-4">Site Name</div>
                    <div>Assigned Employees</div>
                    <div className="text-right pr-4">Actions</div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : sites.length === 0 ? (
                    <div className="text-center p-20 text-gray-400 font-medium">
                        No sites found.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {sites.map(site => (
                            <div key={site.id} className="grid grid-cols-[2fr_2fr_1fr] gap-4 p-6 hover:bg-blue-50/50 transition-colors items-center">
                                <div className="pl-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Building size={16} className="text-gray-400" />
                                        {site.name}
                                    </h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {assignments[site.id]?.length > 0 ? (
                                        assignments[site.id].map((emp: any) => (
                                            <span key={emp.id} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> {emp.first_name} {emp.last_name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-gray-400 text-sm italic py-1">Unassigned</span>
                                    )}
                                </div>
                                <div className="text-right pr-4">
                                    <button
                                        onClick={() => setAssignModal(site)}
                                        className="px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
                                    >
                                        Assign Engineer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Modal */}
            {assignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <UserPlus className="text-blue-600" />
                                Assign to {assignModal.name}
                            </h2>
                            <button onClick={() => setAssignModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 bg-gray-50/50">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Select Employee</label>
                                <select
                                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-black outline-none font-medium text-gray-700"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                >
                                    <option value="">Choose an employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} - {emp.designation || 'No Designation'}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setAssignModal(null)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedEmployee}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
