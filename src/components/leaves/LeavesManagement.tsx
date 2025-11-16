"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type Props = {
  employeeId: number;
  employeeName?: string;
};

export default function LeavesManagement({ employeeId, employeeName }: Props) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [balances, setBalances] = React.useState<Array<Record<string, any>>>([]);
  const [applications, setApplications] = React.useState<Array<Record<string, any>>>([]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Summary/balances
      try {
        const res = await apiClient<any>("/leaves/summary", { method: "GET", withAuth: true, params: { employee_id: String(employeeId) } });
        const list = Array.isArray(res?.balances) ? res!.balances! : (Array.isArray(res?.data) ? res!.data! : []);
        setBalances(list as any[]);
      } catch (e: any) {
        // soft fail, attempt alternative shape
        const res = await apiClient<any>("/leaves/balances", { method: "GET", withAuth: true, params: { employee_id: String(employeeId) } });
        const list = Array.isArray(res?.balances) ? res!.balances! : (Array.isArray(res?.data) ? res!.data! : []);
        setBalances(list as any[]);
      }

      // Applications
      try {
        const res2 = await apiClient<any>("/leaves/applications", { method: "GET", withAuth: true, params: { employee_id: String(employeeId) } });
        const list2 = Array.isArray(res2?.applications) ? res2!.applications! : (Array.isArray(res2?.data) ? res2!.data! : []);
        setApplications(list2 as any[]);
      } catch (e: any) {
        // fallback
        const res2 = await apiClient<any>("/leaves/list", { method: "GET", withAuth: true, params: { employee_id: String(employeeId) } });
        const list2 = Array.isArray(res2?.applications) ? res2!.applications! : (Array.isArray(res2?.data) ? res2!.data! : []);
        setApplications(list2 as any[]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load leaves data");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">{employeeName || `Employee #${employeeId}`}</div>
        <div className="text-xs text-gray-500">Leaves</div>
      </div>
      {loading && <div className="p-4 text-center text-sm">Loading...</div>}
      {error && <div className="p-3 border bg-yellow-50 text-yellow-800 text-xs rounded">{error}</div>}

      {/* Balances */}
      <div>
        <div className="text-sm font-semibold mb-2">Leave Balances</div>
        {balances.length === 0 ? (
          <div className="text-xs text-gray-600">No balances</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {balances.map((b, i) => (
              <div key={i} className="border rounded p-2 text-xs">
                <div className="text-gray-600">{String(b.leave_type || "Leave")}</div>
                <div className="font-semibold">{String(b.remaining ?? b.balance ?? "0")}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applications */}
      <div>
        <div className="text-sm font-semibold mb-2">Applications</div>
        {applications.length === 0 ? (
          <div className="text-xs text-gray-600">No leave applications</div>
        ) : (
          <div className="space-y-2">
            {applications.map((a, i) => {
              const type = String(a.leave_type ?? a.type ?? "Leave");
              const status = String(a.status ?? "Pending");
              const start = String(a.start_date ?? a.from_date ?? "");
              const end = String(a.end_date ?? a.to_date ?? "");
              const partial = String(a.partial_day ?? "");
              const isApproved = status.toLowerCase() === "approved";
              const isRejected = status.toLowerCase() === "rejected";
              const color = isApproved ? "#22c55e" : isRejected ? "#ef4444" : "#6b7280";
              return (
                <div key={i} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{type}</div>
                    <div className="text-xs font-semibold" style={{ color }}>{status}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-700">From: {start || "--"}</div>
                  <div className="text-xs text-gray-700">To: {end || "--"}</div>
                  {partial && <div className="text-xs text-gray-500">Partial: {partial}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}