"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import {
  Wallet,
  Building2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Receipt,
  Download,
  ArrowUpRight,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  X,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import WalletExpenses from "./WalletExpenses";
import { showSuccess, showError } from "@/lib/toast";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#a78bfa"];

function formatCurrency(val: number | undefined | null) {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function WalletsOverview() {
  const router = useRouter();
  const [summary, setSummary] = React.useState<any>(null);
  const [wallets, setWallets] = React.useState<any[]>([]);
  const [loadingWallets, setLoadingWallets] = React.useState(false);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [todayInfo, setTodayInfo] = React.useState<Record<number, { opening: number; count: number }>>({});
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [siteOptions, setSiteOptions] = React.useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([]); const [showExpenses, setShowExpenses] = React.useState(false);
  const [defaultSiteId, setDefaultSiteId] = React.useState<number | null>(null);
  const [defaultWalletId, setDefaultWalletId] = React.useState<number | null>(null);

  // Load data
  const { role, user, employee } = useAuth();

  const loadWallets = async () => {
    setLoadingWallets(true);
    try {
      const res = await apiClient<{ wallets: any[] }>("/site-wallets", { method: "GET", withAuth: true });
      setWallets(Array.isArray(res?.wallets) ? res.wallets : []);
    } catch (e: any) {
      showError(e?.message || "Failed to load wallets");
    } finally {
      setLoadingWallets(false);
    }
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await apiClient<any>("/expenses/summary", { method: "GET", withAuth: true });
      setSummary(res);
    } catch (e: any) {
      showError(e?.message || "Failed to load summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  React.useEffect(() => {
    loadWallets();
    loadSummary();
    (async () => {
      try {
        const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
        const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
        const mapped = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || s.id) }));
        setSiteOptions(mapped);
      } catch { setSiteOptions([]); }

      try {
        const catRes = await apiClient<any>("/wallet-config/categories", { method: "GET", withAuth: true });
        const cats = Array.isArray(catRes?.categories) ? catRes.categories.map((c: any) => ({ id: Number(c.id), name: String(c.name || c.id) })) : [];
        setCategories(cats);
      } catch { setCategories([]); }
    })();
  }, []);



  const pathname = usePathname();

  const roleBase = React.useMemo(() => {
    return pathname?.startsWith("/org-admin") ? "org-admin" : "employee";
  }, [pathname]);

  const totalBalance = Number(summary?.balance?.current ?? 0);
  const todayExpense = Number(summary?.stats?.today ?? 0);
  const monthExpense = Number(summary?.stats?.month ?? 0);

  const chartData = React.useMemo(() => {
    return (summary?.charts?.daily30 || []).map((d: any) => ({
      day: new Date(d.day).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      total: Number(d.total || 0),
    }));
  }, [summary]);

  const pieData = React.useMemo(() => {
    return (summary?.charts?.byType || []).map((c: any, i: number) => ({
      name: c.label,
      value: Number(c.total || 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [summary]);

  const handleRefresh = () => {
    loadWallets();
    loadSummary();
  };

  const [exportingWalletId, setExportingWalletId] = React.useState<number | null>(null);
  const exportExpenses = async (walletId: number) => {
    try {
      setExportingWalletId(walletId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
      const res = await fetch(`${baseUrl}/expenses/export`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ wallet_id: walletId, download_local: true }),
      });
      if (!res.ok) throw new Error('Failed to download export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Wallet_${walletId}_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(err?.message || 'Export failed');
    } finally { setExportingWalletId(null); }
  };

  return (
    <>
      <Toaster position="top-right" />

      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-emerald-50" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400 rounded-full filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full filter blur-3xl opacity-20 translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="min-h-screen p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Financial Dashboard
              </h1>
              <p className="text-sm text-gray-500">Real-time overview of wallets & expenses</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExportModal(true)}
                disabled={loadingWallets || loadingSummary}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={loadingWallets || loadingSummary}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loadingWallets || loadingSummary ? "animate-spin" : ""}`} />
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Balance */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-1 shadow-lg">
              <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalBalance)}</p>
                    <p className="text-xs text-gray-500 mt-1">{wallets.length} active wallets</p>
                  </div>
                  <div className="p-3 bg-violet-100 rounded-xl">
                    <Wallet className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Expense */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-1 shadow-lg">
              <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Today's Expense</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(todayExpense)}</p>
                    <p className="text-xs text-gray-500 mt-1">Across all wallets</p>
                  </div>
                  <div className="p-3 bg-rose-100 rounded-xl">
                    <TrendingDown className="w-6 h-6 text-rose-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* This Month */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-1 shadow-lg">
              <div className="relative h-full bg-white/95 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">This Month</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(monthExpense)}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleString("default", { month: "long" })}</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallets Grid */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Your Wallets</h2>
                <p className="text-xs text-gray-500">Click to view expenses • Export anytime</p>
              </div>
              <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                {wallets.length} Active
              </div>
            </div>

            {loadingWallets ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white/80 backdrop-blur rounded-xl h-32 animate-pulse shadow-md" />
                ))}
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-12 bg-white/70 backdrop-blur rounded-xl shadow-md">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-medium">No wallets found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wallets.map((wallet, i) => (
                  <div
                    key={wallet.id}
                    className="group relative bg-white/90 backdrop-blur-xl rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none ${i % 4 === 0 ? "from-violet-400" :
                      i % 4 === 1 ? "from-blue-400" :
                        i % 4 === 2 ? "from-emerald-400" : "from-amber-400"
                      }`} />

                    <div className="p-4 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{wallet.name}</h3>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Building2 className="w-3 h-3" />
                            <span>{wallet.site_name || `Site ${wallet.site_id}`}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
                          {wallet.currency || "INR"}
                        </span>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-gray-500">Current Balance</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(wallet.current_balance)}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/${roleBase}/wallet-expenses?wallet=${wallet.id}&site=${wallet.site_id}`)}
                          className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          Expenses
                        </button>
                        <button
                          onClick={() => exportExpenses(wallet.id)}
                          disabled={exportingWalletId === wallet.id}
                          className={`p-2 rounded-xl transition-colors ${exportingWalletId === wallet.id ? 'bg-gray-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          {exportingWalletId === wallet.id ? (
                            <RefreshCw className="w-4 h-4 text-gray-700 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-gray-700" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Charts */}
          {summary?.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Trend Chart */}
              <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">30-Day Expense Trend</h3>
                    <p className="text-xs text-gray-500">Daily spending pattern</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-violet-600" />
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "none", background: "#1e293b", color: "white", fontSize: 12 }} />
                      <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">By Category</h3>
                    <p className="text-xs text-gray-500">Expense distribution</p>
                  </div>
                  <PieChartIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, i: number) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {pieData.slice(0, 5).map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {summary?.recent?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
                <button
                  onClick={() => router.push(`/${roleBase}/wallet-expenses`)}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-gray-100 overflow-hidden">
                {summary.recent.slice(0, 6).map((tx: any) => {
                  const isApproved = tx.status?.toLowerCase() === "approved";
                  return (
                    <div
                      key={tx.id}
                      onClick={() => router.push(`/${roleBase}/wallet-expenses?wallet=${tx.wallet_id}&site=${tx.site_id}`)}
                      className="p-4 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-xl">
                            <Receipt className="w-4 h-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tx.invoice_name || tx.description || "Expense"}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              <span>{tx.site_name || tx.wallet_name}</span>
                              {tx.payment_mode && <span>• {tx.payment_mode}</span>}
                              {tx.date && <span>• {new Date(tx.date).toLocaleDateString("en-IN")}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-gray-900">{formatCurrency(tx.grand_total)}</p>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                            {tx.status || "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>


      {showExportModal && (
        <ExportModal
          current={{ siteId: null, categoryId: null, paymentMode: "", status: "", dateFrom: "", dateTo: "", invoiceDateFrom: "", invoiceDateTo: "" }}
          categories={categories}
          siteOptions={siteOptions}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}

function ExportModal({ current, categories, siteOptions, onClose }: { current: { siteId: number | null; categoryId: number | null; paymentMode: string; status: string; dateFrom: string; dateTo: string; invoiceDateFrom: string; invoiceDateTo: string; }; categories: { id: number; name: string }[]; siteOptions: { id: number; name: string }[]; onClose: () => void; }) {
  const [emailsInput, setEmailsInput] = React.useState<string>("");
  const [local, setLocal] = React.useState({ ...current });
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      const emails = emailsInput.split(/[\,\s]+/).map((e) => e.trim()).filter(Boolean);
      const body: any = {
        emails,
        site_id: local.siteId,
        category_id: local.categoryId,
        payment_mode: local.paymentMode,
        status: local.status,
        date_from: local.dateFrom,
        date_to: local.dateTo,
        invoice_date_from: local.invoiceDateFrom,
        invoice_date_to: local.invoiceDateTo,
        q: "",
      };
      await apiClient<any>("/expenses/export", { method: "POST", withAuth: true, body });
      showSuccess("Export requested. You will receive the email shortly.");
      onClose();
    } catch (err: any) {
      showError(err?.message || "Failed to request export");
    } finally { setSubmitting(false); }
  };
  const downloadLocal = async () => {
    try {
      setSubmitting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
      const body: any = {
        site_id: local.siteId,
        category_id: local.categoryId,
        payment_mode: local.paymentMode,
        status: local.status,
        date_from: local.dateFrom,
        date_to: local.dateTo,
        invoice_date_from: local.invoiceDateFrom,
        invoice_date_to: local.invoiceDateTo,
        q: "",
        download_local: true,
      };
      const res = await fetch(`${baseUrl}/expenses/export`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to download export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Expenses_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError('Failed to download export');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Export Expenses</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Site</label>
            <select value={local.siteId ?? ""} onChange={(e) => setLocal({ ...local, siteId: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Sites</option>
              {siteOptions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select value={local.categoryId != null ? String(local.categoryId) : ""} onChange={(e) => setLocal({ ...local, categoryId: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Categories</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Updated From</label>
            <input type="date" value={local.dateFrom} onChange={(e) => setLocal({ ...local, dateFrom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Updated To</label>
            <input type="date" value={local.dateTo} onChange={(e) => setLocal({ ...local, dateTo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Invoice From</label>
            <input type="date" value={local.invoiceDateFrom} onChange={(e) => setLocal({ ...local, invoiceDateFrom: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Invoice To</label>
            <input type="date" value={local.invoiceDateTo} onChange={(e) => setLocal({ ...local, invoiceDateTo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Payment Mode</label>
            <select value={local.paymentMode} onChange={(e) => setLocal({ ...local, paymentMode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BankTransfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Emails (comma separated)</label>
            <input type="text" value={emailsInput} onChange={(e) => setEmailsInput(e.target.value)} placeholder="user1@example.com, user2@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-end mt-4 gap-2">
          <button onClick={onClose} className="px-3 py-2 border border-gray-300 rounded-lg">Cancel</button>
          <button onClick={downloadLocal} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Downloading...' : 'Download locally'}
          </button>
          <button onClick={submit} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Send Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
