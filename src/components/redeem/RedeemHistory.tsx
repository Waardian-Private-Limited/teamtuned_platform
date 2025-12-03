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
  FileText
} from "lucide-react";

type Props = {
  employeeId: number;
  employeeName?: string;
};

export default function RedeemHistory({ employeeId, employeeName }: Props) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Array<Record<string, any>>>([]);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>("/attendance/redeems", { 
        method: "GET", 
        withAuth: true, 
        params: { employee_id: String(employeeId) } 
      });
      const list = Array.isArray(res?.rows) ? res.rows : 
                 Array.isArray(res?.data) ? res.data : [];
      setRows(list as any[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load redeem history");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '--';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
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

  const totalAvailable = React.useMemo(() => {
    return rows.filter(row => {
      const status = getRedeemStatus(row);
      return status.status === 'Available';
    }).reduce((sum, row) => sum + (Number(row.redeem_minutes) || 0), 0);
  }, [rows]);

  return (
    <div className="min-h-screen bg-gray-50/30 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            {totalAvailable > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {fmtHM(totalAvailable)} available
                </span>
              </div>
            )}
            
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Total Entries</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {fmtHM(rows.filter(r => getRedeemStatus(r).status === 'Available').reduce((sum, r) => sum + (Number(r.redeem_minutes) || 0), 0))}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">Available</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {rows.filter(r => getRedeemStatus(r).status === 'Used').length}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">Used</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-3" />
            <div className="text-sm text-gray-600">Loading redeem history...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && rows.length === 0 && !error && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-gray-900 mb-1">No redeem entries</div>
            <div className="text-xs text-gray-600">No redeem history found for this period</div>
          </div>
        )}

        {/* Redeem List */}
        {!loading && rows.length > 0 && (
          <div className="space-y-2">
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
                  className={`bg-white rounded-lg border ${statusConfig.border} p-3 transition-all hover:shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {fmtHM(minutes)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {remarks || "Late logout redeem"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {formatDate(createdAt)}
                      </div>
                      {row.redeem_upto && statusConfig.status === 'Available' && (
                        <div className="text-xs text-amber-600 mt-0.5">
                          Valid till {formatDate(row.redeem_upto)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                    {sourceId && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">Attendance #{sourceId}</span>
                      </div>
                    )}
                    
                    {row.redeem_for_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          Used on {formatDate(row.redeem_for_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Summary */}
        {rows.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Summary</span>
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-medium">
                  Available: {fmtHM(totalAvailable)}
                </span>
                <span className="text-gray-600">
                  Used: {rows.filter(r => getRedeemStatus(r).status === 'Used').length}
                </span>
                <span className="text-red-600">
                  Expired: {rows.filter(r => getRedeemStatus(r).status === 'Expired').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}