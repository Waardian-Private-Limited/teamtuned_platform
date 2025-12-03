"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { BarChart3, PieChart, TrendingUp, Download } from "lucide-react";

export default function InsuranceReports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await apiClient<any>("/insurance/dashboard/stats", { method: "GET", withAuth: true });
      setStats(data?.stats);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading reports...</div>;

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Reports</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cost Summary</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Monthly Premium</span>
              <span className="font-bold text-gray-900">{formatCurrency(stats?.total_monthly_premium)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-gray-700">Company Contribution</span>
              <span className="font-bold text-green-600">{formatCurrency(stats?.employer_contribution)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-gray-700">Employee Contribution</span>
              <span className="font-bold text-blue-600">{formatCurrency(stats?.employee_contribution)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Coverage Statistics</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <span className="text-gray-700">Active Employees Insured</span>
              <span className="font-bold text-purple-600">{stats?.active_employees_insured || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Not Insured Employees</span>
              <span className="font-bold text-gray-600">{stats?.not_insured_employees || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="text-gray-700">Total Active Policies</span>
              <span className="font-bold text-indigo-600">{stats?.total_policies || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{stats?.renewals_this_month || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Renewals This Month</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{stats?.expiring_soon || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Expiring Soon (30 days)</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{stats?.expired_policies || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Expired (Not Renewed)</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{stats?.total_providers || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Active Providers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

