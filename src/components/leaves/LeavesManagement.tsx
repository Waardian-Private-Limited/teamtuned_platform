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
  MoreHorizontal
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
          params: { employee_id: String(employeeId) } 
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
          params: { employee_id: String(employeeId) } 
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
  }, [employeeId]);

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
    if (type.includes('casual')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    if (type.includes('sick')) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    if (type.includes('paid')) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    if (type.includes('comp')) return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  };

  const getStatusConfig = (status: string) => {
    const stat = status?.toLowerCase() || '';
    if (stat.includes('approved')) return { color: '#22c55e', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle };
    if (stat.includes('rejected')) return { color: '#ef4444', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle };
    if (stat.includes('pending')) return { color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock };
    return { color: '#6b7280', bg: 'bg-gray-50', border: 'border-gray-200', icon: AlertCircle };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <div className="text-gray-600 font-medium">Loading leave data...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="text-red-700 font-medium">{error}</div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Header with Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                <div className="text-sm font-medium opacity-90">Total Leaves</div>
                <div className="text-2xl font-bold mt-1">
                  {balances.reduce((sum, balance) => sum + Number(balance.remaining || 0), 0)}
                </div>
                <div className="text-xs opacity-75 mt-1">Available</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
                <div className="text-sm font-medium opacity-90">Approved</div>
                <div className="text-2xl font-bold mt-1">
                  {applications.filter(app => app.status?.toLowerCase() === 'approved').length}
                </div>
                <div className="text-xs opacity-75 mt-1">Applications</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
                <div className="text-sm font-medium opacity-90">Pending</div>
                <div className="text-2xl font-bold mt-1">
                  {applications.filter(app => app.status?.toLowerCase() === 'pending').length}
                </div>
                <div className="text-xs opacity-75 mt-1">Requests</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                <div className="text-sm font-medium opacity-90">Comp-off</div>
                <div className="text-2xl font-bold mt-1">
                  {getCompOffCount()}
                </div>
                <div className="text-xs opacity-75 mt-1">Available</div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Leave Balances & Comp-off - Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Leave Balances */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Leave Balances</h2>
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                  </div>

                  {balances.length === 0 ? (
                    <div className="text-center py-6">
                      <Umbrella className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <div className="text-gray-500 text-sm">No leave balances found</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {balances.map((balance, index) => {
                        const Icon = getLeaveTypeIcon(balance.leave_type);
                        const colors = getLeaveTypeColor(balance.leave_type);
                        const used = Number(balance.used || 0);
                        const total = Number(balance.total_allocated || 0);
                        const remaining = Number(balance.remaining || 0);
                        const percentage = total > 0 ? (used / total) * 100 : 0;

                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-xl border ${colors.border} ${colors.bg} transition-all duration-200 hover:shadow-md`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                                  <Icon className={`w-4 h-4 ${colors.text}`} />
                                </div>
                                <div>
                                  <div className={`text-sm font-semibold ${colors.text}`}>
                                    {balance.leave_type || 'Leave'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {used} of {total} used
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-gray-900">{remaining}</div>
                                <div className="text-xs text-gray-500">remaining</div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Comp-off Balance */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Comp-off Balance</h2>
                    <Zap className="w-5 h-5 text-purple-500" />
                  </div>

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
                          className="p-4 rounded-xl border border-purple-200 bg-purple-50"
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
                                <div className="text-xs text-purple-500 capitalize">
                                  {comp.status?.toLowerCase() || 'pending'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-purple-900">1</div>
                              <div className="text-xs text-purple-500">day</div>
                            </div>
                          </div>
                          {comp.remarks && (
                            <div className="text-xs text-purple-600 mt-2 text-center">
                              {comp.remarks}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Applications - Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30">
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
                        You haven't applied for any leaves yet
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Leave Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Period
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Days
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {applications.map((application, index) => {
                            const type = application.leave_type || 'Leave';
                            const status = application.status || 'Pending';
                            const startDate = application.start_date;
                            const endDate = application.end_date;
                            const partial = application.partial_day;
                            const days = application.duration_days || calculateDays(startDate, endDate);
                            const config = getStatusConfig(status);
                            const StatusIcon = config.icon;

                            return (
                              <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${getLeaveTypeColor(type).bg} border ${getLeaveTypeColor(type).border}`}>
                                      {React.createElement(getLeaveTypeIcon(type), { 
                                        className: `w-3 h-3 ${getLeaveTypeColor(type).text}` 
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
                                <td className="px-4 py-3">
                                  <div className="text-sm text-gray-900 whitespace-nowrap">
                                    {formatDate(startDate)}
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    to {formatDate(endDate)}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {days} day{days !== 1 ? 's' : ''}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} border ${config.border}`}>
                                    <StatusIcon className="w-3 h-3" style={{ color: config.color }} />
                                    <span style={{ color: config.color }} className="capitalize">
                                      {status.toLowerCase()}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}