"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { Upload, Download, X, Plus, Edit, Trash2, Calendar, User, DollarSign, FileText } from "lucide-react";

interface OtherDeduction {
  id: number;
  employee_id: number;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    employee_code?: string;
  };
  amount: number;
  reason: string;
  month: string;
  site_id?: number;
  created_at: string;
}

export default function OtherDeductionsManagement() {
  const { role, permissions } = useAuth();
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const canManage = isOrgAdmin || hasPerm("EMP_ADD") || hasPerm("HR_MODE") || hasPerm("PAYROLL_ADMIN");

  const [deductions, setDeductions] = useState<OtherDeduction[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<OtherDeduction | null>(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    amount: "",
    reason: "",
    month: new Date().toISOString().slice(0, 7),
  });
  const [selectedSiteId, setSelectedSiteId] = useState<number | string>("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deductionsData, employeesData, sitesData] = await Promise.all([
        apiClient(`/attendance/other-deductions?month=${selectedMonth}`, { withAuth: true }),
        apiClient<any>("/organization/employees", { withAuth: true }),
        apiClient<any>("/sites", { withAuth: true }),
      ]);

      setDeductions(deductionsData || []);
      const employeeList = Array.isArray(employeesData?.data) ? employeesData.data : (Array.isArray(employeesData) ? employeesData : []);
      setEmployees(employeeList);
      const siteList = Array.isArray(sitesData?.sites) ? sitesData.sites : (Array.isArray(sitesData) ? sitesData : []);
      setSites(siteList);
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDeduction
        ? `/attendance/other-deductions/${editingDeduction.id}`
        : "/attendance/other-deductions";
      const method = editingDeduction ? "PUT" : "POST";
      await apiClient(url, {
        method,
        body: {
          ...formData,
          amount: Number(formData.amount),
          employee_id: Number(formData.employee_id),
        },
        withAuth: true,
      });
      setShowModal(false);
      setEditingDeduction(null);
      setFormData({
        employee_id: "",
        amount: "",
        reason: "",
        month: selectedMonth,
      });
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to save deduction");
    }
  };

  const handleEdit = (deduction: OtherDeduction) => {
    setEditingDeduction(deduction);
    setFormData({
      employee_id: String(deduction.employee_id),
      amount: String(deduction.amount),
      reason: deduction.reason,
      month: deduction.month,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this deduction?")) return;
    try {
      await apiClient(`/attendance/other-deductions/${id}`, {
        method: "DELETE",
        withAuth: true,
      });
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to delete deduction");
    }
  };

  const downloadTemplate = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
      const response = await fetch(
        `${baseUrl}/attendance/other-deductions/template?site_id=${selectedSiteId}&month=${selectedMonth}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download template");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `Other_Deductions_Template_${selectedSiteId === "all" ? "All_Sites" : `Site_${selectedSiteId}`}_${selectedMonth}.xlsx`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error?.message || "Failed to download template");
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      parseExcel(file);
    }
  };

  const parseExcel = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        setImportPreview(jsonData.slice(0, 10));
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Failed to parse Excel:", error);
      alert("Failed to parse Excel file");
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
      const response = await fetch(`${baseUrl}/attendance/other-deductions/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Import failed");
      }
      setImportResults(data);
      setShowImport(false);
      setImportFile(null);
      setImportPreview([]);
      fetchData();
    } catch (error: any) {
      alert(error?.message || "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You don't have permission to access this feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Other Deductions</h1>
          <p className="text-gray-600 mt-1">Manage manual deductions for employees</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Upload size={20} />
            Import Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Deduction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Results */}
      {importResults && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Import Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-800">Imported: {importResults.imported || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800">Skipped (amount 0): {importResults.skipped || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Deductions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading deductions...</p>
        </div>
      ) : deductions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">No deductions found for this month</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deductions.map((deduction) => (
                <tr key={deduction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {deduction.employee
                            ? `${deduction.employee.first_name} ${deduction.employee.last_name}`
                            : "Unknown Employee"}
                        </p>
                        {deduction.employee?.employee_code && (
                          <p className="text-xs text-gray-500">{deduction.employee.employee_code}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      {deduction.month}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-red-500" />
                      <span className="font-semibold text-red-600">₹{Number(deduction.amount).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{deduction.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(deduction)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(deduction.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDeduction ? "Edit Deduction" : "Add Deduction"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingDeduction(null); }}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} {emp.employee_code ? `(${emp.employee_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for deduction"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingDeduction(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingDeduction ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Import Other Deductions</h2>
              <button onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); }}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 1: Download Template</h3>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Sites</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} {site.city ? `(${site.city})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Download size={18} />
                    Download
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 2: Upload Excel</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFileChange}
                    className="hidden"
                    id="import-file"
                  />
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                    <p className="text-gray-600">{importFile ? importFile.name : "Click to upload or drag and drop"}</p>
                    <p className="text-xs text-gray-500">Excel file only</p>
                  </label>
                </div>
              </div>

              {importPreview.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">Preview (first 10 records)</h3>
                    <button
                      onClick={handleImport}
                      disabled={importLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {importLoading ? "Importing..." : "Import"}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(importPreview[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="px-3 py-2 text-gray-600">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
