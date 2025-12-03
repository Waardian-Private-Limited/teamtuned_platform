"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import type { Method } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import {
  Search, UserPlus, History, RefreshCw, XCircle, CheckCircle, ArrowRightLeft,
  Filter, ChevronLeft, ChevronRight, X, AlertTriangle, Calendar, Edit, Download
} from "lucide-react";

export default function InsuranceEnrollment() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filters
  const [filterProvider, setFilterProvider] = useState("");
  const [filterPolicyType, setFilterPolicyType] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, insured, not-insured
  const [filterExpiringDays, setFilterExpiringDays] = useState("");

  // Pagination from backend
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchPoliciesAndProviders();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await apiClient<any[]>("/organization/departments", { method: "GET", withAuth: true });
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentPage, search, filterProvider, filterPolicyType, filterStatus, filterExpiringDays]);

  const fetchPoliciesAndProviders = async () => {
    try {
      const [policiesData, providersData] = await Promise.all([
        apiClient<any[]>("/insurance/policies", { method: "GET", withAuth: true }),
        apiClient<any[]>("/insurance/providers", { method: "GET", withAuth: true }),
      ]);
      setPolicies(policiesData || []);
      setProviders(providersData || []);
    } catch (error: any) {
      showError(error?.message || "Failed to fetch policies and providers");
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params: any = {
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      };

      if (search) params.search = search;
      if (filterProvider) params.provider_id = filterProvider;
      if (filterPolicyType) params.policy_type = filterPolicyType;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterExpiringDays) params.expiring_days = filterExpiringDays;

      const data = await apiClient<any>("/insurance/enrollment/employees", {
        method: "GET",
        withAuth: true,
        params
      });

      setEmployees(data?.employees || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalEmployees(data?.pagination?.total || 0);
    } catch (error: any) {
      showError(error?.message || "Failed to fetch employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees - This is now handled by the backend
  // const filteredEmployees = employees.filter((e) => {
  //   const matchesSearch =
  //     (e.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
  //     (e.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
  //     (e.email || "").toLowerCase().includes(search.toLowerCase());

  //   // For now, we'll implement status filter on frontend
  //   // In production, this should be done on backend with enrollment data
  //   return matchesSearch;
  // });

  // Pagination - This is now handled by the backend
  // const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  // const startIndex = (currentPage - 1) * itemsPerPage;
  // const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const clearFilters = () => {
    setSearch("");
    setFilterProvider("");
    setFilterPolicyType("");
    setFilterStatus("all");
    setFilterExpiringDays("");
    setCurrentPage(1);
  };

  const hasActiveFilters = search || filterProvider || filterPolicyType || filterStatus !== "all" || filterExpiringDays;

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Enrollment</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={fetchEmployees}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterProvider}
            onChange={(e) => handleFilterChange(setFilterProvider, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterPolicyType}
            onChange={(e) => handleFilterChange(setFilterPolicyType, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Policy Types</option>
            <option value="health">Health</option>
            <option value="life">Life</option>
            <option value="accident">Accident</option>
            <option value="disability">Disability</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Employees</option>
            <option value="insured">Insured Only</option>
            <option value="not-insured">Not Insured</option>
          </select>

          <select
            value={filterExpiringDays}
            onChange={(e) => handleFilterChange(setFilterExpiringDays, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Expiring Filter</option>
            <option value="7">Expiring in 7 days</option>
            <option value="30">Expiring in 30 days</option>
            <option value="60">Expiring in 60 days</option>
            <option value="90">Expiring in 90 days</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Insurance Coverage</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-indigo-600" />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {hasActiveFilters ? "No employees match your filters." : "No employees found."}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          {(emp.first_name || '?')[0]}{(emp.last_name || '')[0] || ''}
                        </div>
                        <div>
                          <div className="font-semibold">{emp.first_name} {emp.last_name}</div>
                          <div className="text-xs text-gray-500">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                        {emp.department_name || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {emp.active_policies_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-semibold border border-gray-200">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {emp.active_policies_count > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                            <CheckCircle size={12} />
                            {emp.active_policies_count} {emp.active_policies_count === 1 ? 'Policy' : 'Policies'}
                          </span>
                          {emp.policy_names && (
                            <div className="text-xs text-gray-500 truncate max-w-xs" title={emp.policy_names}>
                              {emp.policy_names}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          <XCircle size={12} />
                          Not Insured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setSelectedEmployee(emp); setHistoryModalOpen(true); }}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <UserPlus size={16} />
                        Manage Insurance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && employees.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalEmployees)}</span> of{" "}
              <span className="font-medium">{totalEmployees}</span> employees
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, current, and adjacent pages
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                          ? "bg-indigo-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                          }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {historyModalOpen && selectedEmployee && (
        <EmployeeInsuranceModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          employee={selectedEmployee}
          policies={policies}
          onUpdated={fetchEmployees}
        />
      )}

      {exportModalOpen && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          departments={departments}
        />
      )}
    </div>
  );
}

function EmployeeInsuranceModal({ isOpen, onClose, employee, policies, onUpdated }: { isOpen: boolean; onClose: () => void; employee: any; policies: any[]; onUpdated: () => void }) {
  const [activeInsurance, setActiveInsurance] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState<"none" | "enroll" | "renew" | "change" | "cancel" | "edit">("none");
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);

  useEffect(() => {
    fetchInsurance();
  }, [employee]);

  const fetchInsurance = async () => {
    setLoading(true);
    try {
      const data = await apiClient<any>(`/insurance/enrollment/employee/${employee.id}`, { method: "GET", withAuth: true });
      setActiveInsurance(data?.active || []);
      setHistory(data?.history || []);
    } catch (error: any) {
      showError(error?.message || "Failed to fetch insurance");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setAction("none");
    fetchInsurance();
    onUpdated();
  };

  if (action !== "none") {
    return (
      <EnrollmentActionModal
        isOpen={true}
        onClose={() => setAction("none")}
        type={action}
        employee={employee}
        policies={policies}
        enrollment={selectedEnrollment}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-900 flex justify-between items-center bg-black text-white">
          <div>
            <h2 className="text-lg font-bold">Insurance Management</h2>
            <p className="text-sm opacity-80">{employee.first_name} {employee.last_name} • {employee.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" /> Active Policies
              </h3>
              <button
                onClick={() => { setSelectedEnrollment(null); setAction("enroll"); }}
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors"
              >
                <UserPlus size={16} /> Enroll New
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : activeInsurance.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <XCircle size={48} className="text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No active insurance policies</p>
                <p className="text-sm text-gray-500 mt-1">Click "Enroll New" to add a policy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeInsurance.map((enroll: any) => (
                  <div key={enroll.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Policy</div>
                        <div className="font-semibold text-gray-900 text-lg">{enroll.policy_name}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                          <span>ID: <strong className="text-gray-700">#{enroll.id}</strong></span>
                          {enroll.certificate_number && (
                            <span>Cert: <strong className="text-gray-700">{enroll.certificate_number}</strong></span>
                          )}
                          {enroll.policy_number && (
                            <span>Policy No: <strong className="text-gray-700">{enroll.policy_number}</strong></span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedEnrollment(enroll); setAction("renew"); }}
                          className="text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => { setSelectedEnrollment(enroll); setAction("edit"); }}
                          className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button
                          onClick={() => { setSelectedEnrollment(enroll); setAction("change"); }}
                          className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <ArrowRightLeft size={14} /> Change
                        </button>
                        <button
                          onClick={() => { setSelectedEnrollment(enroll); setAction("cancel"); }}
                          className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-gray-100 pt-3 mt-3">
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Provider</div>
                        <div className="font-medium text-gray-900">{enroll.provider_name}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Type</div>
                        <div className="font-medium text-gray-900 capitalize">{enroll.policy_type || enroll.type}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Start Date</div>
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDDMMYYYY(enroll.start_date)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">End Date</div>
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDDMMYYYY(enroll.end_date)}
                        </div>
                      </div>

                      {/* Financials Row */}
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Sum Insured</div>
                        <div className="font-medium text-gray-900">
                          {enroll.sum_insured ? formatCurrency(enroll.sum_insured) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Emp. Premium</div>
                        <div className="font-medium text-gray-900">
                          {enroll.premium_employee ? formatCurrency(enroll.premium_employee) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Comp. Premium</div>
                        <div className="font-medium text-gray-900">
                          {enroll.premium_company ? formatCurrency(enroll.premium_company) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Dependents</div>
                        <div className="font-medium text-gray-900">
                          {enroll.dependent_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <History size={18} className="text-gray-600" /> Enrollment History
              </h3>
              <button
                onClick={fetchInsurance}
                className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                No enrollment history.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((enroll: any) => (
                  <div key={enroll.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                      <div className="col-span-2 md:col-span-1">
                        <div className="text-gray-500 text-xs">Policy</div>
                        <div className="font-medium text-gray-900 truncate" title={enroll.policy_name}>{enroll.policy_name}</div>
                        <div className="text-xs text-gray-400">#{enroll.id}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Period</div>
                        <div className="font-medium text-gray-900 text-xs">
                          {formatDDMMYYYY(enroll.start_date)} - {formatDDMMYYYY(enroll.end_date)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Sum Insured</div>
                        <div className="font-medium text-gray-900 text-xs">
                          {enroll.sum_insured ? formatCurrency(enroll.sum_insured) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Premium (E/C)</div>
                        <div className="font-medium text-gray-900 text-xs">
                          {enroll.premium_employee ? formatCurrency(enroll.premium_employee) : '0'} / {enroll.premium_company ? formatCurrency(enroll.premium_company) : '0'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Status</div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${enroll.status === 'expired' ? 'bg-gray-200 text-gray-700' :
                          enroll.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                          {enroll.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div >
      </div >
    </div >
  );
}

function EnrollmentActionModal({ isOpen, onClose, type, employee, policies, enrollment, onSuccess }: { isOpen: boolean; onClose: () => void; type: "enroll" | "renew" | "change" | "cancel" | "edit"; employee: any; policies: any[]; enrollment?: any; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | string>(enrollment?.policy_id || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // New fields
  const [certificateNumber, setCertificateNumber] = useState(enrollment?.certificate_number || "");
  const [sumInsured, setSumInsured] = useState(enrollment?.sum_insured || "");
  const [premiumEmployee, setPremiumEmployee] = useState(enrollment?.premium_employee || "");
  const [premiumCompany, setPremiumCompany] = useState(enrollment?.premium_company || "");
  const [notes, setNotes] = useState(enrollment?.notes || "");

  // Auto-fill fields when policy is selected
  useEffect(() => {
    if (selectedPolicyId && type !== "renew") {
      const policy = policies.find(p => p.id.toString() === selectedPolicyId.toString());
      if (policy) {
        if (!sumInsured) setSumInsured(policy.coverage_amount || "");

        // Calculate premiums if not set
        if (policy.premium_amount) {
          const premium = Number(policy.premium_amount);

          if (!premiumEmployee && policy.employee_percent) {
            const empShare = (premium * Number(policy.employee_percent)) / 100;
            setPremiumEmployee(empShare.toFixed(2));
          }

          if (!premiumCompany && policy.employer_percent) {
            const compShare = (premium * Number(policy.employer_percent)) / 100;
            setPremiumCompany(compShare.toFixed(2));
          }
        }
      }
    }
  }, [selectedPolicyId, policies, type]);

  // Auto-fill dates for renewal
  useEffect(() => {
    if (type === "renew" && enrollment) {
      // Default start date to day after previous end date
      if (enrollment.end_date) {
        const end = new Date(enrollment.end_date);
        end.setDate(end.getDate() + 1);
        setStartDate(end.toISOString().split('T')[0]);

        // Default end date to 1 year after start
        const nextYear = new Date(end);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        nextYear.setDate(nextYear.getDate() - 1);
        setEndDate(nextYear.toISOString().split('T')[0]);
      }
    }
  }, [type, enrollment]);

  // Auto-fill dates for edit
  useEffect(() => {
    if (type === "edit" && enrollment) {
      if (enrollment.start_date) {
        setStartDate(enrollment.start_date.split('T')[0]);
      }
      if (enrollment.end_date) {
        setEndDate(enrollment.end_date.split('T')[0]);
      }
    }
  }, [type, enrollment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === "cancel") {
      // Show confirmation for cancel
      if (!confirm(`Are you sure you want to cancel this insurance policy for ${employee.first_name} ${employee.last_name}?`)) {
        return;
      }
    }

    setSaving(true);
    try {
      let url: string, method: Method, body: any;

      const commonBody = {
        start_date: startDate,
        end_date: endDate,
        certificate_number: certificateNumber,
        sum_insured: sumInsured ? Number(sumInsured) : null,
        premium_employee: premiumEmployee ? Number(premiumEmployee) : 0,
        premium_company: premiumCompany ? Number(premiumCompany) : 0,
        notes: notes
      };

      if (type === "enroll") {
        url = "/insurance/enrollment";
        method = 'POST';
        body = {
          employee_id: employee.id,
          policy_id: selectedPolicyId,
          ...commonBody
        };
      } else if (type === "cancel") {
        url = `/insurance/enrollment/${enrollment?.id}/cancel`;
        method = 'POST';
        body = {};
      } else if (type === "renew") {
        url = `/insurance/enrollment/${enrollment?.id}/renew`;
        method = 'POST';
        body = commonBody;
      } else if (type === "change") {
        url = `/insurance/enrollment/${enrollment?.id}/change`;
        method = 'POST';
        body = {
          new_policy_id: selectedPolicyId,
          ...commonBody
        };
      } else if (type === "edit") {
        url = `/insurance/enrollment/${enrollment?.id}`;
        method = 'PUT';
        body = commonBody;
      }

      await apiClient(url!, { method: method!, body, withAuth: true });
      showSuccess(`Insurance ${type}ed successfully`);
      onSuccess();
    } catch (error: any) {
      showError(error?.message || `Failed to ${type} insurance`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-900 flex justify-between items-center bg-black text-white flex-shrink-0">
          <h2 className="text-lg font-semibold capitalize">{type} Insurance</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "cancel" ? (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Confirm Cancellation</p>
                  <p className="text-sm text-red-700 mt-1">
                    This will cancel the insurance policy "{enrollment?.policy_name}" for {employee.first_name} {employee.last_name}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {(type === "enroll" || type === "change") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy *</label>
                    <select
                      required
                      value={selectedPolicyId}
                      onChange={(e) => setSelectedPolicyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Policy</option>
                      {policies.filter(p => p.is_active).map((p) => (
                        <option key={p.id} value={p.id}>{p.policy_name} - {p.provider_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {type === "edit" && enrollment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy</label>
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 font-medium">
                      {enrollment.policy_name}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      required
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      required
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                    <input
                      type="text"
                      placeholder="e.g. CERT-12345"
                      value={certificateNumber}
                      onChange={(e) => setCertificateNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sum Insured</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={sumInsured}
                      onChange={(e) => setSumInsured(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Premium</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={premiumEmployee}
                      onChange={(e) => setPremiumEmployee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Premium</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={premiumCompany}
                      onChange={(e) => setPremiumCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional notes about this enrollment..."
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${type === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {saving ? "Saving..." : type === "enroll" ? "Enroll Employee" : type === "renew" ? "Renew Policy" : type === "change" ? "Change Policy" : type === "edit" ? "Update Enrollment" : "Confirm Cancellation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ isOpen, onClose, departments }: { isOpen: boolean; onClose: () => void; departments: any[] }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("all");
  const [expiringDays, setExpiringDays] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient("/insurance/enrollment/export", {
        method: "POST",
        withAuth: true,
        body: {
          email,
          status,
          expiring_days: expiringDays,
          department_id: departmentId
        }
      });
      showSuccess("Report will be sent to your email shortly");
      onClose();
    } catch (error: any) {
      showError(error?.message || "Failed to export report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Export Enrollment Report</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleExport} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send Report To (Email)</label>
            <input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to send to your registered email.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Employees</option>
              <option value="insured">Insured Only</option>
              <option value="not-insured">Not Insured Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Filter</label>
            <select
              value={expiringDays}
              onChange={(e) => setExpiringDays(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Expiries</option>
              <option value="30">Expiring in 30 Days</option>
              <option value="60">Expiring in 60 Days</option>
              <option value="90">Expiring in 90 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Filter</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
              Send Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
const formatDDMMYYYY = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(Number(amount));
};
