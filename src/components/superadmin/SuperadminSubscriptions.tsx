"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type SubscriptionRow = {
  organization_id: number;
  organization_name: string;
  email: string;
  subscription_id: number;
  status: string;
  is_trial: number;
  starts_on: string;
  ends_on: string;
  amount: string | number | null;
  gst_amount: string | number | null;
  tds_amount: string | number | null;
  currency: string | null;
  payment_status: string | null;
  payment_mode: string | null;
  transaction_id: string | null;
  paid_at: string | null;
};

const formatCurrency = (value: string | number | null | undefined) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function SuperadminSubscriptions() {
  const [rows, setRows] = React.useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<SubscriptionRow[]>("/superadmin/subscriptions", { method: "GET" });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch subscriptions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">Subscriptions</h1>
        {loading && <div className="text-sm text-black">Fetching…</div>}
      </div>
      <p className="mt-2 text-black">Current subscription and payment per organization.</p>

      {error && <div className="mt-4 text-red-600">{error}</div>}

      <div className="mt-6 overflow-x-auto rounded border">
        <table className="min-w-full text-left text-sm text-black">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="px-3 py-2">Organization</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Trial</th>
              <th className="px-3 py-2">Starts</th>
              <th className="px-3 py-2">Ends</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-right">GST</th>
              <th className="px-3 py-2 text-right">TDS</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Transaction ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={11} className="px-3 py-4 text-center text-black">No subscriptions found</td>
              </tr>
            )}
            {rows.map((r) => {
              const amount = Number(r.amount || 0);
              const tds = Number(r.tds_amount || 0);
              const net = amount - tds;
              return (
                <tr key={r.subscription_id} className="border-t">
                  <td className="px-3 py-2 text-black">
                    <div className="font-medium">{r.organization_name}</div>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="px-3 py-2 text-black">{r.status}</td>
                  <td className="px-3 py-2 text-black">{r.is_trial ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-black whitespace-nowrap">{formatDate(r.starts_on)}</td>
                  <td className="px-3 py-2 text-black whitespace-nowrap">{formatDate(r.ends_on)}</td>
                  <td className="px-3 py-2 text-black text-right whitespace-nowrap">{formatCurrency(r.amount)}</td>
                  <td className="px-3 py-2 text-black text-right whitespace-nowrap">{formatCurrency(r.gst_amount)}</td>
                  <td className="px-3 py-2 text-black text-right whitespace-nowrap">{formatCurrency(r.tds_amount)}</td>
                  <td className="px-3 py-2 text-black text-right whitespace-nowrap font-medium">{formatCurrency(net)}</td>
                  <td className="px-3 py-2 text-black">{r.payment_status || "-"}{r.payment_mode ? ` · ${r.payment_mode}` : ""}</td>
                  <td className="px-3 py-2 text-black">{r.transaction_id || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
