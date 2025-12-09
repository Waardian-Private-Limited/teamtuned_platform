"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Coffee,
  Heart,
  Umbrella,
  Zap,
  MoreHorizontal,
  ChevronRight,
  Filter,
  Download,
  FileText,
  User,
  Check,
  X,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

type Props = {
  employeeId: number;
  employeeName?: string;
};

export default function LeavesManagement({ employeeId, employeeName }: Props) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [balances, setBalances] = React.useState<Array<Record<string, any>>>([]);
  const [applications, setApplications] = React.useState<Array<Record<string, any>>>([]);
  const [compoff, setCompoff] = React.useState<Array<Record<string, any>>>([]);

  // Period filtering
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth() + 1);
  const years = [2024, 2025, 2026];

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch leave balances and compoff together
      let balancesData: any[] = [];
      let compoffData: any[] = [];
      try {
        const res = await apiClient<any>("/leaves/summary", {
          method: "GET",
          withAuth: true,
          params: {
            employee_id: String(employeeId),
            period_year: String(selectedYear),
            period_month: String(selectedMonth)
          }
        });
        balancesData = Array.isArray(res?.leave_balances) ? res.leave_balances : [];
        compoffData = Array.isArray(res?.compoff) ? res.compoff : [];
      } catch (e) {
        console.warn("Summary endpoint failed");
      }

      // Fetch applications
      let applicationsData: any[] = [];
      try {
        const res2 = await apiClient<any>("/leaves/applications", {
          method: "GET",
          withAuth: true,
          params: {
            employee_id: String(employeeId),
            period_year: String(selectedYear),
            period_month: String(selectedMonth)
          }
        });
        applicationsData = Array.isArray(res2) ? res2 :
          Array.isArray(res2?.applications) ? res2.applications :
            Array.isArray(res2?.data) ? res2.data : [];
      } catch (e) {
        console.warn("Application endpoint failed");
      }

      setBalances(balancesData);
      setCompoff(compoffData);
      setApplications(applicationsData);

    } catch (e: any) {
      setError(e?.message || "Failed to load leaves data");
    } finally {
      setLoading(false);
    }
  }, [employeeId, selectedYear, selectedMonth]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLeaveTypeIcon = (leaveType: string) => {
    const type = leaveType?.toLowerCase() || '';
    if (type.includes('casual') || type.includes('paid')) return Coffee;
    if (type.includes('sick')) return Heart;
    if (type.includes('comp')) return Zap;
    return Umbrella;
  };

  const getLeaveTypeColor = (leaveType: string) => {
    const type = leaveType?.toLowerCase() || '';
    if (type.includes('casual')) return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' };
    if (type.includes('sick')) return { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' };
    if (type.includes('paid')) return { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' };
    if (type.includes('comp')) return { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' };
    return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  };

  const getStatusConfig = (status: string) => {
    const stat = status?.toLowerCase() || '';
    if (stat.includes('approved')) return {
      color: '#16a34a',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: CheckCircle
    };
    if (stat.includes('rejected')) return {
      color: '#dc2626',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: XCircle
    };
    if (stat.includes('pending')) return {
      color: '#f59e0b',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: Clock
    };
    return {
      color: '#6b7280',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      icon: AlertCircle
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } catch {
      return 0;
    }
  };

  const getCompOffCount = () => {
    if (compoff.length === 0) return 0;
    return compoff.length;
  };

  // Calculate stats
  const totalLeaves = balances.reduce((sum, balance) => sum + Number(balance.remaining || 0), 0);
  const approvedCount = applications.filter(app => app.status?.toLowerCase() === 'approved').length;
  const pendingCount = applications.filter(app => app.status?.toLowerCase() === 'pending').length;
  const compOffCount = getCompOffCount();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employeeName || "Leave Management"}</h1>
            <p className="text-sm text-gray-600 mt-1">Manage leave applications and balances</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-12 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-gray-100 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-16 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="col-span-2 bg-gray-100 rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter Period:</span>
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>
              {new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>

        <button
          onClick={fetchData}
          className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Leaves</div>
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{totalLeaves}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Approved</div>
            <div className="p-1.5 bg-green-50 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{approvedCount}</div>
          <div className="text-xs text-gray-500">Applications</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Pending</div>
            <div className="p-1.5 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{pendingCount}</div>
          <div className="text-xs text-gray-500">Requests</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Comp-off</div>
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{compOffCount}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Balances */}
        <div className="col-span-1 space-y-6">
          {/* Leave Balances */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Leave Balances</h2>
            </div>
            <div className="p-4">
              {balances.length === 0 ? (
                <div className="text-center py-6">
                  <Umbrella className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <div className="text-gray-500 text-sm">No leave balances found</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {balances.map((balance, index) => {
                    const Icon = getLeaveTypeIcon(balance.leave_type);
                    const colors = getLeaveTypeColor(balance.leave_type);
                    const used = Number(balance.used || 0);
                    const total = Number(balance.total_allocated || 0);
                    const remaining = Number(balance.remaining || 0);

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                              <Icon className={`w-4 h-4 ${colors.text}`} />
                            </div>
                            <div>
                              <div className={`text-sm font-semibold ${colors.text}`}>
                                {balance.leave_type || 'Leave'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{remaining}</div>
                            <div className="text-xs text-gray-500">remaining</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{used} of {total} used</span>
                          <span>{total - used} remaining</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${total > 0 ? (used / total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Comp-off Balance */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Comp-off Balance</h2>
            </div>
            <div className="p-4">
              {compoff.length === 0 ? (
                <div className="text-center py-6">
                  <Zap className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <div className="text-gray-500 text-sm mb-1">No comp-off balance</div>
                  <div className="text-xs text-gray-400">
                    Comp-off days earned for overtime work
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {compoff.map((comp, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-purple-200 bg-purple-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 border border-purple-200">
                            <Zap className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-purple-700">
                              Comp-off {index + 1}
                            </div>
                            <div className="text-xs text-purple-500">
                              Earned on {formatDate(comp.date || '')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-purple-900">1</div>
                          <div className="text-xs text-purple-500">day</div>
                        </div>
                      </div>
                      {comp.remarks && (
                        <div className="text-xs text-purple-600 mt-2">
                          {comp.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Applications */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Leave Applications</h2>
                  <p className="text-sm text-gray-600 mt-1">Recent leave requests and their status</p>
                </div>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="text-gray-500 font-medium mb-1">No leave applications</div>
                <div className="text-sm text-gray-400">
                  Employee haven't applied for any leaves yet
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {applications.map((application, index) => {
                      const type = application.leave_type || 'Leave';
                      const status = application.status || 'Pending';
                      const startDate = application.start_date;
                      const endDate = application.end_date;
                      const partial = application.partial_day;
                      const days = application.duration_days || calculateDays(startDate, endDate);
                      const config = getStatusConfig(status);
                      const StatusIcon = config.icon;
                      const colors = getLeaveTypeColor(type);

                      return (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                                {React.createElement(getLeaveTypeIcon(type), {
                                  className: `w-4 h-4 ${colors.text}`
                                })}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{type}</div>
                                {partial && partial !== 'FULL' && (
                                  <div className="text-xs text-gray-500">{partial}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 whitespace-nowrap">
                              {formatDate(startDate)}
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              to {formatDate(endDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {days} day{days !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} border ${config.border}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span className={config.text}>
                                {status.toLowerCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {applications.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>Showing {applications.length} applications</div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="text-red-700 font-medium">{error}</div>
          <button
            onClick={fetchData}
            className="ml-auto text-red-700 hover:text-red-800 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}