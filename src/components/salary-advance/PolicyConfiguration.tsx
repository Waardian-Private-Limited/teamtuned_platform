"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Settings, Save, AlertCircle, DollarSign, Shield } from "lucide-react";

type Policy = {
    id?: number;
    max_percentage_of_earned_salary: number | null;
    max_requests_per_month: number | null;
    min_employment_days: number | null;
    min_request_amount: number | null;
    max_request_amount: number | null;
    workflow_definition: any;
    effective_from: string | null;
    effective_to: string | null;
    // Enhanced fields
    allow_only_earned_amount: boolean;
    repayment_mode: 'salary_deduction' | 'manual' | 'both';
    repayment_percentage: number | null;
    interest_enabled: boolean;
    interest_rate_percentage: number | null;
    max_repayment_months: number;
    allow_multiple_requests: boolean;
    multiple_requests_mode: 'combine' | 'separate';
    // Advanced EMI configuration
    emi_calculation_method: 'auto' | 'percentage' | 'fixed_amount';
    emi_fixed_amount: number | null;
    emi_percentage_of_salary: number | null;
    emi_decision_mode: 'policy_level' | 'request_level';
};

type WorkflowDesignerProps = {
    workflow: any;
    onChange: (workflow: any) => void;
    emiDecisionMode: 'policy_level' | 'request_level';
};

function WorkflowDesigner({ workflow, onChange, emiDecisionMode }: WorkflowDesignerProps) {
    const [roles, setRoles] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [levels, setLevels] = useState<any[]>([]);

    useEffect(() => {
        fetchWorkflowOptions();
        if (workflow && workflow.levels) {
            setLevels(workflow.levels);
        }
    }, []);

    const fetchWorkflowOptions = async () => {
        try {
            const data = await apiClient<{ roles: any[]; employees: any[] }>(
                "/salary-advance/workflow-options",
                { withAuth: true }
            );
            setRoles(data.roles || []);
            setEmployees(data.employees || []);
        } catch (error) {
            console.error("Failed to fetch workflow options:", error);
        }
    };

    const addLevel = () => {
        const newLevel = {
            order: levels.length + 1,
            approver_type: "role",
            approver_role_id: null,
            approver_employee_id: null,
            type: "MANDATORY",
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
        const updatedLevels = [...levels];

        // If setting decides_emi to true, uncheck it for all other levels
        if (field === 'decides_emi' && value === true) {
            updatedLevels.forEach((level, i) => {
                if (i !== index) {
                    level.decides_emi = false;
                }
            });
        }

        updatedLevels[index] = { ...updatedLevels[index], [field]: value };
        setLevels(updatedLevels);
        onChange({ ...workflow, levels: updatedLevels });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Approval Workflow</h3>
                <button
                    type="button"
                    onClick={addLevel}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
                                    className="ml-auto text-red-600 hover:text-red-700 text-sm"
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
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Select Employee</label>
                                        <select
                                            value={level.approver_employee_id || ""}
                                            onChange={(e) => updateLevel(index, "approver_employee_id", Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select employee...</option>
                                            {employees.map((emp) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.first_name} {emp.last_name} ({emp.email})
                                                </option>
                                            ))}
                                        </select>
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

                            {emiDecisionMode === 'request_level' && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={level.decides_emi || false}
                                            onChange={(e) => updateLevel(index, "decides_emi", e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Decides EMI Terms</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">
                                        Approver at this level will set the EMI amount and tenure
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type AccountsConfigurationProps = {
    accounts: { type: 'role' | 'employee', id: number | null }[];
    onChange: (accounts: { type: 'role' | 'employee', id: number | null }[]) => void;
    isEditing: boolean;
};

function AccountsConfiguration({ accounts, onChange, isEditing }: AccountsConfigurationProps) {
    const [roles, setRoles] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        setLoading(true);
        try {
            const wfOptions = await apiClient<any>("/salary-advance/workflow-options", { withAuth: true });
            setRoles(wfOptions.roles || []);
            setEmployees(wfOptions.employees || []);
        } catch (error) {
            console.error("Failed to fetch workflow options:", error);
        } finally {
            setLoading(false);
        }
    };

    const addAccount = () => {
        onChange([...accounts, { type: 'employee', id: null }]);
    };

    const removeAccount = (index: number) => {
        const newAccounts = [...accounts];
        newAccounts.splice(index, 1);
        onChange(newAccounts);
    };

    const updateAccount = (index: number, field: 'type' | 'id', value: any) => {
        const newAccounts = [...accounts];
        newAccounts[index] = { ...newAccounts[index], [field]: value };

        // Reset ID if type changes
        if (field === 'type') {
            newAccounts[index].id = null;
        }

        onChange(newAccounts);
    };

    if (loading) return <div className="p-4 text-center text-gray-500">Loading options...</div>;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Accounts Access</h2>
                    <p className="text-sm text-gray-600">Configure who can manage salary advance disbursement</p>
                </div>
            </div>

            {accounts.length === 0 && !isEditing ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600">No access rules configured.</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                    {accounts.map((account, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="w-1/3">
                                <select
                                    value={account.type}
                                    onChange={(e) => updateAccount(index, 'type', e.target.value)}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                    <option value="employee">Specific Employee</option>
                                    <option value="role">Role</option>
                                </select>
                            </div>

                            <div className="flex-1">
                                {account.type === 'role' ? (
                                    <select
                                        value={account.id || ""}
                                        onChange={(e) => updateAccount(index, 'id', Number(e.target.value))}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">Select role...</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        value={account.id || ""}
                                        onChange={(e) => updateAccount(index, 'id', Number(e.target.value))}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">Select employee...</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.first_name} {emp.last_name} ({emp.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {isEditing && (
                                <button
                                    onClick={() => removeAccount(index)}
                                    className="text-red-600 hover:text-red-700 p-2"
                                    title="Remove access"
                                >
                                    <AlertCircle size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isEditing && (
                <button
                    onClick={addAccount}
                    className="w-full py-2 mt-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors font-medium"
                >
                    + Add Access Rule
                </button>
            )}
        </div>
    );
}

export default function PolicyConfiguration() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [hasExistingPolicy, setHasExistingPolicy] = useState(false);
    const [accounts, setAccounts] = useState<{ type: 'role' | 'employee', id: number | null }[]>([]);
    const [policy, setPolicy] = useState<Policy>({
        max_percentage_of_earned_salary: null,
        max_requests_per_month: null,
        min_employment_days: null,
        min_request_amount: null,
        max_request_amount: null,
        workflow_definition: { workflowName: "Salary Advance", levels: [] },
        effective_from: null,
        effective_to: null,
        // Enhanced fields with defaults
        allow_only_earned_amount: true,
        repayment_mode: 'salary_deduction',
        repayment_percentage: null,
        interest_enabled: false,
        interest_rate_percentage: null,
        max_repayment_months: 12,
        allow_multiple_requests: false,
        multiple_requests_mode: 'separate',
        // Advanced EMI configuration with defaults
        emi_calculation_method: 'auto',
        emi_fixed_amount: null,
        emi_percentage_of_salary: null,
        emi_decision_mode: 'policy_level',
    });

    // Permission state
    const [userRole, setUserRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [checkingPerms, setCheckingPerms] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const session = await apiClient<any>("/auth/session", { method: "GET" });
                if (session?.authenticated) {
                    setUserRole(session.role);
                    setPermissions(session.employee?.permissions || []);
                }
            } catch (_) { } finally {
                setCheckingPerms(false);
            }
        })();
    }, []);

    const isOrgAdmin = (userRole || "").toLowerCase() === "orgadmin";
    const canView = isOrgAdmin || permissions.includes("SALADV_POLICY");

    useEffect(() => {
        if (!checkingPerms && canView) {
            fetchPolicyAndAccounts();
        }
    }, [checkingPerms, canView]);

    const fetchPolicyAndAccounts = async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const [policyData, accountsRes] = await Promise.all([
                apiClient<{ policy: Policy | null }>("/salary-advance/policy", { withAuth: true }),
                apiClient<any>("/salary-advance/accounts", { withAuth: true })
            ]);

            if (policyData.policy) {
                setPolicy({
                    ...policyData.policy,
                    workflow_definition: policyData.policy.workflow_definition || { workflowName: "Salary Advance", levels: [] }
                });
                setHasExistingPolicy(true);
                setIsEditing(false);
            } else {
                setHasExistingPolicy(false);
                setIsEditing(true); // Auto-enable edit mode if no policy exists
            }

            // Map existing accounts to state
            const existingAccounts = accountsRes.accounts?.map((a: any) => ({
                type: a.type,
                id: a.id
            })) || [];
            setAccounts(existingAccounts);

        } catch (error) {
            console.error("Failed to fetch policy or accounts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Filter out incomplete accounts
            const validAccounts = accounts.filter(a => a.id);

            await apiClient("/salary-advance/policy", {
                method: "POST",
                withAuth: true,
                body: {
                    ...policy,
                    accounts: validAccounts
                },
            });
            showSuccess("Policy and accounts configuration saved successfully");
            setIsEditing(false);
            setHasExistingPolicy(true);
            fetchPolicyAndAccounts();
        } catch (error: any) {
            showError(error.message || "Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof Policy, value: any) => {
        setPolicy({ ...policy, [field]: value });
    };

    if (checkingPerms) return <div className="p-8 text-center text-gray-500">Checking access...</div>;

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-gray-500">
                <Shield size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                <p className="mt-2">You do not have permission to configure salary advance policy.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading policy...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Settings className="w-8 h-8 text-indigo-600" />
                            Salary Advance Policy Configuration
                        </h1>
                        <p className="text-gray-600 mt-2">Configure rules, limits, and approval workflow for salary advances</p>
                    </div>
                    {hasExistingPolicy && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Settings size={18} />
                            Edit Policy
                        </button>
                    )}
                </div>

                {/* Accounts Configuration Card */}
                <AccountsConfiguration
                    accounts={accounts}
                    onChange={setAccounts}
                    isEditing={isEditing}
                />

                <div className="h-6"></div>

                {/* Readonly View */}
                {hasExistingPolicy && !isEditing && (
                    <div className="space-y-6">
                        {/* Eligibility Type - Readonly */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Eligibility Type</h2>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded ${policy.allow_only_earned_amount ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {policy.allow_only_earned_amount ? 'Restricted to Earned Amount' : 'Any Amount Allowed'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {policy.allow_only_earned_amount
                                                ? 'Employees can only request up to their earned salary'
                                                : 'Employees can request any amount up to the maximum limit'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Basic Limits - Readonly */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                Basic Limits
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Only show Max % when restricting to earned amount */}
                                {policy.allow_only_earned_amount && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-600 mb-1">Max % of Earned Salary</div>
                                        <div className="text-xl font-bold text-gray-900">
                                            {policy.max_percentage_of_earned_salary ?? 'Not Set'}
                                            {policy.max_percentage_of_earned_salary && '%'}
                                        </div>
                                    </div>
                                )}
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Max Requests Per Month</div>
                                    <div className="text-xl font-bold text-gray-900">
                                        {policy.max_requests_per_month ?? 'Not Set'}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Minimum Employment Days</div>
                                    <div className="text-xl font-bold text-gray-900">
                                        {policy.min_employment_days ?? 'Not Set'}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Minimum Request Amount</div>
                                    <div className="text-xl font-bold text-gray-900">
                                        {policy.min_request_amount ? `₹${Number(policy.min_request_amount).toLocaleString('en-IN')}` : 'Not Set'}
                                    </div>
                                </div>
                                {/* Only show Max Amount when NOT restricting to earned amount */}
                                {!policy.allow_only_earned_amount && (
                                    <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
                                        <div className="text-sm text-gray-600 mb-1">Maximum Request Amount</div>
                                        <div className="text-xl font-bold text-gray-900">
                                            {policy.max_request_amount ? `₹${Number(policy.max_request_amount).toLocaleString('en-IN')}` : 'Not Set'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Repayment Configuration - Readonly */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repayment Configuration</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Repayment Mode</div>
                                    <div className="text-lg font-bold text-gray-900 capitalize">
                                        {policy.repayment_mode?.replace('_', ' ') || 'Salary Deduction'}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Max Repayment Tenure</div>
                                    <div className="text-lg font-bold text-gray-900">
                                        {policy.max_repayment_months || 12} Months
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interest Configuration - Readonly */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Interest Configuration</h2>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-4 h-4 rounded ${policy.interest_enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <div className="font-medium text-gray-900">
                                        {policy.interest_enabled ? 'Interest Enabled' : 'No Interest'}
                                    </div>
                                </div>
                                {policy.interest_enabled && policy.interest_rate_percentage && (
                                    <div className="text-sm text-gray-600">
                                        Annual Rate: <span className="font-bold text-gray-900">{policy.interest_rate_percentage}%</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Multiple Requests - Readonly */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Multiple Requests</h2>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-4 h-4 rounded ${policy.allow_multiple_requests ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <div className="font-medium text-gray-900">
                                        {policy.allow_multiple_requests ? 'Multiple Requests Allowed' : 'Single Request Only'}
                                    </div>
                                </div>
                                {policy.allow_multiple_requests && (
                                    <div className="text-sm text-gray-600">
                                        Mode: <span className="font-bold text-gray-900 capitalize">{policy.multiple_requests_mode || 'Separate'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Workflow - Readonly */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Workflow</h2>
                            {policy.workflow_definition?.levels?.length === 0 ? (
                                <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <p className="text-gray-600">No approval levels configured</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {policy.workflow_definition?.levels?.map((level: any, index: number) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                                                    {level.order}
                                                </div>
                                                <span className="font-semibold text-gray-900">Level {level.order}</span>
                                                <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-semibold ${level.type === 'MANDATORY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {level.type}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <span className="font-medium">Approver Type:</span> {level.approver_type === 'role' ? 'Role-based' : 'Specific Employee'}
                                            </div>
                                            {level.approver_type === 'role' && level.approver_role_id && (
                                                <div className="text-sm text-gray-600">
                                                    <span className="font-medium">Role:</span> {level.approver_role_name || `Role ID: ${level.approver_role_id}`}
                                                </div>
                                            )}
                                            {level.approver_type === 'employee' && level.approver_employee_id && (
                                                <div className="space-y-1">
                                                    <div className="text-sm text-gray-600">
                                                        <span className="font-medium">Employee:</span> {level.approver_employee_name || `Employee ID: ${level.approver_employee_id}`}
                                                    </div>
                                                    {level.approver_employee_email && (
                                                        <div className="text-xs text-gray-500">
                                                            {level.approver_employee_email}
                                                        </div>
                                                    )}
                                                    {level.approver_employee_role && (
                                                        <div className="text-xs text-gray-500">
                                                            Role: {level.approver_employee_role}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {level.condition && (
                                                <div className="text-sm text-gray-600 mt-1">
                                                    <span className="font-medium">Condition:</span> {level.condition}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Edit Form */}
                {isEditing && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Eligibility Type - Show First */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Eligibility Type</h2>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={policy.allow_only_earned_amount}
                                        onChange={(e) => updateField("allow_only_earned_amount", e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Restrict to Earned Amount Only</div>
                                        <div className="text-sm text-gray-600">Employees can only request up to their earned salary for the current cycle</div>
                                    </div>
                                </label>
                                {!policy.allow_only_earned_amount && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-800">⚠️ Employees can request any amount up to the maximum limit, regardless of earned salary</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Basic Limits */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                Basic Limits
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Only show Max % when restricting to earned amount */}
                                {policy.allow_only_earned_amount && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Max % of Earned Salary
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={policy.max_percentage_of_earned_salary || ""}
                                            onChange={(e) => updateField("max_percentage_of_earned_salary", e.target.value ? Number(e.target.value) : null)}
                                            placeholder="e.g., 50"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leave empty for 100% of earned salary</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Requests Per Month
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={policy.max_requests_per_month || ""}
                                        onChange={(e) => updateField("max_requests_per_month", e.target.value ? Number(e.target.value) : null)}
                                        placeholder="e.g., 2"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty for no limit</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Minimum Employment Days
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={policy.min_employment_days || ""}
                                        onChange={(e) => updateField("min_employment_days", e.target.value ? Number(e.target.value) : null)}
                                        placeholder="e.g., 90"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty for no requirement</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Minimum Request Amount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={policy.min_request_amount || ""}
                                        onChange={(e) => updateField("min_request_amount", e.target.value ? Number(e.target.value) : null)}
                                        placeholder="e.g., 1000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty for no minimum</p>
                                </div>

                                {/* Only show Max Amount when NOT restricting to earned amount */}
                                {!policy.allow_only_earned_amount && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Maximum Request Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={policy.max_request_amount || ""}
                                            onChange={(e) => updateField("max_request_amount", e.target.value ? Number(e.target.value) : null)}
                                            placeholder="e.g., 50000"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leave empty for no maximum</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Repayment Configuration */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repayment Configuration</h2>
                            <div className="space-y-6">
                                {/* 1. Repayment Mode */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Mode</label>
                                    <select
                                        value={policy.repayment_mode}
                                        onChange={(e) => updateField("repayment_mode", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="salary_deduction">Salary Deduction (Auto EMI)</option>
                                        <option value="manual">Manual Payment</option>
                                        <option value="both">Both (Employee Choice)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {policy.repayment_mode === 'salary_deduction' && 'EMIs will be automatically deducted from monthly salary'}
                                        {policy.repayment_mode === 'manual' && 'Employees must make manual payments'}
                                        {policy.repayment_mode === 'both' && 'Employees can choose their preferred repayment method'}
                                    </p>
                                </div>

                                {/* 4. EMI Decision Point */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Decision Point</label>
                                    <select
                                        value={policy.emi_decision_mode}
                                        onChange={(e) => updateField("emi_decision_mode", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="policy_level">Policy Level (Common for All)</option>
                                        <option value="request_level">Request Level (Employer Choice)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {policy.emi_decision_mode === 'policy_level' && 'All requests follow the configuration above'}
                                        {policy.emi_decision_mode === 'request_level' && 'Employer decides EMI terms for each request during approval'}
                                    </p>
                                </div>

                                {/* Show EMI Configuration only for policy_level */}
                                {policy.emi_decision_mode === 'policy_level' && (
                                    <>
                                        {/* 2. EMI Calculation Method */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">EMI Calculation Method</label>
                                            <select
                                                value={policy.emi_calculation_method}
                                                onChange={(e) => updateField("emi_calculation_method", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="auto">Auto (Equal Monthly Installments)</option>
                                                <option value="percentage">Percentage of Salary</option>
                                                <option value="fixed_amount">Fixed Amount</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {policy.emi_calculation_method === 'auto' && 'EMI is calculated by dividing total amount by tenure'}
                                                {policy.emi_calculation_method === 'percentage' && 'EMI is a fixed percentage of monthly salary'}
                                                {policy.emi_calculation_method === 'fixed_amount' && 'EMI is a fixed amount deducted each month'}
                                            </p>
                                        </div>

                                        {/* 3. Conditional Fields based on EMI Method */}
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            {policy.emi_calculation_method === 'auto' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Repayment Tenure (Months)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="36"
                                                        value={policy.max_repayment_months || ""}
                                                        onChange={(e) => updateField("max_repayment_months", Number(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Maximum months allowed for repayment</p>
                                                </div>
                                            )}

                                            {policy.emi_calculation_method === 'percentage' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage of Salary (%)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        step="0.1"
                                                        value={policy.emi_percentage_of_salary || ""}
                                                        onChange={(e) => updateField("emi_percentage_of_salary", Number(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Percentage of salary to deduct as EMI each month</p>
                                                </div>
                                            )}

                                            {policy.emi_calculation_method === 'fixed_amount' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fixed EMI Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        min="100"
                                                        step="100"
                                                        value={policy.emi_fixed_amount || ""}
                                                        onChange={(e) => updateField("emi_fixed_amount", Number(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Fixed amount to deduct as EMI each month</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Interest Configuration */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Interest Configuration</h2>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={policy.interest_enabled}
                                        onChange={(e) => updateField("interest_enabled", e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Enable Interest</div>
                                        <div className="text-sm text-gray-600">Charge interest on salary advances</div>
                                    </div>
                                </label>

                                {policy.interest_enabled && (
                                    <div className="space-y-4 pl-7">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Interest Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={policy.interest_rate_percentage || ""}
                                                onChange={(e) => updateField("interest_rate_percentage", e.target.value ? Number(e.target.value) : null)}
                                                placeholder="e.g., 12"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Interest calculated using reducing balance method</p>
                                        </div>

                                        {policy.interest_rate_percentage && policy.interest_rate_percentage > 0 && (
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="text-sm font-medium text-blue-900 mb-2">Example Calculation</div>
                                                <div className="text-sm text-blue-800">
                                                    ₹10,000 advance @ {policy.interest_rate_percentage}% for {policy.max_repayment_months} months
                                                    <br />
                                                    ≈ ₹{Math.round((10000 * (policy.interest_rate_percentage / 12 / 100) * Math.pow(1 + policy.interest_rate_percentage / 12 / 100, policy.max_repayment_months)) / (Math.pow(1 + policy.interest_rate_percentage / 12 / 100, policy.max_repayment_months) - 1))}/month EMI
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Multiple Requests */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Multiple Requests</h2>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={policy.allow_multiple_requests}
                                        onChange={(e) => updateField("allow_multiple_requests", e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Allow Multiple Active Requests</div>
                                        <div className="text-sm text-gray-600">Employees can have more than one active salary advance</div>
                                    </div>
                                </label>

                                {policy.allow_multiple_requests && (
                                    <div className="pl-7">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Handling Mode</label>
                                        <select
                                            value={policy.multiple_requests_mode}
                                            onChange={(e) => updateField("multiple_requests_mode", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="separate">Keep Separate</option>
                                            <option value="combine">Combine EMIs</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {policy.multiple_requests_mode === 'separate' && 'Each request has its own EMI schedule'}
                                            {policy.multiple_requests_mode === 'combine' && 'All requests combined into single EMI'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Workflow Designer */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <WorkflowDesigner
                                workflow={policy.workflow_definition}
                                onChange={(workflow) => updateField("workflow_definition", workflow)}
                                emiDecisionMode={policy.emi_decision_mode}
                            />
                        </div>

                        {/* Info Alert */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">Policy Configuration Tips:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>All fields are optional - configure only what you need</li>
                                        <li>Workflow levels are processed in order</li>
                                        <li>Conditional levels only trigger if the condition is met</li>
                                        <li>Changes take effect immediately for new requests</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end">
                            {hasExistingPolicy && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        fetchPolicyAndAccounts(); // Reset to original policy
                                    }}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <Save size={18} />
                                {saving ? "Saving..." : "Save Policy"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
