import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

interface AdditionalDebit {
    id?: number;
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

const defaultDebit: AdditionalDebit = {
    debit_name: '',
    description: '',
    status: 'active',
    debit_type: 'fixed',
    fixed_amount: null,
    percentage_value: null,
    reference_amount: null,
    breakdown_item_id: null,
    is_dynamic_reference: false,
    enable_max_cap: false,
    max_cap_amount: null,
    enable_additional_charges: false,
    additional_charge_type: null,
    additional_charge_value: null,
};

export default function AdditionalDebitsWizard({
    onClose,
    onSuccess,
    editDebit = null,
    salaryItems = []
}: {
    onClose: () => void;
    onSuccess: () => void;
    editDebit?: AdditionalDebit | null;
    salaryItems?: Array<{ id: number; name: string; type: string; amount: number }>;
}) {
    const [currentStep, setCurrentStep] = useState(1);
    const [debit, setDebit] = useState<AdditionalDebit>(defaultDebit);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    // Pre-populate form when editing
    useEffect(() => {
        if (editDebit) {
            setDebit({
                id: editDebit.id,
                debit_name: editDebit.debit_name || '',
                description: editDebit.description || '',
                status: editDebit.status || 'active',
                debit_type: editDebit.debit_type || 'fixed',
                fixed_amount: editDebit.fixed_amount || null,
                percentage_value: editDebit.percentage_value || null,
                reference_amount: editDebit.reference_amount || null,
                breakdown_item_id: editDebit.breakdown_item_id || null,
                is_dynamic_reference: editDebit.is_dynamic_reference || false,
                enable_max_cap: editDebit.enable_max_cap || false,
                max_cap_amount: editDebit.max_cap_amount || null,
                enable_additional_charges: editDebit.enable_additional_charges || false,
                additional_charge_type: editDebit.additional_charge_type || null,
                additional_charge_value: editDebit.additional_charge_value || null,
            });
        }
    }, [editDebit]);

    const steps = [
        { id: 1, title: 'Basic Details' },
        { id: 2, title: 'Debit Type' },
        { id: 3, title: 'Amount Configuration' },
        { id: 4, title: 'Reference Amount', conditional: debit.debit_type === 'percentage' },
        { id: 5, title: 'Max Cap', conditional: debit.debit_type === 'percentage' },
        { id: 6, title: 'Additional Charges' },
        { id: 7, title: 'Review & Confirm' },
    ];

    const visibleSteps = steps.filter(step => !step.conditional || step.conditional === true);

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            if (!debit.debit_name.trim()) newErrors.debit_name = 'Debit name is required';
        }

        if (step === 3) {
            if (debit.debit_type === 'fixed' && !debit.fixed_amount) {
                newErrors.fixed_amount = 'Fixed amount is required';
            }
            if (debit.debit_type === 'percentage' && !debit.percentage_value) {
                newErrors.percentage_value = 'Percentage value is required';
            }
        }

        if (step === 4 && debit.debit_type === 'percentage') {
            if (!debit.reference_amount) {
                newErrors.reference_amount = 'Reference amount is required';
            }
            if (debit.reference_amount === 'breakdown_item' && debit.breakdown_item_id === null) {
                newErrors.breakdown_item_id = 'Breakdown item is required';
            }
        }

        if (step === 5 && debit.enable_max_cap) {
            if (!debit.max_cap_amount) {
                newErrors.max_cap_amount = 'Max cap amount is required';
            }
        }

        if (step === 6 && debit.enable_additional_charges) {
            if (!debit.additional_charge_type) {
                newErrors.additional_charge_type = 'Charge type is required';
            }
            if (!debit.additional_charge_value) {
                newErrors.additional_charge_value = 'Charge value is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            // Skip conditional steps
            let nextStep = currentStep + 1;
            while (nextStep <= 7) {
                const step = steps.find(s => s.id === nextStep);
                if (!step || !step.conditional || step.conditional === true) {
                    setCurrentStep(nextStep);
                    break;
                }
                nextStep++;
            }
        }
    };

    const handleBack = () => {
        let prevStep = currentStep - 1;
        while (prevStep >= 1) {
            const step = steps.find(s => s.id === prevStep);
            if (!step || !step.conditional || step.conditional === true) {
                setCurrentStep(prevStep);
                break;
            }
            prevStep--;
        }
    };

    const handleSave = async () => {
        if (!validateStep(currentStep)) return;

        setLoading(true);
        try {
            const isEditing = !!editDebit?.id;
            const url = isEditing
                ? `/organization/employees/additional-debits/${editDebit.id}`
                : '/organization/employees/additional-debits';
            const method = isEditing ? 'PUT' : 'POST';

            await apiClient(url, {
                method,
                body: debit,
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message || `Failed to ${editDebit?.id ? 'update' : 'create'} debit`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{editDebit?.id ? 'Edit' : 'Create'} Additional Debit</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        {visibleSteps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === step.id ? 'bg-blue-600 text-white' :
                                        currentStep > step.id ? 'bg-green-600 text-white' :
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                        {currentStep > step.id ? '✓' : step.id}
                                    </div>
                                    <span className="text-xs mt-1 text-gray-600">{step.title}</span>
                                </div>
                                {index < visibleSteps.length - 1 && (
                                    <div className={`flex-1 h-1 mx-2 ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="px-6 py-6">
                    {/* Step 1: Basic Details */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4">Basic Details</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Debit Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={debit.debit_name}
                                    onChange={(e) => setDebit({ ...debit, debit_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Professional Tax, Loan Deduction"
                                />
                                {errors.debit_name && <p className="text-red-500 text-sm mt-1">{errors.debit_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description <span className="text-gray-400">(Optional)</span>
                                </label>
                                <textarea
                                    value={debit.description || ''}
                                    onChange={(e) => setDebit({ ...debit, description: e.target.value || null })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Brief description of this debit"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={debit.status}
                                    onChange={(e) => setDebit({ ...debit, status: e.target.value as 'active' | 'inactive' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Debit Type */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4">Select Debit Type</h3>

                            <div className="space-y-3">
                                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 ${debit.debit_type === 'fixed' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}">
                                    <input
                                        type="radio"
                                        name="debit_type"
                                        value="fixed"
                                        checked={debit.debit_type === 'fixed'}
                                        onChange={(e) => setDebit({ ...debit, debit_type: 'fixed', percentage_value: null, reference_amount: null })}
                                        className="mr-3"
                                    />
                                    <div>
                                        <div className="font-medium">Fixed Amount</div>
                                        <div className="text-sm text-gray-600">Deduct a fixed amount from salary</div>
                                    </div>
                                </label>

                                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 ${debit.debit_type === 'percentage' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="debit_type"
                                        value="percentage"
                                        checked={debit.debit_type === 'percentage'}
                                        onChange={(e) => setDebit({ ...debit, debit_type: 'percentage', fixed_amount: null })}
                                        className="mr-3"
                                    />
                                    <div>
                                        <div className="font-medium">Percentage Based</div>
                                        <div className="text-sm text-gray-600">Deduct a percentage of salary</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Amount Configuration */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4">Amount Configuration</h3>

                            {debit.debit_type === 'fixed' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Amount (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={debit.fixed_amount || ''}
                                        onChange={(e) => setDebit({ ...debit, fixed_amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                    {errors.fixed_amount && <p className="text-red-500 text-sm mt-1">{errors.fixed_amount}</p>}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Percentage (%) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={debit.percentage_value || ''}
                                        onChange={(e) => setDebit({ ...debit, percentage_value: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                    />
                                    {errors.percentage_value && <p className="text-red-500 text-sm mt-1">{errors.percentage_value}</p>}
                                    <p className="text-sm text-gray-500 mt-1">Enter percentage value (e.g., 12.5 for 12.5%)</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Reference Amount (Percentage only) */}
                    {currentStep === 4 && debit.debit_type === 'percentage' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4">Reference Amount</h3>
                            <p className="text-sm text-gray-600 mb-4">Select which amount to use for percentage calculation</p>

                            <div className="space-y-3">
                                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 ${debit.reference_amount === 'net' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="reference_amount"
                                        value="net"
                                        checked={debit.reference_amount === 'net'}
                                        onChange={(e) => setDebit({ ...debit, reference_amount: 'net', breakdown_item_id: null })}
                                        className="mr-3"
                                    />
                                    <div>
                                        <div className="font-medium">Net Amount</div>
                                        <div className="text-sm text-gray-600">After all credits and debits</div>
                                    </div>
                                </label>

                                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 ${debit.reference_amount === 'before_deduction' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="reference_amount"
                                        value="before_deduction"
                                        checked={debit.reference_amount === 'before_deduction'}
                                        onChange={(e) => setDebit({ ...debit, reference_amount: 'before_deduction', breakdown_item_id: null })}
                                        className="mr-3"
                                    />
                                    <div>
                                        <div className="font-medium">Before Deduction (Gross)</div>
                                        <div className="text-sm text-gray-600">Before any deductions</div>
                                    </div>
                                </label>

                                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 ${debit.reference_amount === 'after_deduction' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="reference_amount"
                                        value="after_deduction"
                                        checked={debit.reference_amount === 'after_deduction'}
                                        onChange={(e) => setDebit({ ...debit, reference_amount: 'after_deduction', breakdown_item_id: null })}
                                        className="mr-3"
                                    />
                                    <div>
                                        <div className="font-medium">After Deduction</div>
                                        <div className="text-sm text-gray-600">After breakdown debits</div>
                                    </div>
                                </label>

                                <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 ${debit.reference_amount === 'breakdown_item' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="reference_amount"
                                        value="breakdown_item"
                                        checked={debit.reference_amount === 'breakdown_item'}
                                        onChange={(e) => setDebit({ ...debit, reference_amount: 'breakdown_item', breakdown_item_id: null })}
                                        className="mr-3 mt-1"
                                    />
                                    <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                                        <div className="font-medium">Salary Breakdown Item</div>
                                        <div className="text-sm text-gray-600 mb-3">Based on a specific salary component</div>

                                        {debit.reference_amount === 'breakdown_item' && (
                                            <div className="mt-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Select Item <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={debit.breakdown_item_id !== null ? debit.breakdown_item_id : ''}
                                                    onChange={(e) => setDebit({ ...debit, breakdown_item_id: e.target.value === '' ? null : Number(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Select breakdown item</option>
                                                    {salaryItems.map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.name} (₹{item.amount})
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.breakdown_item_id && <p className="text-red-500 text-sm mt-1">{errors.breakdown_item_id}</p>}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>
                            {errors.reference_amount && <p className="text-red-500 text-sm mt-1">{errors.reference_amount}</p>}

                            {/* Full/Dynamic Toggle for ALL reference amounts */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Calculation Type
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center p-3 border-2 rounded cursor-pointer hover:bg-white">
                                        <input
                                            type="radio"
                                            name="is_dynamic_reference"
                                            checked={!debit.is_dynamic_reference}
                                            onChange={() => setDebit({ ...debit, is_dynamic_reference: false })}
                                            className="mr-3"
                                        />
                                        <div>
                                            <div className="font-medium">Full (100%)</div>
                                            <div className="text-xs text-gray-500">Apply percentage to full reference amount</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-3 border-2 rounded cursor-pointer hover:bg-white">
                                        <input
                                            type="radio"
                                            name="is_dynamic_reference"
                                            checked={debit.is_dynamic_reference}
                                            onChange={() => setDebit({ ...debit, is_dynamic_reference: true })}
                                            className="mr-3"
                                        />
                                        <div>
                                            <div className="font-medium">Dynamic (Based on Attendance)</div>
                                            <div className="text-xs text-gray-500">Adjust reference amount based on attendance/working days</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Max Cap (Percentage only) */}
                    {currentStep === 5 && debit.debit_type === 'percentage' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4">Maximum Cap</h3>

                            <div className="flex items-center mb-4">
                                <input
                                    type="checkbox"
                                    checked={debit.enable_max_cap}
                                    onChange={(e) => setDebit({ ...debit, enable_max_cap: e.target.checked, max_cap_amount: e.target.checked ? debit.max_cap_amount : null })}
                                    className="mr-2"
                                />
                                <label className="text-sm font-medium text-gray-700">Enable Max Cap</label>
                            </div>

                            {debit.enable_max_cap && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Cap Amount (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={debit.max_cap_amount || ''}
                                        onChange={(e) => setDebit({ ...debit, max_cap_amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                    {errors.max_cap_amount && <p className="text-red-500 text-sm mt-1">{errors.max_cap_amount}</p>}
                                    <p className="text-sm text-gray-500 mt-1">Maximum deduction amount regardless of percentage</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 6: Additional Charges */}
                    {currentStep === 6 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4">Additional Charges</h3>

                            <div className="flex items-center mb-4">
                                <input
                                    type="checkbox"
                                    checked={debit.enable_additional_charges}
                                    onChange={(e) => setDebit({
                                        ...debit,
                                        enable_additional_charges: e.target.checked,
                                        additional_charge_type: e.target.checked ? debit.additional_charge_type : null,
                                        additional_charge_value: e.target.checked ? debit.additional_charge_value : null
                                    })}
                                    className="mr-2"
                                />
                                <label className="text-sm font-medium text-gray-700">Add Additional Charges</label>
                            </div>

                            {debit.enable_additional_charges && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Charge Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={debit.additional_charge_type || ''}
                                            onChange={(e) => setDebit({ ...debit, additional_charge_type: e.target.value as 'fixed' | 'percentage' })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Type</option>
                                            <option value="fixed">Fixed Amount</option>
                                            <option value="percentage">Percentage</option>
                                        </select>
                                        {errors.additional_charge_type && <p className="text-red-500 text-sm mt-1">{errors.additional_charge_type}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Value <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={debit.additional_charge_value || ''}
                                            onChange={(e) => setDebit({ ...debit, additional_charge_value: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={debit.additional_charge_type === 'percentage' ? '0.00%' : '₹0.00'}
                                            min="0"
                                            step="0.01"
                                        />
                                        {errors.additional_charge_value && <p className="text-red-500 text-sm mt-1">{errors.additional_charge_value}</p>}
                                        <p className="text-sm text-gray-500 mt-1">Applied after main debit calculation</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 7: Review */}
                    {currentStep === 7 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-4">Review & Confirm</h3>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="font-medium">Debit Name:</span>
                                    <span>{debit.debit_name}</span>
                                </div>
                                {debit.description && (
                                    <div className="flex justify-between">
                                        <span className="font-medium">Description:</span>
                                        <span className="text-right max-w-xs">{debit.description}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="font-medium">Type:</span>
                                    <span className="capitalize">{debit.debit_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Amount:</span>
                                    <span>
                                        {debit.debit_type === 'fixed'
                                            ? `₹${debit.fixed_amount}`
                                            : `${debit.percentage_value}%`}
                                    </span>
                                </div>
                                {debit.reference_amount && (
                                    <div className="flex justify-between">
                                        <span className="font-medium">Reference Amount:</span>
                                        <span className="capitalize">{debit.reference_amount.replace('_', ' ')}</span>
                                    </div>
                                )}
                                {debit.reference_amount === 'breakdown_item' && debit.breakdown_item_id !== null && (
                                    <div className="flex justify-between">
                                        <span className="font-medium">Breakdown Item:</span>
                                        <span>{salaryItems.find(s => s.id === debit.breakdown_item_id)?.name || 'Unknown'}</span>
                                    </div>
                                )}
                                {debit.debit_type === 'percentage' && (
                                    <div className="flex justify-between">
                                        <span className="font-medium">Calculation Type:</span>
                                        <span>{debit.is_dynamic_reference ? 'Dynamic (Attendance-based)' : 'Full (100%)'}</span>
                                    </div>
                                )}
                                {debit.enable_max_cap && (
                                    <div className="flex justify-between">
                                        <span className="font-medium">Max Cap:</span>
                                        <span>₹{debit.max_cap_amount}</span>
                                    </div>
                                )}
                                {debit.enable_additional_charges && (
                                    <div className="flex justify-between">
                                        <span className="font-medium">Additional Charges:</span>
                                        <span>
                                            {debit.additional_charge_type === 'fixed'
                                                ? `₹${debit.additional_charge_value}`
                                                : `${debit.additional_charge_value}%`}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="font-medium">Status:</span>
                                    <span className={`px-2 py-1 rounded text-sm ${debit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {debit.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Back
                    </button>

                    {currentStep < 7 ? (
                        <button
                            onClick={handleNext}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : `${editDebit?.id ? 'Update' : 'Save'} Debit Rule`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
