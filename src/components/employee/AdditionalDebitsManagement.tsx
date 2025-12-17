import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import AdditionalDebitsWizard from './AdditionalDebitsWizard';

interface AdditionalDebit {
    id: number;
    debit_name: string;
    description: string;
    status: 'active' | 'inactive';
    debit_type: 'fixed' | 'percentage';
    fixed_amount: number | null;
    percentage_value: number | null;
    reference_amount: 'net' | 'before_deduction' | 'after_deduction' | null;
    enable_max_cap: boolean;
    max_cap_amount: number | null;
    enable_additional_charges: boolean;
    additional_charge_type: 'fixed' | 'percentage' | null;
    additional_charge_value: number | null;
    created_at: string;
}

export default function AdditionalDebitsManagement() {
    const [debits, setDebits] = useState<AdditionalDebit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    const fetchDebits = async () => {
        setLoading(true);
        try {
            const data = await apiClient(`/organization/employees/additional-debits?status=${statusFilter}`);
            setDebits(data);
        } catch (error: any) {
            console.error('Failed to fetch debits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebits();
    }, [statusFilter]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this debit?')) return;

        try {
            await apiClient(`/organization/employees/additional-debits/${id}`, {
                method: 'DELETE',
            });
            fetchDebits();
        } catch (error: any) {
            alert(error.message || 'Failed to delete debit');
        }
    };

    const handleToggleStatus = async (debit: AdditionalDebit) => {
        try {
            await apiClient(`/organization/employees/additional-debits/${debit.id}`, {
                method: 'PUT',
                body: {
                    ...debit,
                    status: debit.status === 'active' ? 'inactive' : 'active',
                },
            });
            fetchDebits();
        } catch (error: any) {
            alert(error.message || 'Failed to update debit status');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Additional Debits</h1>
                    <p className="text-gray-600 mt-1">Manage additional salary deductions</p>
                </div>
                <button
                    onClick={() => setShowWizard(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Debit
                </button>
            </div>

            {/* Filters */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-md ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-4 py-2 rounded-md ${statusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    Active
                </button>
                <button
                    onClick={() => setStatusFilter('inactive')}
                    className={`px-4 py-2 rounded-md ${statusFilter === 'inactive' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    Inactive
                </button>
            </div>

            {/* Debits List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading debits...</p>
                </div>
            ) : debits.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No debits found</p>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Create First Debit
                    </button>
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Debit Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reference
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {debits.map((debit) => (
                                <tr key={debit.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{debit.debit_name}</div>
                                        {debit.description && (
                                            <div className="text-sm text-gray-500">{debit.description}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                                            {debit.debit_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {debit.debit_type === 'fixed'
                                            ? `₹${debit.fixed_amount}`
                                            : `${debit.percentage_value}%`}
                                        {debit.enable_max_cap && (
                                            <div className="text-xs text-gray-500">Max: ₹{debit.max_cap_amount}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        {debit.reference_amount?.replace('_', ' ') || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${debit.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {debit.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleToggleStatus(debit)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                            title={debit.status === 'active' ? 'Deactivate' : 'Activate'}
                                        >
                                            {debit.status === 'active' ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(debit.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Wizard Modal */}
            {showWizard && (
                <AdditionalDebitsWizard
                    onClose={() => setShowWizard(false)}
                    onSuccess={() => {
                        fetchDebits();
                    }}
                />
            )}
        </div>
    );
}
