"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

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
      const res = await apiClient<any>("/attendance/redeems", { method: "GET", withAuth: true, params: { employee_id: String(employeeId) } });
      const list = Array.isArray(res?.rows) ? res!.rows! : (Array.isArray(res?.data) ? res!.data! : []);
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
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">{employeeName || `Employee #${employeeId}`}</div>
        <div className="text-xs text-gray-500">Redeem History</div>
      </div>
      {loading && <div className="p-4 text-center text-sm">Loading...</div>}
      {error && <div className="p-3 border bg-yellow-50 text-yellow-800 text-xs rounded">{error}</div>}
      {!loading && rows.length === 0 && !error && <div className="text-xs text-gray-600">No redeem entries found</div>}

      <div className="space-y-2">
        {rows.map((r, i) => {
          const isUsed = r.is_used === 1 || r.is_used === true;
          const minutes = typeof r.redeem_minutes === "number" ? r.redeem_minutes : parseInt(String(r.redeem_minutes || 0)) || 0;
          const validTill = String(r.redeem_upto || "");
          const forDate = String(r.redeem_for_date || "");
          const remarks = String(r.remarks || "");
          const sourceId = String(r.source_attendance_id || "");
          return (
            <div key={i} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{isUsed ? "Redeem (Used)" : "Redeem (Available)"}</div>
                <div className={`text-xs font-semibold ${isUsed ? "text-gray-500" : "text-green-600"}`}>{fmtHM(minutes)}</div>
              </div>
              <div className="mt-2 text-xs text-gray-700">
                {sourceId && <div>Source Attendance: #{sourceId}</div>}
                {forDate && <div>Redeemed For: {forDate}</div>}
                {validTill && <div>Valid Till: {validTill}</div>}
                {remarks && <div className="text-gray-500">{remarks}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}