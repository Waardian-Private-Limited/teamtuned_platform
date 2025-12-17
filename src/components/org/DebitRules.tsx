import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import AdditionalDebitsWizard from '@/components/employee/AdditionalDebitsWizard';
import { showSuccess, showError } from '@/lib/toast';

interface SalaryComponent {
    id: number;
    component_name: string;
    component_type: 'credit' | 'debit';
}

interface DebitRule {
    id: number;
    debit_name: string;
    description: string | null;
    status: 'active' | 'inactive';
    debit_type: 'fixed' | 'percentage';
    fixed_amount: number | null;
    percentage_value: number | null;
    reference_amount: 'net' | 'before_deduction' | 'after_deduction' | 'breakdown_item' | null;
    breakdown_item_id: number | null;
    is_dynamic_reference: boolean;
    enable_max_cap: boolean;
    max_cap_amount: number | null;
    enable_additional_charges: boolean;
    additional_charge_type: 'fixed' | 'percentage' | null;
    additional_charge_value: number | null;
}

export default function DebitRulesPage() {
    const [rules, setRules] = useState<DebitRule[]>([]);
    const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDebit, setEditingDebit] = useState<DebitRule | null>(null);

    useEffect(() => {
        fetchRules();
        fetchSalaryComponents();
    }, []);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const data = await apiClient<DebitRule[]>('/organization/employees/additional-debits?status=active');
            setRules(data || []);
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSalaryComponents = async () => {
        try {
            const data = await apiClient<SalaryComponent[]>('/organization/salary-components?status=active');
            setSalaryComponents(data || []);
        } catch (error) {
            console.error('Failed to fetch salary components:', error);
        }
    };


    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this debit rule?')) return;
        try {
            await apiClient(`/organization/employees/additional-debits/${id}`, { method: 'DELETE' });
            fetchRules();
            showSuccess('Debit rule deleted successfully');
        } catch (error: any) {
            showError(error.message || 'Failed to delete debit rule');
        }
    };

    const handleSuccess = () => {
        fetchRules();
        setEditingDebit(null);
    };

    const handleEdit = (rule: DebitRule) => {
        setEditingDebit(rule);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingDebit(null);
    };

    const getComponentName = (id?: number) => {
        if (id === undefined) return '';
        const component = salaryComponents.find(c => c.id === id);
        return component?.component_name || '';
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Debit Rules</h1>
                    <p className="text-gray-600 mt-1">Manage global debit rules for employee salaries</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Add Debit Rule
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rules.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No debit rules found. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                rules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{rule.debit_name}</div>
                                            {rule.description && (
                                                <div className="text-sm text-gray-500">{rule.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm capitalize">{rule.debit_type}</td>
                                        <td className="px-6 py-4 text-sm">
                                            {rule.debit_type === 'fixed'
                                                ? `₹${rule.fixed_amount}`
                                                : `${rule.percentage_value}%`}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {rule.debit_type === 'percentage' && (
                                                <div>
                                                    <div className="capitalize">{rule.reference_amount?.replace('_', ' ')}</div>
                                                    {rule.reference_amount === 'breakdown_item' && (
                                                        <div className="text-xs text-gray-500">{getComponentName(rule.breakdown_item_id ?? undefined)}</div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${rule.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {rule.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(rule)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit debit rule"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rule.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete debit rule"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}


            {/* Wizard Modal */}
            {showModal && (
                <AdditionalDebitsWizard
                    onClose={handleCloseModal}
                    onSuccess={handleSuccess}
                    editDebit={editingDebit}
                    salaryItems={salaryComponents.map(c => ({
                        id: c.id,
                        name: c.component_name,
                        type: c.component_type,
                        amount: 0 // You can add actual amounts if available
                    }))}
                />
            )}
        </div>
    );
}
