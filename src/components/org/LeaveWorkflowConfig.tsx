"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Plus, X, Trash2, RefreshCw, Save, Settings } from "lucide-react";

type WorkflowLevel = {
    id?: number;
    level_number: number;
    level_name: string;
    approver_type: 'employee' | 'role';
    approver_employee_ids: number[];
    approver_role_id: number | null;
    approval_required_count: number;
    timeline_hours: number | null;
    is_timeline_required: boolean;
    is_final_approver: boolean;
    proceed_to_next_level_even_rejected: boolean;
};

type Workflow = {
    id?: number;
    site_id: number | null;
    workflow_name: string;
    is_active: boolean;
    levels: WorkflowLevel[];
};

export default function LeaveWorkflowConfig() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [saving, setSaving] = useState(false);

    const loadWorkflows = async () => {
        setLoading(true);
        try {
            const res = await apiClient<any>("/leave-workflows/workflows", { method: "GET", withAuth: true });
            setWorkflows(res.workflows || []);
        } catch (e: any) {
            showError(e?.message || "Failed to load workflows");
        } finally {
            setLoading(false);
        }
    };

    const loadSites = async () => {
        try {
            const res = await apiClient<any>("/sites", { method: "GET", withAuth: true });
            setSites(res.sites || []);
        } catch (e) {
            console.error("Failed to load sites");
        }
    };

    const loadEmployees = async (search: string = "", extraIds: number[] = []) => {
        setLoadingEmployees(true);
        try {
            const params: any = { limit: '20' }; // default limit
            if (search) params.search = search;
            if (extraIds.length > 0) params.ids = extraIds.join(',');

            const res = await apiClient<any>("/organization/employees", { method: "GET", withAuth: true, params });

            // Backend returns flat array if not paginated, or object with data/employees if paginated
            // But with query params it might return paginated structure?
            // Let's handle both.
            let newEmps: any[] = [];
            if (Array.isArray(res)) {
                newEmps = res;
            } else {
                newEmps = res.employees || res.data || [];
            }
            setEmployees(newEmps);
        } catch (e) {
            console.error("Failed to load employees", e);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const loadRoles = async () => {
        try {
            const res = await apiClient<any>("/organization/roles", { method: "GET", withAuth: true });
            if (Array.isArray(res)) {
                setRoles(res);
            } else {
                setRoles(res.roles || []);
            }
        } catch (e) {
            console.error("Failed to load roles", e);
        }
    };

    useEffect(() => {
        loadWorkflows();
        loadSites();
        loadEmployees(); // Initial load (top 20)
        loadRoles();
    }, []);

    const openNew = () => {
        setEditingWorkflow({
            site_id: null,
            workflow_name: "",
            is_active: true,
            levels: [
                {
                    level_number: 1,
                    level_name: "Level 1",
                    approver_type: 'employee',
                    approver_employee_ids: [],
                    approver_role_id: null,
                    approval_required_count: 1,
                    timeline_hours: 24,
                    is_timeline_required: false,
                    is_final_approver: false,
                    proceed_to_next_level_even_rejected: false
                }
            ]
        });
        setModalOpen(true);
        loadEmployees(); // Reset list to default
    };

    const openEdit = async (id: number) => {
        try {
            const res = await apiClient<any>(`/leave-workflows/workflows/${id}`, { method: "GET", withAuth: true });
            const workflow = res.workflow;

            // Transform levels and collect all IDs to ensure they are loaded
            const allIds = new Set<number>();
            workflow.levels = workflow.levels.map((l: any) => {
                const ids = l.approver_employee_ids ? l.approver_employee_ids.split(',').map((id: string) => parseInt(id)) : [];
                ids.forEach((id: number) => allIds.add(id));
                return {
                    ...l,
                    approver_employee_ids: ids
                };
            });

            setEditingWorkflow(workflow);
            setModalOpen(true);

            // Fetch these specific employees + default list to ensure they appear in the picker
            // We pass them as 'ids' param? Or do we need a way to say "Search OR IDs"?
            // Our backend `ids` filter is usually exclusive (WHERE id IN ...). 
            // If we want "Top 20 OR Specific IDs", we might need two calls or a smarter backend logic.
            // For now, let's just make two calls and merge, or just use `ids` logic if we have them?
            // Actually, if we use `ids` param, backend returns ONLY those.
            // But we want the user to be able to pick NEW people too (the default list).
            // So we should probably:
            // 1. Load default list.
            // 2. Load missing selected IDs.
            // 3. Merge.

            // Helper to merge unique
            const fetchMerge = async () => {
                setLoadingEmployees(true);
                try {
                    // 1. Top 20
                    const p1 = apiClient<any>("/organization/employees", { method: "GET", withAuth: true, params: { limit: '20' } });
                    // 2. Selected IDs (if any)
                    let p2 = Promise.resolve([]);
                    const idsArr = Array.from(allIds);
                    if (idsArr.length > 0) {
                        p2 = apiClient<any>("/organization/employees", { method: "GET", withAuth: true, params: { ids: idsArr.join(',') } }).then(r => Array.isArray(r) ? r : (r.data || r.employees || []));
                    }

                    const [res1, res2] = await Promise.all([p1, p2]);
                    const list1 = Array.isArray(res1) ? res1 : (res1.data || res1.employees || []);
                    const list2 = Array.isArray(res2) ? res2 : (res2 as any[]);

                    // Merge unique by ID
                    const map = new Map();
                    list1.forEach((e: any) => map.set(e.id, e));
                    list2.forEach((e: any) => map.set(e.id, e));

                    setEmployees(Array.from(map.values()));
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoadingEmployees(false);
                }
            };

            fetchMerge();

        } catch (e: any) {
            showError(e?.message || "Failed to load workflow");
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingWorkflow(null);
    };

    const addLevel = () => {
        if (!editingWorkflow) return;
        const newLevel: WorkflowLevel = {
            level_number: editingWorkflow.levels.length + 1,
            level_name: `Level ${editingWorkflow.levels.length + 1}`,
            approver_type: 'employee',
            approver_employee_ids: [],
            approver_role_id: null,
            approval_required_count: 1,
            timeline_hours: 24,
            is_timeline_required: false,
            is_final_approver: false,
            proceed_to_next_level_even_rejected: false
        };
        setEditingWorkflow({
            ...editingWorkflow,
            levels: [...editingWorkflow.levels, newLevel]
        });
    };

    const removeLevel = (index: number) => {
        if (!editingWorkflow) return;
        const newLevels = editingWorkflow.levels.filter((_, i) => i !== index);
        // Renumber levels
        newLevels.forEach((l, i) => l.level_number = i + 1);
        setEditingWorkflow({
            ...editingWorkflow,
            levels: newLevels
        });
    };

    const updateLevel = (index: number, updates: Partial<WorkflowLevel>) => {
        if (!editingWorkflow) return;
        const newLevels = [...editingWorkflow.levels];
        newLevels[index] = { ...newLevels[index], ...updates };
        setEditingWorkflow({
            ...editingWorkflow,
            levels: newLevels
        });
    };

    const saveWorkflow = async () => {
        if (!editingWorkflow) return;

        if (!editingWorkflow.workflow_name.trim()) {
            showError("Workflow name is required");
            return;
        }

        if (editingWorkflow.levels.length === 0) {
            showError("At least one level is required");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...editingWorkflow,
                levels: editingWorkflow.levels.map(l => ({
                    ...l,
                    approver_employee_ids: l.approver_employee_ids
                }))
            };

            if (editingWorkflow.id) {
                await apiClient<any>(`/leave-workflows/workflows/${editingWorkflow.id}`, {
                    method: "PUT",
                    withAuth: true,
                    body: payload
                });
                showSuccess("Workflow updated successfully");
            } else {
                await apiClient<any>("/leave-workflows/workflows", {
                    method: "POST",
                    withAuth: true,
                    body: payload
                });
                showSuccess("Workflow created successfully");
            }

            closeModal();
            loadWorkflows();
        } catch (e: any) {
            showError(e?.message || "Failed to save workflow");
        } finally {
            setSaving(false);
        }
    };

    const deleteWorkflow = async (id: number) => {
        if (!confirm("Are you sure you want to delete this workflow?")) return;

        try {
            await apiClient<any>(`/leave-workflows/workflows/${id}`, {
                method: "DELETE",
                withAuth: true
            });
            showSuccess("Workflow deleted successfully");
            loadWorkflows();
        } catch (e: any) {
            showError(e?.message || "Failed to delete workflow");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Leave Approval Workflows</h2>
                <button
                    onClick={openNew}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Workflow</span>
                </button>
            </div>

            {/* Workflows List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-gray-500 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                        Loading…
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Site</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Levels</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {workflows.map((w) => (
                                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{w.workflow_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{w.site_name || 'Common'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{w.level_count} levels</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {w.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(w.id)}
                                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteWorkflow(w.id)}
                                                    className="p-1.5 rounded-lg border border-gray-300 text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {workflows.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={5}>
                                            No workflows found. Click "Add Workflow" to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit/Create Modal */}
            {modalOpen && editingWorkflow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingWorkflow.id ? 'Edit Workflow' : 'Create Workflow'}
                            </h3>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
                                    <input
                                        value={editingWorkflow.workflow_name}
                                        onChange={(e) => setEditingWorkflow({ ...editingWorkflow, workflow_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="e.g., Standard Leave Approval"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                                    <select
                                        value={editingWorkflow.site_id || ''}
                                        onChange={(e) => setEditingWorkflow({ ...editingWorkflow, site_id: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Common (All Sites)</option>
                                        {sites.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Levels */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-900">Approval Levels</h4>
                                    <button
                                        onClick={addLevel}
                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        <Plus className="w-3 h-3 inline mr-1" />
                                        Add Level
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {editingWorkflow.levels.map((level, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-900">Level {level.level_number}</span>
                                                {editingWorkflow.levels.length > 1 && (
                                                    <button
                                                        onClick={() => removeLevel(index)}
                                                        className="p-1 rounded text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Level Name</label>
                                                    <input
                                                        value={level.level_name}
                                                        onChange={(e) => updateLevel(index, { level_name: e.target.value })}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                                                        placeholder="e.g., Site Incharge"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Approver Type</label>
                                                    <select
                                                        value={level.approver_type}
                                                        onChange={(e) => updateLevel(index, { approver_type: e.target.value as 'employee' | 'role' })}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                                                    >
                                                        <option value="employee">Employee</option>
                                                        <option value="role">Role</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {level.approver_type === 'employee' ? (
                                                <div>
                                                    <div className="border border-gray-300 rounded-lg p-2 bg-white">
                                                        {/* Search Bar */}
                                                        <input
                                                            type="text"
                                                            placeholder="Search employees..."
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs mb-2"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                // Simple timeout debounce
                                                                if ((window as any).searchTimeout) clearTimeout((window as any).searchTimeout);
                                                                (window as any).searchTimeout = setTimeout(() => {
                                                                    loadEmployees(val); // Re-fetch with search
                                                                }, 400);
                                                            }}
                                                        />

                                                        {/* Checkbox List */}
                                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                                            {loadingEmployees ? (
                                                                <div className="p-2 text-center text-xs text-gray-400">Loading...</div>
                                                            ) : (
                                                                <>
                                                                    {/* Ensure selected employees are always shown at the top or in the list */}
                                                                    {/* We merge 'employees' (search results) with any 'selected' employees not in the results */}
                                                                    {/* First, let's just iterate over available list. We need to handle 'missing' selected employees separately or ensure they are fetched. */}

                                                                    {employees.map(emp => (
                                                                        <label key={emp.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={level.approver_employee_ids.includes(emp.id)}
                                                                                onChange={(e) => {
                                                                                    const isChecked = e.target.checked;
                                                                                    let newIds = [...level.approver_employee_ids];
                                                                                    if (isChecked) {
                                                                                        newIds.push(emp.id);
                                                                                    } else {
                                                                                        newIds = newIds.filter(id => id !== emp.id);
                                                                                    }
                                                                                    updateLevel(index, { approver_employee_ids: newIds });
                                                                                }}
                                                                                className="rounded border-gray-300 w-3.5 h-3.5"
                                                                            />
                                                                            <div className="text-xs">
                                                                                <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                                                                                <div className="text-gray-500 text-[10px]">{emp.email}</div>
                                                                            </div>
                                                                        </label>
                                                                    ))}
                                                                    {employees.length === 0 && (
                                                                        <div className="text-xs text-center text-gray-500 py-2">No employees found</div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                                    <select
                                                        value={level.approver_role_id || ''}
                                                        onChange={(e) => updateLevel(index, { approver_role_id: e.target.value ? parseInt(e.target.value) : null })}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                                                    >
                                                        <option value="">Select Role</option>
                                                        {roles.map(role => (
                                                            <option key={role.id} value={role.id}>{role.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="text-xs font-medium text-gray-700">Timeline (hours)</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={level.is_timeline_required}
                                                                    onChange={(e) => updateLevel(index, { is_timeline_required: e.target.checked })}
                                                                    className="rounded w-3 h-3 text-indigo-600 focus:ring-0"
                                                                />
                                                                <span className="text-[10px] text-gray-500">Enable</span>
                                                            </label>
                                                        </div>
                                                        {level.is_timeline_required && (
                                                            <input
                                                                type="number"
                                                                value={level.timeline_hours || ''}
                                                                onChange={(e) => updateLevel(index, { timeline_hours: e.target.value ? parseFloat(e.target.value) : null })}
                                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                                                                placeholder="24"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 pt-5">
                                                    <label className="flex items-center gap-1.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={level.is_final_approver}
                                                            onChange={(e) => updateLevel(index, { is_final_approver: e.target.checked })}
                                                            className="rounded"
                                                        />
                                                        <span className="text-xs text-gray-700">Final Approver</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={level.proceed_to_next_level_even_rejected}
                                                            onChange={(e) => updateLevel(index, { proceed_to_next_level_even_rejected: e.target.checked })}
                                                            className="rounded"
                                                        />
                                                        <span className="text-xs text-gray-700">Proceed if Rejected</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveWorkflow}
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>{saving ? 'Saving…' : 'Save Workflow'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
