"use client";

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
    Users, Building, Shield, Save, Search,
    UserCheck, ClipboardList, CheckCircle2, ChevronRight,
    MapPin, Settings, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DepartmentMapper() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [mappers, setMappers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState<number | null>(null);

    // Editing state (per department ID)
    const [edits, setEdits] = useState<Record<number, { head_employee_id: number | null, approval_workflow_id: number | null }>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, empRes, wfRes, mapRes] = await Promise.all([
                apiClient.get('/organization/departments', {}, { withAuth: true }),
                apiClient.get('/organization/employees', {}, { withAuth: true }),
                apiClient.get('/approval-workflows/workflows', {}, { withAuth: true }),
                apiClient.get('/department-mappers/list', {}, { withAuth: true })
            ]);

            // departments usually returns direct array or {departments: []}
            const depts = Array.isArray(deptRes) ? deptRes : (deptRes.departments || []);
            setDepartments(depts);

            // employees usually returns array or {data: [], ...}
            setEmployees(Array.isArray(empRes) ? empRes : (empRes.data || empRes.employees || []));

            // workflows usually returns {workflows: []}
            setWorkflows(wfRes.workflows || wfRes.data || []);

            setMappers(mapRes.data || []);

            // Initialize edits from mappers
            const initialEdits: any = {};
            (mapRes.data || []).forEach((m: any) => {
                initialEdits[m.department_id] = {
                    head_employee_id: m.head_employee_id,
                    approval_workflow_id: m.approval_workflow_id
                };
            });
            setEdits(initialEdits);

        } catch (err) {
            console.error(err);
            toast.error('Failed to load mapping data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (deptId: number) => {
        const edit = edits[deptId];
        if (!edit) return;

        setProcessing(deptId);
        try {
            const res = await apiClient.post('/department-mappers/upsert', {
                department_id: deptId,
                head_employee_id: edit.head_employee_id,
                approval_workflow_id: edit.approval_workflow_id
            }, { withAuth: true });

            if (res.success) {
                toast.success('Mapping saved successfully');
                fetchData();
            }
        } catch (err) {
            toast.error('Failed to save mapping');
        } finally {
            setProcessing(null);
        }
    };

    const filteredMappers = mappers.filter(m =>
        m.department_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Users size={32} className="text-blue-600" />
                        Department Mapper
                    </h2>
                    <p className="text-gray-400 font-bold mt-1 uppercase tracking-widest text-[10px]">
                        Link departments to Heads and specific Approval Workflows
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-6 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm w-72 transition-all"
                    />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-1/3">Department</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-1/3">Department Head</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-1/3">Approval Workflow</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={4} className="px-8 py-8 h-20 bg-gray-50/20"></td>
                                </tr>
                            ))
                        ) : filteredMappers.map((mapper) => (
                            <tr key={mapper.department_id} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                            <Building size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{mapper.department_name}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID: #{mapper.department_id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-2">
                                        <select
                                            value={edits[mapper.department_id]?.head_employee_id || ''}
                                            onChange={(e) => setEdits({
                                                ...edits,
                                                [mapper.department_id]: { ...edits[mapper.department_id], head_employee_id: e.target.value ? Number(e.target.value) : null }
                                            })}
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Department Head</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.first_name} {emp.last_name} — {emp.designation || 'Staff'} ({emp.department_name || 'No Dept'})
                                                </option>
                                            ))}
                                        </select>
                                        {mapper.head_first_name && (
                                            <div className="flex flex-col gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-2xl w-fit border border-green-100/50">
                                                <div className="flex items-center gap-1.5">
                                                    <UserCheck size={12} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                                        Current: {mapper.head_first_name} {mapper.head_last_name}
                                                    </span>
                                                </div>
                                                {mapper.head_designation && (
                                                    <div className="text-[9px] font-bold opacity-70 ml-4">
                                                        {mapper.head_designation} — {mapper.head_department_name}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-2">
                                        <select
                                            value={edits[mapper.department_id]?.approval_workflow_id || ''}
                                            onChange={(e) => setEdits({
                                                ...edits,
                                                [mapper.department_id]: { ...edits[mapper.department_id], approval_workflow_id: e.target.value ? Number(e.target.value) : null }
                                            })}
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Approval Workflow</option>
                                            {workflows.map(wf => (
                                                <option key={wf.id} value={wf.id}>{wf.workflow_name} ({wf.request_type})</option>
                                            ))}
                                        </select>
                                        {mapper.workflow_name && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full w-fit">
                                                <Shield size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">
                                                    Current: {mapper.workflow_name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <button
                                        onClick={() => handleUpdate(mapper.department_id)}
                                        disabled={processing === mapper.department_id}
                                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                                    >
                                        {processing === mapper.department_id ? 'Saving...' : <><Save size={14} /> Save</>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!loading && filteredMappers.length === 0 && (
                    <div className="p-20 text-center">
                        <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
                        <h3 className="text-xl font-black text-gray-900">No departments found</h3>
                        <p className="text-gray-400 font-bold mt-1 text-sm">Adjust your search to find more departments.</p>
                    </div>
                )}
            </div>

        </div>
    );
}
