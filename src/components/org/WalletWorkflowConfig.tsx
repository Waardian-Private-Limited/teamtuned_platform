"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Settings, Save, AlertCircle, RefreshCw, Users } from "lucide-react";
import EmployeeSelectionModal from "./EmployeeSelectionModal";

type WorkflowLevel = {
    order: number;
    approver_type: "role" | "employee";
    approver_role_id: number | null;
    approver_employee_id: number | null;
    approver_employee_ids?: number[] | null;
    type: "MANDATORY" | "CONDITIONAL";
    condition?: string;
    can_finalize_budget?: boolean;
};

type WorkflowDefinition = {
    workflowName: string;
    levels: WorkflowLevel[];
};

type Workflow = {
    id?: number;
    site_wallet_id: number | null;
    workflow_name: string;
    workflow_type: "expense" | "budget";
    is_common: boolean;
    workflow_definition: WorkflowDefinition;
};

type WorkflowDesignerProps = {
    workflow: WorkflowDefinition;
    onChange: (workflow: WorkflowDefinition) => void;
    workflowType: "expense" | "budget";
    disabled?: boolean;
};

function WorkflowDesigner({ workflow, onChange, workflowType, disabled = false }: WorkflowDesignerProps) {
    const [roles, setRoles] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeeCache, setEmployeeCache] = useState<Map<number, any>>(new Map()); // Cache for selected employees
    const [departments, setDepartments] = useState<any[]>([]);
    const [levels, setLevels] = useState<WorkflowLevel[]>([]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [currentLevelIndex, setCurrentLevelIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchWorkflowOptions();
        fetchDepartments();
        if (workflow && workflow.levels) {
            setLevels(workflow.levels);
        }
    }, []);

    const fetchWorkflowOptions = async () => {
        try {
            const data = await apiClient<{ roles: any[]; departments: any[] }>(
                "/wallet-workflow/options",
                { withAuth: true }
            );
            setRoles(data.roles || []);
            setDepartments(data.departments || []);
        } catch (error) {
            console.error("Failed to fetch workflow options:", error);
            showError("Failed to load roles and employees");
        }
    };

    // Fetch employees with server-side filtering
    const fetchEmployees = async (params?: {
        search?: string;
        role_id?: number;
        department_id?: number;
        page?: number;
        limit?: number;
    }) => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.search) queryParams.append('search', params.search);
            if (params?.role_id) queryParams.append('role_id', params.role_id.toString());
            if (params?.department_id) queryParams.append('department_id', params.department_id.toString());
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());

            const data = await apiClient<{
                employees: any[];
                pagination: { page: number; limit: number; total: number; totalPages: number };
            }>(
                `/wallet-workflow/options?${queryParams.toString()}`,
                { withAuth: true }
            );
            return data;
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            throw error;
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await apiClient<{ departments: any[] }>(
                "/organization/departments",
                { withAuth: true }
            );
            setDepartments(data.departments || []);
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        }
    };

    // Get already selected employee IDs (excluding current level being edited)
    const getSelectedEmployeeIds = (excludeIndex?: number) => {
        const ids: number[] = [];
        levels.forEach((level, index) => {
            if (index !== excludeIndex && level.approver_type === "employee") {
                if (level.approver_employee_id) ids.push(level.approver_employee_id);
                if (level.approver_employee_ids) {
                    level.approver_employee_ids.forEach(id => {
                        if (!ids.includes(id)) ids.push(id);
                    });
                }
            }
        });
        return ids;
    };

    const addLevel = () => {
        const newLevel: WorkflowLevel = {
            order: levels.length + 1,
            approver_type: "role",
            approver_role_id: null,
            approver_employee_id: null,
            type: "MANDATORY",
            can_finalize_budget: false,
        };
        const updatedLevels = [...levels, newLevel];
        setLevels(updatedLevels);
        onChange({ ...workflow, levels: updatedLevels });
    };

    const removeLevel = (index: number) => {
        const updatedLevels = levels.filter((_, i) => i !== index);
        // Reorder
        updatedLevels.forEach((level, i) => {
            level.order = i + 1;
        });
        setLevels(updatedLevels);
        onChange({ ...workflow, levels: updatedLevels });
    };

    const updateLevel = (index: number, field: string, value: any) => {
        updateLevelMultiple(index, { [field]: value });
    };

    const updateLevelMultiple = (index: number, updates: Partial<WorkflowLevel>) => {
        const updatedLevels = [...levels];
        updatedLevels[index] = { ...updatedLevels[index], ...updates };

        // Clear the other approver field when switching types
        if (updates.approver_type) {
            if (updates.approver_type === "role") {
                updatedLevels[index].approver_employee_id = null;
                updatedLevels[index].approver_employee_ids = null;
            } else {
                updatedLevels[index].approver_role_id = null;
            }
        }

        setLevels(updatedLevels);
        onChange({ ...workflow, levels: updatedLevels });
    };

    const openEmployeeModal = (index: number) => {
        setCurrentLevelIndex(index);
        setShowEmployeeModal(true);
    };

    const handleEmployeeSelect = (employeeId: number) => {
        // This is now for single select fallback or internal use
        if (currentLevelIndex !== null) {
            updateLevelMultiple(currentLevelIndex, {
                approver_employee_id: employeeId,
                approver_employee_ids: [employeeId]
            });
        }
    };

    const handleEmployeesSelect = (employeeIds: number[]) => {
        if (currentLevelIndex !== null) {
            updateLevelMultiple(currentLevelIndex, {
                approver_employee_ids: employeeIds,
                // Backward compatibility: set the first one to approver_employee_id
                approver_employee_id: employeeIds[0] || null
            });
        }
    };

    // Update employee cache when employees are fetched
    const updateEmployeeCache = (newEmployees: any[]) => {
        setEmployeeCache(prev => {
            const updated = new Map(prev);
            newEmployees.forEach(emp => {
                updated.set(emp.id, emp);
            });
            return updated;
        });
    };

    // Fetch employee details by IDs to populate cache
    const fetchEmployeesByIds = async (ids: number[]) => {
        if (ids.length === 0) return;

        try {
            // Fetch employees by IDs - we'll use the search endpoint with no filters
            // This is a workaround since we don't have a dedicated endpoint for fetching by IDs
            const data = await fetchEmployees({ limit: 100 });
            if (data?.employees) {
                updateEmployeeCache(data.employees);
            }
        } catch (error) {
            console.error("Failed to fetch employee details:", error);
        }
    };

    const getEmployeeName = (employeeId: number | null) => {
        if (!employeeId) return "Select employee...";
        // Check cache first
        const cached = employeeCache.get(employeeId);
        if (cached) return `${cached.first_name} ${cached.last_name}`;
        // Fallback to current employees list
        const emp = employees.find((e) => e.id === employeeId);
        if (emp) {
            updateEmployeeCache([emp]); // Add to cache
            return `${emp.first_name} ${emp.last_name}`;
        }
        return `Employee #${employeeId}`; // Show ID instead of "Unknown"
    };

    const getEmployeeNames = (employeeIds: number[] | null | undefined) => {
        if (!employeeIds || employeeIds.length === 0) return "Select employees...";
        if (employeeIds.length === 1) return getEmployeeName(employeeIds[0]);

        // Get names from cache
        const names = employeeIds.map(id => {
            const cached = employeeCache.get(id);
            if (cached) return `${cached.first_name} ${cached.last_name}`;
            const emp = employees.find(e => e.id === id);
            if (emp) {
                updateEmployeeCache([emp]);
                return `${emp.first_name} ${emp.last_name}`;
            }
            return null;
        }).filter(Boolean);

        if (names.length === 0) return `${employeeIds.length} employees selected`;
        if (names.length <= 2) return names.join(", ");
        return `${names[0]}, ${names[1]} +${employeeIds.length - 2} more`;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Approval Workflow</h3>
                <button
                    type="button"
                    onClick={addLevel}
                    disabled={disabled}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    + Add Level
                </button>
            </div>

            {levels.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600">No approval levels configured. Click "Add Level" to create workflow.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {levels.map((level, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                                    {level.order}
                                </div>
                                <span className="font-semibold text-gray-900">Level {level.order}</span>
                                <button
                                    type="button"
                                    onClick={() => removeLevel(index)}
                                    disabled={disabled}
                                    className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Remove
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Approver Type</label>
                                    <select
                                        value={level.approver_type || "role"}
                                        onChange={(e) => updateLevel(index, "approver_type", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="role">By Role</option>
                                        <option value="employee">Specific Employee</option>
                                    </select>
                                </div>

                                {level.approver_type === "role" ? (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Select Role</label>
                                        <select
                                            value={level.approver_role_id || ""}
                                            onChange={(e) => updateLevel(index, "approver_role_id", Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select role...</option>
                                            {roles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Select Employee(s)</label>
                                        <button
                                            type="button"
                                            onClick={() => openEmployeeModal(index)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between"
                                        >
                                            <span className={(level.approver_employee_ids?.length || level.approver_employee_id) ? "text-gray-900" : "text-gray-500"}>
                                                {getEmployeeNames(level.approver_employee_ids || (level.approver_employee_id ? [level.approver_employee_id] : []))}
                                            </span>
                                            <Users className="w-4 h-4 text-gray-400" />
                                        </button>
                                        {level.approver_employee_ids && level.approver_employee_ids.length > 0 && (
                                            <div className="mt-2">
                                                <div className="text-xs font-medium text-gray-700 mb-1">Selected Approvers:</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {level.approver_employee_ids.map(id => {
                                                        const emp = employeeCache.get(id) || employees.find(e => e.id === id);
                                                        return (
                                                            <div key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold">
                                                                        {emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${id}`}
                                                                    </span>
                                                                    {emp?.department_name && (
                                                                        <span className="text-[10px] text-indigo-600">
                                                                            {emp.department_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Level Type</label>
                                    <select
                                        value={level.type || "MANDATORY"}
                                        onChange={(e) => updateLevel(index, "type", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="MANDATORY">Mandatory</option>
                                        <option value="CONDITIONAL">Conditional</option>
                                    </select>
                                </div>

                                {level.type === "CONDITIONAL" && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
                                        <input
                                            type="text"
                                            value={level.condition || ""}
                                            onChange={(e) => updateLevel(index, "condition", e.target.value)}
                                            placeholder="e.g., amount > 10000"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {workflowType === "budget" && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={level.can_finalize_budget || false}
                                            onChange={(e) => updateLevel(index, "can_finalize_budget", e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Can Finalize Budget</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">
                                        Approver at this level can give final approval, skipping remaining levels
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Employee Selection Modal */}
            <EmployeeSelectionModal
                isOpen={showEmployeeModal}
                onClose={() => setShowEmployeeModal(false)}
                onSelect={(employeeId) => {
                    handleEmployeeSelect(employeeId);
                }}
                onSelectMultiple={(employeeIds) => {
                    handleEmployeesSelect(employeeIds);
                }}
                isMultiSelect={true}
                fetchEmployees={fetchEmployees}
                roles={roles}
                departments={departments}
                selectedEmployeeIds={getSelectedEmployeeIds(currentLevelIndex ?? undefined)}
                initialSelectedIds={currentLevelIndex !== null ? (levels[currentLevelIndex].approver_employee_ids || (levels[currentLevelIndex].approver_employee_id ? [levels[currentLevelIndex].approver_employee_id] : [])) : []}
                title="Select Approvers"
                onEmployeesLoaded={(emps) => updateEmployeeCache(emps)} // Update cache when employees are loaded
            />
        </div>
    );
}

export default function WalletWorkflowConfig() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<"expense" | "budget">("expense");

    const [expenseWorkflow, setExpenseWorkflow] = useState<Workflow>({
        site_wallet_id: null,
        workflow_name: "Expense Approval",
        workflow_type: "expense",
        is_common: true,
        workflow_definition: { workflowName: "Expense Approval", levels: [] },
    });

    const [budgetWorkflow, setBudgetWorkflow] = useState<Workflow>({
        site_wallet_id: null,
        workflow_name: "Budget Approval",
        workflow_type: "budget",
        is_common: true,
        workflow_definition: { workflowName: "Budget Approval", levels: [] },
    });

    const [useSameAsExpense, setUseSameAsExpense] = useState(false);

    // Wallet-specific state
    const [siteWallets, setSiteWallets] = useState<any[]>([]);
    const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
    const [loadingWallets, setLoadingWallets] = useState(false);

    // Edit mode state
    const [isEditingExpense, setIsEditingExpense] = useState(false);
    const [isEditingBudget, setIsEditingBudget] = useState(false);

    useEffect(() => {
        fetchWorkflows();
        fetchSiteWallets();
    }, []);

    // Fetch site wallets
    const fetchSiteWallets = async () => {
        setLoadingWallets(true);
        try {
            const data = await apiClient<{ wallets: any[] }>(
                "/site-wallets",
                { withAuth: true }
            );
            setSiteWallets(data.wallets || []);
        } catch (error) {
            console.error("Failed to fetch site wallets:", error);
            showError("Failed to load site wallets");
        } finally {
            setLoadingWallets(false);
        }
    };

    // When common workflow is toggled, reset selected wallet
    useEffect(() => {
        if (expenseWorkflow.is_common) {
            setSelectedWalletId(null);
        }
    }, [expenseWorkflow.is_common]);

    useEffect(() => {
        if (budgetWorkflow.is_common) {
            setSelectedWalletId(null);
        }
    }, [budgetWorkflow.is_common]);

    useEffect(() => {
        fetchWorkflows();
    }, []);

    // Copy expense workflow to budget when useSameAsExpense is enabled
    useEffect(() => {
        if (useSameAsExpense) {
            setBudgetWorkflow({
                ...budgetWorkflow,
                is_common: expenseWorkflow.is_common,
                workflow_definition: {
                    workflowName: "Budget Approval",
                    levels: expenseWorkflow.workflow_definition.levels.map(level => ({
                        ...level,
                        can_finalize_budget: level.can_finalize_budget || false,
                    })),
                },
            });
        }
    }, [useSameAsExpense, expenseWorkflow.workflow_definition, expenseWorkflow.is_common]);

    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            // Determine which wallet ID to use
            const walletId = selectedWalletId || 0;

            // Fetch expense workflow
            const expenseData = await apiClient<{ workflow: Workflow | null }>(
                `/wallet-workflow/expense/${walletId}`,
                { withAuth: true }
            );
            if (expenseData.workflow) {
                setExpenseWorkflow(expenseData.workflow);
            } else {
                // Reset to default if no workflow found - default to NOT common
                setExpenseWorkflow({
                    site_wallet_id: selectedWalletId,
                    workflow_name: "Expense Approval",
                    workflow_type: "expense",
                    is_common: false, // Default to per-wallet workflow
                    workflow_definition: { workflowName: "Expense Approval", levels: [] },
                });
            }

            // Fetch budget workflow
            const budgetData = await apiClient<{ workflow: Workflow | null }>(
                `/wallet-workflow/budget/${walletId}`,
                { withAuth: true }
            );
            if (budgetData.workflow) {
                setBudgetWorkflow(budgetData.workflow);
            } else {
                // Reset to default if no workflow found - default to NOT common
                setBudgetWorkflow({
                    site_wallet_id: selectedWalletId,
                    workflow_name: "Budget Approval",
                    workflow_type: "budget",
                    is_common: false, // Default to per-wallet workflow
                    workflow_definition: { workflowName: "Budget Approval", levels: [] },
                });
            }
        } catch (error) {
            console.error("Failed to fetch workflows:", error);
            showError("Failed to load workflows");
        } finally {
            setLoading(false);
        }
    };

    // Refetch workflows when selected wallet changes
    useEffect(() => {
        if (!expenseWorkflow.is_common || !budgetWorkflow.is_common) {
            fetchWorkflows();
        }
    }, [selectedWalletId]);

    const handleSaveExpense = async () => {
        setSaving(true);
        try {
            const walletId = selectedWalletId || 0;
            await apiClient(`/wallet-workflow/expense/${walletId}`, {
                method: "POST",
                withAuth: true,
                body: {
                    workflow_name: expenseWorkflow.workflow_name,
                    is_common: expenseWorkflow.is_common,
                    workflow_definition: expenseWorkflow.workflow_definition,
                },
            });
            showSuccess("Expense workflow saved successfully");
            setIsEditingExpense(false); // Exit edit mode
            fetchWorkflows();
        } catch (error: any) {
            showError(error.message || "Failed to save expense workflow");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBudget = async () => {
        setSaving(true);
        try {
            const walletId = selectedWalletId || 0;
            await apiClient(`/wallet-workflow/budget/${walletId}`, {
                method: "POST",
                withAuth: true,
                body: {
                    workflow_name: budgetWorkflow.workflow_name,
                    is_common: budgetWorkflow.is_common,
                    workflow_definition: budgetWorkflow.workflow_definition,
                },
            });
            showSuccess("Budget workflow saved successfully");
            setIsEditingBudget(false); // Exit edit mode
            fetchWorkflows();
        } catch (error: any) {
            showError(error.message || "Failed to save budget workflow");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading workflows...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setTab("expense")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "expense" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                >
                    Expense Workflow
                </button>
                <button
                    onClick={() => setTab("budget")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "budget" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                >
                    Budget Workflow
                </button>
            </div>

            {/* Expense Workflow */}
            {tab === "expense" && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Expense Approval Workflow</h2>
                            <p className="text-sm text-gray-600">Configure multi-level approval workflow for expense submissions.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isEditingExpense ? (
                                <button
                                    onClick={() => setIsEditingExpense(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                >
                                    Edit Workflow
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsEditingExpense(false);
                                        fetchWorkflows(); // Reload to discard changes
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={expenseWorkflow.is_common}
                                onChange={(e) => setExpenseWorkflow({ ...expenseWorkflow, is_common: e.target.checked })}
                                disabled={!isEditingExpense}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div>
                                <div className="font-medium text-gray-900">Use Common Workflow for All Sites</div>
                                <div className="text-sm text-gray-600">Apply this workflow to all site wallets</div>
                            </div>
                        </label>
                    </div>

                    {/* Wallet Selection - Show when common workflow is disabled */}
                    {!expenseWorkflow.is_common && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Wallet</h3>
                            {loadingWallets ? (
                                <div className="p-4 text-center text-gray-600">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                    Loading wallets...
                                </div>
                            ) : siteWallets.length === 0 ? (
                                <div className="p-4 text-center bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-gray-600">No site wallets found. Please create a wallet first.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {siteWallets.map((wallet) => (
                                        <button
                                            key={wallet.id}
                                            onClick={() => setSelectedWalletId(wallet.id)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${selectedWalletId === wallet.id
                                                ? "border-indigo-600 bg-indigo-50 shadow-sm"
                                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                                }`}
                                        >
                                            <div className="font-semibold text-gray-900 mb-1">{wallet.name}</div>
                                            <div className="text-sm text-gray-600 mb-2">
                                                Site: {wallet.site_name || `Site #${wallet.site_id}`}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Balance: {wallet.currency} {Number(wallet.current_balance || 0).toFixed(2)}
                                            </div>
                                            {selectedWalletId === wallet.id && (
                                                <div className="mt-2 text-xs font-medium text-indigo-600">
                                                    ✓ Selected
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedWalletId && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        Configuring workflow for:{" "}
                                        <span className="font-semibold">
                                            {siteWallets.find(w => w.id === selectedWalletId)?.name}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <WorkflowDesigner
                        workflow={expenseWorkflow.workflow_definition}
                        onChange={(def) => setExpenseWorkflow({ ...expenseWorkflow, workflow_definition: def })}
                        workflowType="expense"
                        disabled={!isEditingExpense}
                    />

                    {isEditingExpense && (
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsEditingExpense(false);
                                    fetchWorkflows();
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveExpense}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? "Saving..." : "Save Workflow"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Budget Workflow */}
            {tab === "budget" && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Budget Approval Workflow</h2>
                            <p className="text-sm text-gray-600">Configure multi-level approval workflow for budget submissions.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isEditingBudget ? (
                                <button
                                    onClick={() => setIsEditingBudget(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                >
                                    Edit Workflow
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsEditingBudget(false);
                                        fetchWorkflows(); // Reload to discard changes
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        {/* Use Same as Expense Toggle */}
                        <label className="flex items-center gap-3 p-3 border border-indigo-200 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={useSameAsExpense}
                                onChange={(e) => {
                                    setUseSameAsExpense(e.target.checked);
                                    if (!e.target.checked) {
                                        // Reset to original budget workflow when disabled
                                        setBudgetWorkflow({
                                            ...budgetWorkflow,
                                            workflow_definition: { workflowName: "Budget Approval", levels: [] },
                                        });
                                    }
                                }}
                                disabled={!isEditingBudget}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div>
                                <div className="font-medium text-indigo-900">Use Same as Expense Workflow</div>
                                <div className="text-sm text-indigo-700">Automatically copy expense workflow configuration to budget workflow</div>
                            </div>
                        </label>

                        {/* Common Workflow Toggle - Only show if not using same as expense */}
                        {!useSameAsExpense && (
                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={budgetWorkflow.is_common}
                                    onChange={(e) => setBudgetWorkflow({ ...budgetWorkflow, is_common: e.target.checked })}
                                    disabled={!isEditingBudget}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <div>
                                    <div className="font-medium text-gray-900">Use Common Workflow for All Sites</div>
                                    <div className="text-sm text-gray-600">Apply this workflow to all site wallets</div>
                                </div>
                            </label>
                        )}
                    </div>

                    {/* Wallet Selection - Show when common workflow is disabled and not using same as expense */}
                    {!budgetWorkflow.is_common && !useSameAsExpense && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Wallet</h3>
                            {loadingWallets ? (
                                <div className="p-4 text-center text-gray-600">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                    Loading wallets...
                                </div>
                            ) : siteWallets.length === 0 ? (
                                <div className="p-4 text-center bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-gray-600">No site wallets found. Please create a wallet first.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {siteWallets.map((wallet) => (
                                        <button
                                            key={wallet.id}
                                            onClick={() => setSelectedWalletId(wallet.id)}
                                            disabled={!isEditingBudget}
                                            className={`p-4 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${selectedWalletId === wallet.id
                                                ? "border-indigo-600 bg-indigo-50 shadow-sm"
                                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                                }`}
                                        >
                                            <div className="font-semibold text-gray-900 mb-1">{wallet.name}</div>
                                            <div className="text-sm text-gray-600 mb-2">
                                                Site: {wallet.site_name || `Site #${wallet.site_id}`}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Balance: {wallet.currency} {Number(wallet.current_balance || 0).toFixed(2)}
                                            </div>
                                            {selectedWalletId === wallet.id && (
                                                <div className="mt-2 text-xs font-medium text-indigo-600">
                                                    ✓ Selected
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedWalletId && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        Configuring workflow for:{" "}
                                        <span className="font-semibold">
                                            {siteWallets.find(w => w.id === selectedWalletId)?.name}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Show info message when using same as expense */}
                    {useSameAsExpense && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <div className="font-medium text-blue-900 mb-1">Using Expense Workflow Configuration</div>
                                    <div className="text-sm text-blue-700">
                                        Budget workflow is automatically synchronized with expense workflow.
                                        Any changes to expense workflow will be reflected here.
                                        You can still customize "Can Finalize Budget" settings for each level.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Workflow Designer - Show even when using same as expense to allow finalization customization */}
                    <WorkflowDesigner
                        workflow={budgetWorkflow.workflow_definition}
                        onChange={(def) => {
                            if (!useSameAsExpense) {
                                setBudgetWorkflow({ ...budgetWorkflow, workflow_definition: def });
                            } else {
                                // When using same as expense, only allow updating can_finalize_budget
                                setBudgetWorkflow({ ...budgetWorkflow, workflow_definition: def });
                            }
                        }}
                        workflowType="budget"
                        disabled={!isEditingBudget}
                    />

                    {isEditingBudget && (
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsEditingBudget(false);
                                    fetchWorkflows();
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveBudget}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? "Saving..." : "Save Workflow"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
