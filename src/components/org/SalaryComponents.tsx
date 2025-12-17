import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { showSuccess, showError } from '@/lib/toast';

interface SalaryComponent {
    id: number;
    component_name: string;
    component_type: 'credit' | 'debit';
    description?: string;
    display_order: number;
    status: 'active' | 'inactive';
}

export default function SalaryComponentsPage() {
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
    const [formData, setFormData] = useState({
        component_name: '',
        component_type: 'credit' as 'credit' | 'debit',
        description: '',
        status: 'active' as 'active' | 'inactive',
    });

    useEffect(() => {
        fetchComponents();
    }, []);

    const fetchComponents = async () => {
        try {
            setLoading(true);
            const data = await apiClient<SalaryComponent[]>('/organization/salary-components?status=active');
            setComponents(data || []);
        } catch (error) {
            console.error('Failed to fetch components:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingComponent) {
                await apiClient(`/organization/salary-components/${editingComponent.id}`, {
                    method: 'PUT',
                    body: formData,
                });
            } else {
                await apiClient('/organization/salary-components', {
                    method: 'POST',
                    body: formData,
                });
            }
            fetchComponents();
            closeModal();
            showSuccess(editingComponent ? 'Component updated successfully' : 'Component created successfully');
        } catch (error: any) {
            showError(error.message || 'Failed to save component');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this component?')) return;
        try {
            await apiClient(`/organization/salary-components/${id}`, { method: 'DELETE' });
            fetchComponents();
            showSuccess('Component deleted successfully');
        } catch (error: any) {
            showError(error.message || 'Failed to delete component');
        }
    };

    const openModal = (component?: SalaryComponent) => {
        if (component) {
            setEditingComponent(component);
            setFormData({
                component_name: component.component_name,
                component_type: component.component_type,
                description: component.description || '',
                status: component.status,
            });
        } else {
            setEditingComponent(null);
            setFormData({
                component_name: '',
                component_type: 'credit',
                description: '',
                status: 'active',
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingComponent(null);
    };

    const credits = components.filter(c => c.component_type === 'credit');
    const debits = components.filter(c => c.component_type === 'debit');

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Salary Components</h1>
                    <p className="text-gray-600 mt-1">Manage salary credits and debits for your organization</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Add Component
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Credits */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b bg-green-50">
                            <h2 className="text-lg font-semibold text-green-800">Credits (Earnings)</h2>
                        </div>
                        <div className="p-4">
                            {credits.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No credit components</p>
                            ) : (
                                <div className="space-y-2">
                                    {credits.map((component) => (
                                        <div
                                            key={component.id}
                                            className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium">{component.component_name}</div>
                                                {component.description && (
                                                    <div className="text-sm text-gray-500">{component.description}</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openModal(component)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(component.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Debits */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b bg-red-50">
                            <h2 className="text-lg font-semibold text-red-800">Debits (Deductions)</h2>
                        </div>
                        <div className="p-4">
                            {debits.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No debit components</p>
                            ) : (
                                <div className="space-y-2">
                                    {debits.map((component) => (
                                        <div
                                            key={component.id}
                                            className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium">{component.component_name}</div>
                                                {component.description && (
                                                    <div className="text-sm text-gray-500">{component.description}</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openModal(component)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(component.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">
                                {editingComponent ? 'Edit Component' : 'Add Component'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Component Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.component_name}
                                    onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.component_type}
                                    onChange={(e) => setFormData({ ...formData, component_type: e.target.value as 'credit' | 'debit' })}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                >
                                    <option value="credit">Credit (Earning)</option>
                                    <option value="debit">Debit (Deduction)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="flex gap-2 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    {editingComponent ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
