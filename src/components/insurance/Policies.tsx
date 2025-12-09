"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Plus, Search, FileText, Edit2, Trash2, CheckCircle, XCircle, X, AlertTriangle, Eye } from "lucide-react";

export default function InsurancePolicies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; policy: any | null }>({ show: false, policy: null });
  const [viewDetailsPolicy, setViewDetailsPolicy] = useState<any>(null);

  // Permissions
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await apiClient<{
        authenticated: boolean;
        role: string;
        employee?: { permissions?: string[] } | null;
      }>("/auth/session", { method: "GET" });
      if (session?.authenticated) {
        setRole(session.role || null);
        setPermissions(session.employee?.permissions || []);
      }
    } catch (_) { }
  };

  useEffect(() => {
    if (role === "Employee" && !hasPerm("INS_POLICY_VIEW")) return;
    fetchData();
  }, [role, permissions]);

  const fetchData = async () => {
    try {
      const [policiesData, providersData] = await Promise.all([
        apiClient<any[]>("/insurance/policies", { method: "GET", withAuth: true }),
        apiClient<any[]>("/insurance/providers", { method: "GET", withAuth: true }),
      ]);
      setPolicies(policiesData || []);
      setProviders(providersData || []);
    } catch (error: any) {
      showError(error?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (policy: any) => {
    try {
      await apiClient(`/insurance/policies/${policy.id}`, { method: "DELETE", withAuth: true });
      showSuccess("Policy deleted successfully");
      setDeleteConfirm({ show: false, policy: null });
      fetchData();
    } catch (error: any) {
      showError(error?.message || "Failed to delete policy. Ensure no employees are enrolled.");
    }
  };

  const filteredPolicies = policies.filter((p) =>
    p.policy_name.toLowerCase().includes(search.toLowerCase()) || p.provider_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (role === "Employee" && !hasPerm("INS_POLICY_VIEW")) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view insurance policies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Policies</h1>
        {(role !== "Employee" || hasPerm("INS_POLICY_ADD")) && (
          <button
            onClick={() => {
              setEditingPolicy(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            Add Policy
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Policy Name</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Coverage</th>
                <th className="px-6 py-3">Premium</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">Loading...</td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No policies found.</td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{policy.policy_name}</td>
                    <td className="px-6 py-4">{policy.provider_name}</td>
                    <td className="px-6 py-4 capitalize">{policy.type}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{Number(policy.coverage_amount).toLocaleString()}</td>
                    <td className="px-6 py-4">{Number(policy.premium_amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {policy.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewDetailsPolicy(policy)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {(role !== "Employee" || hasPerm("INS_POLICY_EDIT")) && (
                          <button
                            onClick={() => {
                              setEditingPolicy(policy);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {(role !== "Employee" || hasPerm("INS_POLICY_DELETE")) && (
                          <button
                            onClick={() => setDeleteConfirm({ show: true, policy })}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <PolicyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          policy={editingPolicy}
          providers={providers}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }}
        />
      )}

      {deleteConfirm.show && deleteConfirm.policy && (
        <ConfirmDialog
          title="Delete Policy"
          message={`Are you sure you want to delete "${deleteConfirm.policy.policy_name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm.policy)}
          onCancel={() => setDeleteConfirm({ show: false, policy: null })}
        />
      )}

      {viewDetailsPolicy && (
        <PolicyDetailsModal
          policy={viewDetailsPolicy}
          onClose={() => setViewDetailsPolicy(null)}
        />
      )}
    </div>
  );
}

function PolicyModal({ isOpen, onClose, policy, providers, onSuccess }: { isOpen: boolean; onClose: () => void; policy?: any; providers: any[]; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    provider_id: policy?.provider_id || "",
    policy_number: policy?.policy_number || "",
    policy_name: policy?.policy_name || "",
    type: policy?.type || "health",
    description: policy?.description || "",
    coverage_amount: policy?.coverage_amount || "",
    premium_amount: policy?.premium_amount || "",
    employer_percent: policy?.employer_percent || "100",
    employee_percent: policy?.employee_percent || "0",
    coverage_details: policy?.coverage_details || "",
    waiting_period_days: policy?.waiting_period_days || "0",
    maternity_coverage: policy?.maternity_coverage || false,
    pre_existing_coverage: policy?.pre_existing_coverage || false,
    room_rent_limit: policy?.room_rent_limit || "",
    copay_percentage: policy?.copay_percentage || "0",
    is_active: policy?.is_active ?? true,
  });

  // Parse benefits - handle both string and array formats
  const parseBenefits = (benefits: any) => {
    if (!benefits) return [];
    if (Array.isArray(benefits)) return benefits;
    if (typeof benefits === 'string') {
      try {
        const parsed = JSON.parse(benefits);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const [benefits, setBenefits] = useState<Array<{ id: string; title: string; description: string; icon: string }>>(
    parseBenefits(policy?.benefits)
  );
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<number[]>([]);

  // Fetch existing attachments if editing
  React.useEffect(() => {
    if (policy?.id) {
      fetchAttachments();
    }
  }, [policy?.id]);

  const fetchAttachments = async () => {
    if (!policy?.id) return;
    try {
      const data = await apiClient<any[]>(`/insurance/policies/${policy.id}/attachments`, {
        method: "GET",
        withAuth: true,
      });
      setAttachments(data || []);
    } catch (error: any) {
      console.error("Failed to fetch attachments:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarkAttachmentForDeletion = (attachmentId: number) => {
    setFilesToDelete(prev => [...prev, attachmentId]);
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = policy ? `/insurance/policies/${policy.id}` : "/insurance/policies";
      const method = policy ? "PUT" : "POST";

      // First, save the policy data
      const payload = {
        ...formData,
        benefits: benefits.length > 0 ? JSON.stringify(benefits) : null,
      };

      const response = await apiClient<{ id: number }>(url, { method, body: payload, withAuth: true });
      const policyId = policy?.id || response.id;

      // Handle file deletions
      if (filesToDelete.length > 0 && policyId) {
        await Promise.all(
          filesToDelete.map(attachmentId =>
            apiClient(`/insurance/policies/${policyId}/attachments/${attachmentId}`, {
              method: 'DELETE',
              withAuth: true,
            }).catch(err => console.error('Failed to delete attachment:', err))
          )
        );
      }

      // Handle file uploads
      if (selectedFiles.length > 0 && policyId) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        try {
          await apiClient(`/insurance/policies/${policyId}/attachments`, {
            method: 'POST',
            body: formData,
            withAuth: true,
          });
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          showError(uploadError?.message || 'Failed to upload files. Policy was saved successfully.');
          // Don't throw - policy was saved
          return;
        }
      }

      showSuccess(policy ? "Policy updated successfully" : "Policy created successfully");
      onSuccess();
    } catch (error: any) {
      showError(error?.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = () => {
    setBenefits([...benefits, {
      id: Date.now().toString(),
      title: "",
      description: "",
      icon: "shield"
    }]);
  };

  const removeBenefit = (id: string) => {
    setBenefits(benefits.filter(b => b.id !== id));
  };

  const updateBenefit = (id: string, field: string, value: string) => {
    setBenefits(benefits.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{policy ? "Edit Policy" : "Add Policy"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
                <select
                  required
                  value={formData.provider_id}
                  onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                <input
                  type="text"
                  value={formData.policy_number}
                  onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. POL-2025-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name *</label>
                <input
                  required
                  type="text"
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Gold Health Plan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="health">Health</option>
                  <option value="life">Life</option>
                  <option value="accident">Accident</option>
                  <option value="disability">Disability</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={2}
                placeholder="Brief description of the policy"
              />
            </div>
          </div>

          {/* Financial Details */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Amount</label>
                <input
                  type="number"
                  value={formData.coverage_amount}
                  onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premium Amount</label>
                <input
                  type="number"
                  value={formData.premium_amount}
                  onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Rent Limit</label>
                <input
                  type="number"
                  value={formData.room_rent_limit}
                  onChange={(e) => setFormData({ ...formData, room_rent_limit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Per day limit"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employer Contribution %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.employer_percent}
                  onChange={(e) => setFormData({ ...formData, employer_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Contribution %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.employee_percent}
                  onChange={(e) => setFormData({ ...formData, employee_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Co-pay %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.copay_percentage}
                  onChange={(e) => setFormData({ ...formData, copay_percentage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Policy Features */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4">Policy Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waiting Period (days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.waiting_period_days}
                  onChange={(e) => setFormData({ ...formData, waiting_period_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-7">
                <input
                  type="checkbox"
                  id="maternity"
                  checked={formData.maternity_coverage}
                  onChange={(e) => setFormData({ ...formData, maternity_coverage: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="maternity" className="text-sm font-medium text-gray-700">Maternity Coverage</label>
              </div>
              <div className="flex items-center gap-2 pt-7">
                <input
                  type="checkbox"
                  id="pre_existing"
                  checked={formData.pre_existing_coverage}
                  onChange={(e) => setFormData({ ...formData, pre_existing_coverage: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="pre_existing" className="text-sm font-medium text-gray-700">Pre-existing Coverage</label>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Details</label>
              <textarea
                value={formData.coverage_details}
                onChange={(e) => setFormData({ ...formData, coverage_details: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Detailed coverage information, exclusions, etc."
              />
            </div>
          </div>

          {/* Benefits */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold text-gray-900">Policy Benefits</h3>
              <button
                type="button"
                onClick={addBenefit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus size={16} />
                Add Benefit
              </button>
            </div>
            {benefits.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-sm">No benefits added yet. Click "Add Benefit" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={benefit.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-medium text-gray-500">Benefit #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeBenefit(benefit.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Benefit title"
                        value={benefit.title}
                        onChange={(e) => updateBenefit(benefit.id, 'title', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Icon name (e.g., hospital, shield)"
                        value={benefit.icon}
                        onChange={(e) => updateBenefit(benefit.id, 'icon', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <textarea
                      placeholder="Benefit description"
                      value={benefit.description}
                      onChange={(e) => updateBenefit(benefit.id, 'description', e.target.value)}
                      className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Attachments */}
          {policy?.id && (
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-4">Policy Attachments</h3>

              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Documents</label>
                <input
                  id="policy-files"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">Supported: PDF, DOC, DOCX, JPG, PNG (Max 10 files). Files will be uploaded when you save the policy.</p>
              </div>

              {/* Selected Files (not yet uploaded) */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-medium text-gray-700">Files to Upload</label>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText size={20} className="text-blue-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {file.type} • {(file.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Uploaded Files</label>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText size={20} className="text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate">{attachment.file_name}</div>
                          <div className="text-xs text-gray-500">
                            {attachment.file_type} • {(attachment.file_size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Download"
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleMarkAttachmentForDeletion(attachment.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active Policy</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-full text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyDetailsModal({ policy, onClose }: { policy: any; onClose: () => void }) {
  if (!policy) return null;

  const [attachments, setAttachments] = React.useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = React.useState(true);

  // Fetch attachments when modal opens
  React.useEffect(() => {
    const fetchAttachments = async () => {
      if (!policy?.id) return;
      try {
        const data = await apiClient<any[]>(`/insurance/policies/${policy.id}/attachments`, {
          method: "GET",
          withAuth: true,
        });
        setAttachments(data || []);
      } catch (error: any) {
        console.error("Failed to fetch attachments:", error);
      } finally {
        setLoadingAttachments(false);
      }
    };
    fetchAttachments();
  }, [policy?.id]);

  // Parse benefits if it's a JSON string
  const parseBenefits = (benefits: any) => {
    if (!benefits) return [];
    if (Array.isArray(benefits)) return benefits;
    if (typeof benefits === 'string') {
      try {
        const parsed = JSON.parse(benefits);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const benefitsList = parseBenefits(policy.benefits);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Policy Details</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Policy Name</div>
                  <div className="font-semibold text-gray-900">{policy.policy_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Provider</div>
                  <div className="font-semibold text-gray-900">{policy.provider_name}</div>
                </div>
                {policy.policy_number && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Policy Number</div>
                    <div className="font-mono text-sm text-gray-900">{policy.policy_number}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Policy Type</div>
                  <div className="font-semibold text-gray-900 capitalize">{policy.type}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <div>
                    {policy.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium border border-green-200">
                        <CheckCircle size={12} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium border border-gray-200">
                        <XCircle size={12} /> Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Financial Details</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Coverage Amount</div>
                  <div className="font-bold text-indigo-600 text-lg">
                    ₹{Number(policy.coverage_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Premium Amount</div>
                  <div className="font-bold text-green-600 text-lg">
                    ₹{Number(policy.premium_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Employer Contribution</div>
                  <div className="font-semibold text-blue-600">
                    {policy.employer_percent ? `${policy.employer_percent}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Employee Contribution</div>
                  <div className="font-semibold text-orange-600">
                    {policy.employee_percent ? `${policy.employee_percent}%` : 'N/A'}
                  </div>
                </div>
                {policy.room_rent_limit && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Room Rent Limit</div>
                    <div className="font-semibold text-gray-900">
                      ₹{Number(policy.room_rent_limit).toLocaleString()}/day
                    </div>
                  </div>
                )}
                {policy.copay_percentage > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Co-pay</div>
                    <div className="font-semibold text-gray-900">{policy.copay_percentage}%</div>
                  </div>
                )}
              </div>
            </div>

            {/* Policy Benefits */}
            {benefitsList.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Policy Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {benefitsList.map((benefit: any, index: number) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="font-semibold text-green-900 text-sm mb-1">{benefit.title}</div>
                      {benefit.description && (
                        <div className="text-xs text-green-700">{benefit.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policy Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Policy Features</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Waiting Period</div>
                  <div className="font-semibold text-gray-900">
                    {policy.waiting_period_days ? `${policy.waiting_period_days} days` : 'None'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Maternity Coverage</div>
                  <div className="font-semibold text-gray-900">
                    {policy.maternity_coverage ? '✅ Yes' : '❌ No'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Pre-existing Coverage</div>
                  <div className="font-semibold text-gray-900">
                    {policy.pre_existing_coverage ? '✅ Yes' : '❌ No'}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {policy.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Description</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{policy.description}</p>
                </div>
              </div>
            )}

            {/* Coverage Details */}
            {policy.coverage_details && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Coverage Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{policy.coverage_details}</p>
                </div>
              </div>
            )}

            {/* Policy Attachments */}
            {!loadingAttachments && attachments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Policy Documents</h3>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText size={20} className="text-blue-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate group-hover:text-blue-600">
                            {attachment.file_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {attachment.file_type} • {(attachment.file_size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <Eye size={16} className="text-blue-600 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">System Information</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg text-xs">
                <div>
                  <div className="text-gray-500 mb-1">Policy ID</div>
                  <div className="font-mono text-gray-900">{policy.id}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Provider ID</div>
                  <div className="font-mono text-gray-900">{policy.provider_id}</div>
                </div>
                {policy.created_at && (
                  <div>
                    <div className="text-gray-500 mb-1">Created At</div>
                    <div className="text-gray-900">{new Date(policy.created_at).toLocaleDateString()}</div>
                  </div>
                )}
                {policy.updated_at && (
                  <div>
                    <div className="text-gray-500 mb-1">Last Updated</div>
                    <div className="text-gray-900">{new Date(policy.updated_at).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

