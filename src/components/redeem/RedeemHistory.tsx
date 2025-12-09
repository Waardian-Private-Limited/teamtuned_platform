"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

type Props = {
  employeeId: number;
  employeeName?: string;
};

export default function RedeemHistory({ employeeId, employeeName }: Props) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Array<Record<string, any>>>([]);
  const [page, setPage] = React.useState<number>(1);
  const [limit] = React.useState<number>(10);
  const [total, setTotal] = React.useState<number>(0);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalAvailableMinutes, setTotalAvailableMinutes] = React.useState<number>(0);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>("/attendance/redeems", {
        method: "GET",
        withAuth: true,
        params: {
          employee_id: String(employeeId),
          page: String(page),
          limit: String(limit)
        }
      });

      const list = Array.isArray(res?.rows) ? res.rows : [];
      setRows(list);
      setTotal(res?.pagination?.total || 0);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalAvailableMinutes(res?.stats?.totalAvailableMinutes || 0);
    } catch (e: any) {
      setError(e?.message || "Failed to load redeem history");
    } finally {
      setLoading(false);
    }
  }, [employeeId, page, limit]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fmtHM = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
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

  const getRedeemStatus = (row: Record<string, any>) => {
    const isUsed = row.is_used === 1 || row.is_used === true;
    const validTill = row.redeem_upto;

    if (isUsed) {
      return {
        status: 'Used',
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        border: 'border-gray-200',
        icon: CheckCircle
      };
    }

    if (validTill) {
      const now = new Date();
      const validDate = new Date(validTill);
      // Set to end of the day (23:59:59.999) to ensure it's valid for the whole day
      validDate.setHours(23, 59, 59, 999);

      // Check if expired (validDate < now)
      if (validDate < now) {
        return {
          status: 'Expired',
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: XCircle
        };
      }
    }

    return {
      status: 'Available',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: Zap
    };
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      {/* Fixed Header Section */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm z-10">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header Title & Refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {totalAvailableMinutes > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {fmtHM(totalAvailableMinutes)} available
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={fetchList}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-xs text-gray-600 mt-0.5">Total Entries</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {fmtHM(rows.filter(r => getRedeemStatus(r).status === 'Available').reduce((sum, r) => sum + (Number(r.redeem_minutes) || 0), 0))}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Available</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-600">
                {rows.filter(r => getRedeemStatus(r).status === 'Used').length}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Used</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Empty State */}
          {!loading && rows.length === 0 && !error && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm mt-8">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-base font-medium text-gray-900 mb-1">No redeem entries</div>
              <div className="text-sm text-gray-500">No redeem history found for this period</div>
            </div>
          )}

          {/* Redeem List */}
          {!loading && rows.length > 0 && (
            <div className="space-y-3 pb-4">
              {rows.map((row, index) => {
                const minutes = Number(row.redeem_minutes) || 0;
                const statusConfig = getRedeemStatus(row);
                const StatusIcon = statusConfig.icon;
                const sourceId = row.source_attendance_id;
                const remarks = row.remarks;
                const createdAt = row.created_at;

                return (
                  <div
                    key={row.id || index}
                    className={`bg-white rounded-xl border ${statusConfig.border} p-4 transition-all hover:shadow-md group`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl ${statusConfig.bg} group-hover:scale-105 transition-transform`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-semibold text-gray-900">
                              {fmtHM(minutes)}
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                              {statusConfig.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {remarks || "Late logout redeem"}
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 mt-3">
                            {sourceId && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                <FileText className="w-3 h-3" />
                                <span>Att #{sourceId}</span>
                              </div>
                            )}
                            {row.redeem_for_date && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                <Calendar className="w-3 h-3" />
                                <span>Used: {formatDate(row.redeem_for_date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {formatDate(createdAt)}
                        </div>
                        {row.redeem_upto && statusConfig.status === 'Available' && (
                          <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block">
                            Expires {formatDate(row.redeem_upto)}
                          </div>
                        )}
                        {statusConfig.status === 'Expired' && row.redeem_upto && (
                          <div className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-100 inline-block">
                            Expired on {formatDate(row.redeem_upto)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium text-gray-900">{Math.min((page - 1) * limit + 1, total)}</span> to <span className="font-medium text-gray-900">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-900">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium text-gray-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="hidden sm:flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = page - 2 + i;
                    if (page < 3) p = i + 1;
                    if (page > totalPages - 2) p = totalPages - 4 + i;

                    if (p > 0 && p <= totalPages) {
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${page === p
                            ? 'bg-black text-white shadow-md scale-105'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium text-gray-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}