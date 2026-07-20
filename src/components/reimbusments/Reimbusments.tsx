"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Loader2, ArrowUpRight, ArrowDownLeft, Lock, Unlock, Plus,
  RefreshCw, FileText, ChevronLeft, ChevronRight, X, DollarSign,
  Wallet, Users, TrendingUp, AlertCircle, CheckCircle, Info,
  Filter, ChevronDown, ChevronUp, Download, Eye, CheckCircle2,
  Trash2, ZoomIn, Ban, Clock, MoreVertical, Edit, Save,
  Building2, Banknote, Calendar
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReimbursementRow {
  id: number;
  employee_id: number;
  first_name: string;
  last_name: string;
  emp_code: number;
  department_name: string;
  reason: string;
  category: string;
  amount: number;
  payment_mode: string;
  transaction_id: string | null;
  status: string;
  payment_status: string;
  attachment_url: string | null;
  payment_proof_url: string | null;
  physical_copy_status?: string;
  physical_copy_collected_by_name?: string;
  extracted_data?: string | any;
  created_at: string;
  approval_details?: Array<{
    level: number;
    status: string;
    approver_name: string;
    is_current: boolean;
    is_final_approver: boolean;
    approved_at: string | null;
    comments: string | null;
  }>;
  can_approve_level?: number | null;
  current_approval_level?: number | null;
}

interface EmployeeWallet {
  employee_id: number;
  first_name: string;
  last_name: string;
  department_name: string;
  wallet_id: number;
  current_balance: number;
  currency: string;
}

interface ReimbursementStats {
  total_count: number;
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  rejected_amount: number;
  disbursed_amount: number;
}

// ── Notification helper ───────────────────────────────────────────────────────

function showNotification(message: string, type: "success" | "error") {
  const container = document.getElementById("notif-container") || (() => {
    const d = document.createElement("div");
    d.id = "notif-container";
    Object.assign(d.style, { position: "fixed", top: "20px", right: "20px", zIndex: "9999" });
    document.body.appendChild(d);
    return d;
  })();

  const n = document.createElement("div");
  n.className = `p-4 mb-3 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-medium transition-opacity ${
    type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
  }`;
  n.textContent = message;
  container.appendChild(n);
  setTimeout(() => {
    n.style.opacity = "0";
    setTimeout(() => n.remove(), 400);
  }, 4000);
}

// ── Animated Counter Helper ───────────────────────────────────────────────────

function useCountUp(target: number | string, duration = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf: number;
    const num = parseFloat(String(target || 0));
    const finalTarget = Number.isFinite(num) ? num : 0;
    const start = performance.now();
    const step = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      setV(Math.floor(p * finalTarget));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return v;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <div className={`${color} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(n?: number) {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v);
}

function formatDateFlexible(s?: string) {
  if (!s) return "-";
  try {
    const pureDate = /^\d{4}-\d{2}-\d{2}$/;
    if (pureDate.test(s)) {
      const dt = new Date(s + "T00:00:00");
      return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
    }
    const dt = new Date(s);
    return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
  } catch {
    return s;
  }
}

function formatToYYYYMMDD(s?: string) {
  if (!s) return "";
  const clean = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(clean);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  try {
    const dt = new Date(clean);
    if (!isNaN(dt.getTime())) {
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (_) {}
  return "";
}

function getPhysicalCopyStatusIcon(status?: string) {
  switch (status) {
    case 'submitted': return <CheckCircle2 className="w-3 h-3 text-green-600 animate-pulse" />;
    case 'not_applicable': return <X className="w-3 h-3 text-gray-400" />;
    default: return <Clock className="w-3 h-3 text-yellow-600" />;
  }
}

function getPhysicalCopyStatusColor(status?: string) {
  switch (status) {
    case 'submitted': return 'text-green-700';
    case 'not_applicable': return 'text-gray-500';
    default: return 'text-yellow-700';
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Reimbusments() {
  const { role, permissions, employee } = useAuth();
  const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';
  const hasPerm = (code: string) =>
    (permissions || []).some((p) => (p || '').toUpperCase() === code.toUpperCase());
  const isReimbAdmin = isOrgAdmin || hasPerm('REIMB_ADMIN') || hasPerm('WALLET_ADMIN');
  const canView = isReimbAdmin || hasPerm('REIMBUSMENT_VIEW');
  const canEdit = isReimbAdmin || hasPerm('REIMBUSMENT_EDIT');
  const canDelete = isReimbAdmin || hasPerm('REIMBUSMENT_DELETE');  // Stats
  const [stats, setStats] = useState<ReimbursementStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Reimbursements list
  const [rows, setRows] = useState<ReimbursementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  const displayedRows = rows;

  // Filters
  const [statusFilter, setStatusFilter] = useState("Pending"); // default pending
  const [myLevel, setMyLevel] = useState(false);
  
  // Date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Search by employee wallet (dropdown picker)
  const [walletSearchQuery, setWalletSearchQuery] = useState("");
  const [walletsList, setWalletsList] = useState<EmployeeWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<EmployeeWallet | null>(null);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // Detail Modal
  const [selectedRow, setSelectedRow] = useState<ReimbursementRow | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'invoice' | 'approvals'>('invoice');
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Claim Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ReimbursementRow | null>(null);
  const [editActiveTab, setEditActiveTab] = useState<'basic' | 'vendor' | 'items'>('basic');
  const [editPayload, setEditPayload] = useState<any>(null);
  const [actionRowLoading, setActionRowLoading] = useState<string | null>(null);
  const [confirmPhysicalModal, setConfirmPhysicalModal] = useState<{ id: number; status: string } | null>(null);
  
  const [categories, setCategories] = useState<any[]>([]);

  // Statement Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSelectedWallet, setExportSelectedWallet] = useState<any | null>(null);
  const [exportWalletSearchQuery, setExportWalletSearchQuery] = useState("");
  const [exportWalletsList, setExportWalletsList] = useState<any[]>([]);
  const [showExportWalletDropdown, setShowExportWalletDropdown] = useState(false);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");
  const [exportCategory, setExportCategory] = useState("all");
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportLoading, setExportLoading] = useState(false);

  // Search employee wallets in export statement modal
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!exportWalletSearchQuery) {
        setExportWalletsList([]);
        return;
      }
      try {
        const res = await apiClient<any>(`/reimbursements/wallets?search=${exportWalletSearchQuery}&limit=10`, { method: "GET", withAuth: true });
        if (res.success) {
          setExportWalletsList(res.data || []);
        }
      } catch (err) {
        console.error("Error searching wallets for export", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [exportWalletSearchQuery]);

  const triggerExportStatement = async () => {
    setExportLoading(true);
    try {
      const q = new URLSearchParams();
      q.append("wallet_id", exportSelectedWallet ? String(exportSelectedWallet.wallet_id || exportSelectedWallet.id) : "all");
      if (exportFromDate) q.append("from_date", exportFromDate);
      if (exportToDate) q.append("to_date", exportToDate);
      if (exportCategory) q.append("category", exportCategory);
      q.append("format", exportFormat);

      const token = localStorage.getItem("token") || "";
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
      const url = `${baseUrl}/reimbursements/statement?${q.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        let errJson;
        try { errJson = JSON.parse(errText); } catch (_) {}
        throw new Error(errJson?.message || "Failed to download statement file");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `statement_${Date.now()}.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      showNotification("Statement exported successfully", "success");
      setExportModalOpen(false);
    } catch (err: any) {
      showNotification(err?.message || "Failed to export statement", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient<any>('/reimbursements/categories', { method: "GET", withAuth: true });
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (editingRow) {
      let extData: any = {};
      try {
        if (editingRow.extracted_data) {
          extData = typeof editingRow.extracted_data === 'string'
            ? JSON.parse(editingRow.extracted_data)
            : editingRow.extracted_data;
        }
      } catch (_) {}

      setEditPayload({
        category: editingRow.category || "Other",
        payment_mode: editingRow.payment_mode || "Cash",
        reason: editingRow.reason || "",
        amount: editingRow.amount || 0,
        seller: {
          name: extData?.seller?.name || "",
          address: extData?.seller?.address || "",
          gstin: extData?.seller?.gstin || "",
          phone: extData?.seller?.phone || "",
        },
        items: extData?.items || [],
        taxes: extData?.taxes || [],
        charges: extData?.charges || [],
        subtotal: extData?.subtotal || editingRow.amount || 0,
        invoice: {
          invoice_no: extData?.invoice?.invoice_no || (editingRow as any).invoice_no || "",
          date: extData?.invoice?.date || (editingRow as any).invoice_date || "",
        }
      });
      setEditActiveTab('basic');
    } else {
      setEditPayload(null);
    }
  }, [editingRow]);

  const recalculateEditTotals = (payload: any) => {
    const subtotal = (payload.items || []).reduce((sum: number, it: any) => sum + (Number(it.qty || 0) * Number(it.rate || 0)), 0);
    const taxesSum = (payload.taxes || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const chargesSum = (payload.charges || []).reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
    const grandTotal = subtotal + taxesSum + chargesSum;
    return {
      ...payload,
      subtotal,
      amount: grandTotal > 0 ? grandTotal : payload.amount,
    };
  };

  const categoryOptions = useMemo(() => {
    const list = categories.map((c: any) => c.name);
    const defaults = ["Food & Beverage", "Travel & Transport", "Office Supplies", "Tools & Hardware", "Other"];
    defaults.forEach(d => {
      if (!list.includes(d)) list.push(d);
    });
    if (editPayload?.category && !list.includes(editPayload.category)) {
      list.push(editPayload.category);
    }
    if (editingRow?.category && !list.includes(editingRow.category)) {
      list.push(editingRow.category);
    }
    return Array.from(new Set(list));
  }, [categories, editPayload?.category, editingRow?.category]);

  // ── Fetch wallets for search ────────────────────────────────────────────────
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!walletSearchQuery) {
        setWalletsList([]);
        return;
      }
      try {
        const res = await apiClient<any>(`/reimbursements/wallets?search=${walletSearchQuery}&limit=10`, { method: "GET", withAuth: true });
        if (res.success) {
          setWalletsList(res.data || []);
        }
      } catch (err) {
        console.error("Error searching wallets", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [walletSearchQuery]);

  // ── Fetch Stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedWallet) q.append("employee_id", String(selectedWallet.employee_id));
      if (dateFrom) q.append("from_date", dateFrom);
      if (dateTo) q.append("to_date", dateTo);
      
      const res = await apiClient<any>(`/reimbursements/stats?${q.toString()}`, { method: "GET", withAuth: true });
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch reimbursement stats", err);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedWallet, dateFrom, dateTo]);

  // ── Fetch Reimbursements ────────────────────────────────────────────────────
  const fetchReimbursements = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (statusFilter && statusFilter !== "All") {
        q.append("status", statusFilter);
      }

      if (selectedWallet) {
        q.append("employee_id", String(selectedWallet.employee_id));
      }

      if (dateFrom) q.append("from_date", dateFrom);
      if (dateTo) q.append("to_date", dateTo);
      if (myLevel) q.append("my_level", "true");

      const res = await apiClient<any>(`/reimbursements?${q.toString()}`, { method: "GET", withAuth: true });
      if (res.success) {
        setRows(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch reimbursements", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, selectedWallet, dateFrom, dateTo, myLevel]);

  // Sync data loaders
  useEffect(() => {
    fetchStats();
    fetchReimbursements();
  }, [fetchStats, fetchReimbursements]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleApprove = async (rowId: number) => {
    setActionLoading(true);
    try {
      const res = await apiClient<any>(`/reimbursements/${rowId}/approve`, {
        method: "PUT",
        body: { review_notes: actionNotes },
        headers: { "Content-Type": "application/json" },
        withAuth: true
      });
      if (res.success) {
        showNotification(res.message || "Approved successfully", "success");
        setSelectedRow(null);
        setActionNotes("");
        fetchStats();
        fetchReimbursements();
      } else {
        showNotification(res.message || "Approval failed", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Error occurred during approval", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (rowId: number) => {
    if (!actionNotes) {
      showNotification("Please provide rejection comments", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiClient<any>(`/reimbursements/${rowId}/reject`, {
        method: "PUT",
        body: { review_notes: actionNotes },
        headers: { "Content-Type": "application/json" },
        withAuth: true
      });
      if (res.success) {
        showNotification(res.message || "Rejected successfully", "success");
        setSelectedRow(null);
        setActionNotes("");
        fetchStats();
        fetchReimbursements();
      } else {
        showNotification(res.message || "Rejection failed", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Error occurred during rejection", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburse = async (rowId: number) => {
    setActionLoading(true);
    try {
      const res = await apiClient<any>(`/reimbursements/${rowId}/disburse`, {
        method: "PUT",
        withAuth: true
      });
      if (res.success) {
        showNotification(res.message || "Disbursed successfully", "success");
        setSelectedRow(null);
        fetchStats();
        fetchReimbursements();
      } else {
        showNotification(res.message || "Disbursement failed", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Error occurred during disbursement", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Row dropdown action handlers
  const handleRowApprove = async (id: number, notes = "") => {
    try {
      setActionRowLoading(String(id));
      const res = await apiClient<any>(`/reimbursements/${id}/approve`, {
        method: "PUT",
        body: { review_notes: notes },
        headers: { "Content-Type": "application/json" },
        withAuth: true
      });
      if (res.success) {
        showNotification("Approved successfully", "success");
        fetchStats();
        fetchReimbursements();
      } else {
        showNotification(res.message || "Approval failed", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Error occurred during approval", "error");
    } finally {
      setActionRowLoading(null);
    }
  };

  const handleRowReject = async (id: number, notes = "") => {
    try {
      setActionRowLoading(String(id));
      const res = await apiClient<any>(`/reimbursements/${id}/reject`, {
        method: "PUT",
        body: { review_notes: notes },
        headers: { "Content-Type": "application/json" },
        withAuth: true
      });
      if (res.success) {
        showNotification("Rejected successfully", "success");
        fetchStats();
        fetchReimbursements();
      } else {
        showNotification(res.message || "Rejection failed", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Error occurred during rejection", "error");
    } finally {
      setActionRowLoading(null);
    }
  };

  const handleUpdatePhysicalCopyStatus = async (id: number, status: string) => {
    try {
      setActionRowLoading(String(id));
      const res = await apiClient<any>(`/reimbursements/${id}/physical-copy`, {
        method: "PUT",
        body: { status },
        headers: { "Content-Type": "application/json" },
        withAuth: true
      });
      if (res.success) {
        showNotification(`Physical copy marked as ${status === 'submitted' ? 'Submitted' : 'N/A'}`, "success");
        fetchReimbursements();
      } else {
        showNotification(res.message || "Failed to update status", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Error updating physical copy status", "error");
    } finally {
      setActionRowLoading(null);
    }
  };

  const handleDeleteRow = async (id: number) => {
    if (!confirm("Are you sure you want to delete this reimbursement claim?")) return;
    try {
      setActionRowLoading(String(id));
      const res = await apiClient<any>(`/reimbursements/${id}`, {
        method: "DELETE",
        withAuth: true
      });
      if (res.success) {
        showNotification("Reimbursement deleted successfully", "success");
        fetchStats();
        fetchReimbursements();
      } else {
        showNotification(res.message || "Failed to delete claim", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Error deleting claim", "error");
    } finally {
      setActionRowLoading(null);
    }
  };

  // ── Stat count ups ──────────────────────────────────────────────────────────
  const cntTotal = useCountUp(stats?.total_amount || 0);
  const cntPending = useCountUp(stats?.pending_amount || 0);
  const cntDisbursed = useCountUp(stats?.disbursed_amount || 0);
  const cntRejected = useCountUp(stats?.rejected_amount || 0);

  // ── Export Trigger ──────────────────────────────────────────────────────────
  const handleExport = () => {
    setExportModalOpen(true);
  };

  // ── Actions dropdown component ─────────────────────────────────────────────
  const ActionsDropdown = ({ row }: { row: ReimbursementRow }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    return (
      <div className="relative inline-block text-left">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={actionRowLoading === String(row.id)}
        >
          {actionRowLoading === String(row.id) ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <MoreVertical className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            {(() => {
              if (!menuPos && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const width = 160;
                const top = rect.bottom + window.scrollY + 8;
                const left = Math.max(8, rect.right + window.scrollX - width);
                setMenuPos({ top, left });
              }
              const style = menuPos ? { top: menuPos.top, left: menuPos.left } : {};
              return (
                <div
                  style={style as React.CSSProperties}
                  className="fixed w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 text-left"
                >
                  {row.status === "Pending" && row.can_approve_level != null && row.can_approve_level === row.current_approval_level && (
                    <>
                      <button
                        onClick={() => {
                          const n = prompt("Enter approval comments (optional):") || "";
                          handleRowApprove(row.id, n);
                          setIsOpen(false);
                          setMenuPos(null);
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          const n = prompt("Enter rejection comments (required):");
                          if (n != null) {
                            if (!n.trim()) {
                              alert("Rejection comments are required");
                            } else {
                              handleRowReject(row.id, n);
                            }
                          }
                          setIsOpen(false);
                          setMenuPos(null);
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedRow(row);
                      setDetailActiveTab('invoice');
                      setIsOpen(false);
                      setMenuPos(null);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  {row.status === "Pending" && canEdit && (
                    <button
                      onClick={() => {
                        setEditingRow(row);
                        setEditModalOpen(true);
                        setIsOpen(false);
                        setMenuPos(null);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Claim</span>
                    </button>
                  )}
                  {canDelete && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => {
                          handleDeleteRow(row.id);
                          setIsOpen(false);
                          setMenuPos(null);
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  if (!canView) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view reimbursement claims.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Reimbursements</h1>
          <p className="text-gray-600 mt-1">Review, approve, and track employee reimbursement claims</p>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Claimed"
          value={formatCurrency(cntTotal)}
          icon={Wallet}
          color="bg-blue-50/50 border-blue-100 text-blue-900"
        />
        <StatCard
          label="Pending Claims"
          value={formatCurrency(cntPending)}
          icon={Clock}
          color="bg-amber-50/50 border-amber-100 text-amber-900"
        />
        <StatCard
          label="Disbursed"
          value={formatCurrency(cntDisbursed)}
          icon={CheckCircle}
          color="bg-emerald-50/50 border-emerald-100 text-emerald-900"
        />
        <StatCard
          label="Rejected"
          value={formatCurrency(cntRejected)}
          icon={AlertCircle}
          color="bg-red-50/50 border-red-100 text-red-900"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          
          {/* Search by Employee name */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Search Employee Wallet</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee name..."
                value={selectedWallet ? `${selectedWallet.first_name} ${selectedWallet.last_name}` : walletSearchQuery}
                onChange={(e) => {
                  if (selectedWallet) {
                    setSelectedWallet(null);
                    setWalletSearchQuery("");
                  } else {
                    setWalletSearchQuery(e.target.value);
                  }
                  setShowWalletDropdown(true);
                }}
                onFocus={() => setShowWalletDropdown(true)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
              {selectedWallet && (
                <button
                  onClick={() => {
                    setSelectedWallet(null);
                    setWalletSearchQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Wallet Dropdown Search Results */}
            {showWalletDropdown && walletsList.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowWalletDropdown(false)} />
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                  {walletsList.map((w) => (
                    <button
                      key={w.employee_id}
                      onClick={() => {
                        setSelectedWallet(w);
                        setShowWalletDropdown(false);
                        setWalletSearchQuery("");
                        setPage(1);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <span className="font-semibold text-gray-900">{w.first_name} {w.last_name}</span>
                        <span className="text-xs text-gray-400 block">ID: {w.employee_id}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 rounded px-2 py-0.5">₹{Number(w.current_balance || 0).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

        </div>

        {/* Extra Action / Row (Pending My Level Toggle, Export, Add Buttons) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMyLevel(!myLevel)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                myLevel
                  ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${myLevel ? "fill-blue-500 text-white" : "text-gray-500"}`} />
              Pending My Level
            </button>
            <span className="text-xs text-gray-500">
              {myLevel ? "Showing only claims needing your active level approval." : "Filter to show only claims pending your approval."}
            </span>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

      </div>

      {selectedWallet && (
        <div className="flex items-center gap-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5" />
          <span>Filtering claims for <strong>{selectedWallet.first_name} {selectedWallet.last_name}</strong></span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category / Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Physical Copy</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                    <div className="text-sm">Loading reimbursement claims...</div>
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">No reimbursement claims found</p>
                    <p className="text-xs text-gray-400 mt-1">Try refining search query or filters.</p>
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                          {row.first_name[0]}{row.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{row.first_name} {row.last_name}</div>
                          <div className="text-xs text-gray-400">ID: {row.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-800">{row.category || "—"}</div>
                      <div className="text-xs text-gray-400">{formatDateFlexible(row.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={row.reason}>
                      {row.reason}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {row.payment_mode}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(row.amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {getPhysicalCopyStatusIcon(row.physical_copy_status)}
                          <span className={`text-xs font-medium capitalize ${getPhysicalCopyStatusColor(row.physical_copy_status)}`}>
                            {(row.physical_copy_status || 'pending').replace('_', ' ')}
                          </span>
                        </div>
                        {row.physical_copy_status === 'submitted' && row.physical_copy_collected_by_name && (
                          <span className="text-[10px] text-gray-500 block">by {row.physical_copy_collected_by_name}</span>
                        )}
                        {isReimbAdmin && row.physical_copy_status === 'pending' && (
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              onClick={() => handleUpdatePhysicalCopyStatus(row.id, 'submitted')}
                              className="px-2 py-0.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-[10px] font-semibold border border-green-200 transition-colors"
                            >
                              Mark Received
                            </button>
                            <button
                              onClick={() => handleUpdatePhysicalCopyStatus(row.id, 'not_applicable')}
                              className="px-2 py-0.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-[10px] font-semibold border border-gray-200 transition-colors"
                            >
                              N/A
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        row.status === "Approved" ? "bg-green-50 text-green-700 border border-green-200" :
                        row.status === "Rejected" ? "bg-red-50 text-red-700 border border-red-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedRow(row);
                            setDetailActiveTab('invoice');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <ActionsDropdown row={row} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} claims
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => (p * limit < total ? p + 1 : p))}
                disabled={page * limit >= total}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail & Approval Modal ─────────────────────────────────────────── */}
      {(() => {
        if (!selectedRow) return null;
        
        // Inline memo/computation for extracted data
        let extractedData = null;
        try {
          if (selectedRow.extracted_data) {
            extractedData = typeof selectedRow.extracted_data === 'string'
              ? JSON.parse(selectedRow.extracted_data)
              : selectedRow.extracted_data;
          }
        } catch (_) {}

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Reimbursement Details</h2>
                    <p className="text-sm text-gray-500">View reimbursement claim information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedRow(null);
                    setActionNotes("");
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 shrink-0">
                <button
                  onClick={() => setDetailActiveTab('invoice')}
                  className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${detailActiveTab === 'invoice' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Receipt / Details
                  </div>
                </button>
                <button
                  onClick={() => setDetailActiveTab('approvals')}
                  className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${detailActiveTab === 'approvals' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Approvals
                  </div>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 min-h-0 text-sm">
                {detailActiveTab === 'invoice' && (
                  <div className="space-y-6">
                    {/* Status & Meta */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                          selectedRow.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                          selectedRow.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {selectedRow.status}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-gray-400" />
                          Submitted by <strong className="text-gray-900">{selectedRow.first_name} {selectedRow.last_name}</strong>
                        </span>
                        {extractedData?.invoice?.invoice_no && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            #{extractedData.invoice.invoice_no}
                          </span>
                        )}
                        {extractedData?.invoice?.date && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {formatDateFlexible(extractedData.invoice.date)}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Grand Total</div>
                        <div className="text-xl font-bold text-gray-900">{formatCurrency(selectedRow.amount)}</div>
                      </div>
                    </div>

                    {!extractedData ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Details Card */}
                        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-3">
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Claim Details</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Category</div>
                              <div className="text-sm font-semibold text-gray-900">{selectedRow.category}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Payment Mode</div>
                              <div className="text-sm font-semibold text-gray-900">{selectedRow.payment_mode}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Date Submitted</div>
                              <div className="text-sm font-semibold text-gray-900">{formatDateFlexible(selectedRow.created_at)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Payment Status</div>
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${selectedRow.payment_status === 'Disbursed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                                {selectedRow.payment_status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Remarks Card */}
                        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Remarks / Reason</h3>
                            <p className="text-sm text-gray-700 italic">
                              &ldquo;{selectedRow.reason || "No remarks entered for this claim."}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Vendor details */}
                          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vendor Details</h3>
                            <div className="space-y-2">
                              <div className="font-bold text-gray-900 text-lg">{extractedData.seller?.name || 'Unknown Vendor'}</div>
                              {extractedData.seller?.address && (
                                <div className="text-sm text-gray-600 flex items-start gap-2">
                                  <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                  {extractedData.seller.address}
                                </div>
                              )}
                              {extractedData.seller?.gstin && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium text-gray-500">GSTIN:</span> {extractedData.seller.gstin}
                                </div>
                              )}
                              {extractedData.seller?.phone && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium text-gray-500">Phone:</span> {extractedData.seller.phone}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Billed To / Buyer details */}
                          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billed To</h3>
                            <div className="space-y-2">
                              <div className="font-bold text-gray-900 text-lg">{extractedData.buyer?.name || `${selectedRow.first_name} ${selectedRow.last_name}`}</div>
                              <div className="text-sm text-gray-600 flex items-start gap-2">
                                <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                {extractedData.buyer?.address || 'Company Address'}
                              </div>
                              {extractedData.buyer?.gstin && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium text-gray-500">GSTIN:</span> {extractedData.buyer.gstin}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Items details table */}
                        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 w-12">#</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Item Description</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">HSN</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Rate</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Tax</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {(extractedData.items || []).map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                  <td className="px-4 py-3 font-medium text-gray-900">{item.item_name}</td>
                                  <td className="px-4 py-3 text-right text-gray-600">{item.hsn || '-'}</td>
                                  <td className="px-4 py-3 text-right text-gray-600">{Number(item.qty || 0)} {item.unit || ''}</td>
                                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                                  <td className="px-4 py-3 text-right text-gray-600">
                                    {item.tax_percent ? `${item.tax_percent}%` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                                </tr>
                              ))}
                              {(extractedData.items || []).length === 0 && (
                                <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                                    No items listed
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Subtotal, taxes, charges breakdown */}
                        <div className="flex justify-end gap-6 flex-wrap">
                          {/* Remarks Card on left */}
                          <div className="flex-1 min-w-[280px] bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Remarks / Reason</h3>
                            <p className="text-sm text-gray-700 italic">
                              &ldquo;{selectedRow.reason || "No remarks entered for this claim."}&rdquo;
                            </p>
                          </div>
                          {/* Totals box on right */}
                          <div className="w-full md:w-1/2 lg:w-1/3 bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Subtotal</span>
                              <span className="font-medium text-gray-900">{formatCurrency(extractedData.subtotal || selectedRow.amount)}</span>
                            </div>
                            {(extractedData.taxes || []).map((t: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-gray-500">{t.label} ({t.percent}%)</span>
                                <span className="font-medium text-gray-900">{formatCurrency(t.amount)}</span>
                              </div>
                            ))}
                            {(extractedData.charges || []).map((c: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-gray-500">{c.label}</span>
                                <span className="font-medium text-gray-900">{formatCurrency(c.amount)}</span>
                              </div>
                            ))}
                            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center">
                              <span className="font-bold text-gray-900">Grand Total</span>
                              <span className="font-bold text-blue-600 text-lg">{formatCurrency(selectedRow.amount)}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Attachments Section */}
                    {(selectedRow.attachment_url || selectedRow.payment_proof_url) && (
                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attachments</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedRow.attachment_url && (
                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-blue-50 rounded text-blue-600">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate text-sm font-medium text-gray-700">
                                  Receipt / Bill Attachment
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (selectedRow.attachment_url) setZoomSrc(selectedRow.attachment_url);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                          {selectedRow.payment_proof_url && (
                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-green-50 rounded text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                </div>
                                <div className="truncate text-sm font-medium text-gray-700">
                                  Payment Proof Screenshot
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (selectedRow.payment_proof_url) setZoomSrc(selectedRow.payment_proof_url);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Notes Input */}
                    {selectedRow.status === "Pending" && (
                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Review Notes / Rejection Comments</label>
                        <textarea
                          rows={3}
                          placeholder="Enter review feedback, notes, or rejection reason here..."
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-sm animate-fade-in"
                        />
                      </div>
                    )}
                  </div>
                )}

                {detailActiveTab === 'approvals' && (
                  <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-base font-bold text-gray-900 mb-4">Approval Timeline</h3>
                    {selectedRow.approval_details && selectedRow.approval_details.length > 0 ? (
                      <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                        {selectedRow.approval_details.map((ap: any, idx: number) => (
                          <div key={idx} className="relative pl-8">
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                              ap.status === 'APPROVED' ? 'bg-green-500 border-green-500' :
                              ap.status === 'REJECTED' ? 'bg-red-500 border-red-500' :
                              'bg-white border-gray-300'
                            }`}></div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                              <span className="font-bold text-gray-900">{ap.approver_name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${
                                ap.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                ap.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {ap.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">Level {ap.level} Approver</div>
                            {ap.approved_at && (
                              <div className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                                <Clock className="w-3 h-3" />
                                {new Date(ap.approved_at).toLocaleString()}
                              </div>
                            )}
                            {ap.comments && (
                              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-600 italic mt-1.5">
                                &ldquo;{ap.comments}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-center py-6">No workflow approvals tracked yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between rounded-b-xl shrink-0">
                <div>
                  {selectedRow.payment_status === "Disbursed" ? (
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                      Payment Disbursed
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Status: {selectedRow.status}</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {selectedRow.status === "Pending" && selectedRow.can_approve_level != null && selectedRow.can_approve_level === selectedRow.current_approval_level && (
                    <>
                      <button
                        onClick={() => handleReject(selectedRow.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 text-sm font-semibold border border-red-200 text-red-700 hover:bg-red-50 bg-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Ban className="w-4 h-4" />
                        Reject Claim
                      </button>
                      <button
                        onClick={() => handleApprove(selectedRow.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Level
                      </button>
                    </>
                  )}

                  {selectedRow.status === "Approved" && selectedRow.payment_status !== "Disbursed" && (
                    <button
                      onClick={() => handleDisburse(selectedRow.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <DollarSign className="w-4 h-4" />
                      Mark Disbursed
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRow(null);
                      setActionNotes("");
                    }}
                    className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Edit Reimbursement Claim Modal ───────────────────────────────────── */}
      {editModalOpen && editingRow && editPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Edit className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Edit Expense</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Edit reimbursement claim details & invoice items</p>
                </div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setEditActiveTab('basic')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${editActiveTab === 'basic' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Basic Info
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab('vendor')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${editActiveTab === 'vendor' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Vendor Info
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab('items')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${editActiveTab === 'items' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Items & Pricing
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const finalExtractedData = {
                  seller: editPayload.seller,
                  items: editPayload.items,
                  taxes: editPayload.taxes,
                  charges: editPayload.charges,
                  subtotal: editPayload.subtotal,
                  invoice: editPayload.invoice,
                };
                const payload = {
                  reason: editPayload.reason,
                  category: editPayload.category,
                  amount: parseFloat(editPayload.amount),
                  payment_mode: editPayload.payment_mode,
                  invoice_no: editPayload.invoice?.invoice_no || null,
                  invoice_date: editPayload.invoice?.date || null,
                  extracted_data: finalExtractedData,
                };

                try {
                  setActionLoading(true);
                  const res = await apiClient<any>(`/reimbursements/${editingRow.id}`, {
                    method: "PUT",
                    body: payload,
                    headers: { "Content-Type": "application/json" },
                    withAuth: true
                  });
                  if (res.success) {
                    showNotification("Claim updated successfully", "success");
                    setEditModalOpen(false);
                    setEditingRow(null);
                    fetchStats();
                    fetchReimbursements();
                  } else {
                    showNotification(res.message || "Failed to update claim", "error");
                  }
                } catch (err: any) {
                  showNotification(err?.message || "Error updating claim", "error");
                } finally {
                  setActionLoading(false);
                }
              }}
              className="flex-1 overflow-y-auto min-h-0 flex flex-col"
            >
              <div className="flex-grow p-6 overflow-y-auto space-y-6">
                {editActiveTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={editPayload.category}
                          onChange={(e) => setEditPayload((p: any) => ({ ...p, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          {categoryOptions.map((catName: string) => (
                            <option key={catName} value={catName}>{catName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                        <select
                          value={editPayload.payment_mode}
                          onChange={(e) => setEditPayload((p: any) => ({ ...p, payment_mode: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Bank">Bank Transfer</option>
                          <option value="Card">Card</option>
                          <option value="Wallet">Wallet</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No</label>
                        <input
                          type="text"
                          value={editPayload.invoice?.invoice_no || ""}
                          onChange={(e) => setEditPayload((p: any) => ({
                            ...p,
                            invoice: { ...p.invoice, invoice_no: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                        <input
                          type="date"
                          value={formatToYYYYMMDD(editPayload.invoice?.date)}
                          onChange={(e) => setEditPayload((p: any) => ({
                            ...p,
                            invoice: { ...p.invoice, date: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Remarks</label>
                      <textarea
                        required
                        value={editPayload.reason}
                        onChange={(e) => setEditPayload((p: any) => ({ ...p, reason: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {editActiveTab === 'vendor' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor/Seller Name</label>
                      <input
                        type="text"
                        value={editPayload.seller?.name || ""}
                        onChange={(e) => setEditPayload((p: any) => ({
                          ...p,
                          seller: { ...p.seller, name: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                      <input
                        type="text"
                        value={editPayload.seller?.gstin || ""}
                        onChange={(e) => setEditPayload((p: any) => ({
                          ...p,
                          seller: { ...p.seller, gstin: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={editPayload.seller?.phone || ""}
                        onChange={(e) => setEditPayload((p: any) => ({
                          ...p,
                          seller: { ...p.seller, phone: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Address</label>
                      <textarea
                        value={editPayload.seller?.address || ""}
                        onChange={(e) => setEditPayload((p: any) => ({
                          ...p,
                          seller: { ...p.seller, address: e.target.value }
                        }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {editActiveTab === 'items' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-gray-700">Line Items</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const nextItems = [...(editPayload.items || []), { item_name: "", qty: 1, rate: 0, total: 0 }];
                          setEditPayload((p: any) => recalculateEditTotals({ ...p, items: nextItems }));
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                      {(editPayload.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-0.5">Item Name</label>
                            <input
                              type="text"
                              value={item.item_name || ""}
                              onChange={(e) => {
                                const nextItems = [...editPayload.items];
                                nextItems[idx] = { ...nextItems[idx], item_name: e.target.value };
                                setEditPayload((p: any) => ({ ...p, items: nextItems }));
                              }}
                              required
                              placeholder="e.g. Purchase item"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-gray-900 font-medium"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-xs text-gray-500 mb-0.5">Qty</label>
                            <input
                              type="number"
                              value={item.qty ?? 1}
                              onChange={(e) => {
                                const q = Number(e.target.value || 0);
                                const nextItems = [...editPayload.items];
                                nextItems[idx] = { ...nextItems[idx], qty: q, total: q * (nextItems[idx].rate || 0) };
                                setEditPayload((p: any) => recalculateEditTotals({ ...p, items: nextItems }));
                              }}
                              required
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-right text-gray-900 font-medium"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 mb-0.5">Rate</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.rate ?? 0}
                              onChange={(e) => {
                                const r = parseFloat(e.target.value || "0");
                                const nextItems = [...editPayload.items];
                                nextItems[idx] = { ...nextItems[idx], rate: r, total: (nextItems[idx].qty || 0) * r };
                                setEditPayload((p: any) => recalculateEditTotals({ ...p, items: nextItems }));
                              }}
                              required
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-right text-gray-900 font-medium"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 mb-0.5">Total</label>
                            <div className="w-full px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded text-xs text-right font-medium text-gray-700">
                              {formatCurrency((item.qty || 0) * (item.rate || 0))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextItems = editPayload.items.filter((_: any, i: number) => i !== idx);
                              setEditPayload((p: any) => recalculateEditTotals({ ...p, items: nextItems }));
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(editPayload.items || []).length === 0 && (
                        <div className="text-center py-6 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          No items added. Click &ldquo;Add Item&rdquo; above.
                        </div>
                      )}
                    </div>

                    {/* Taxes & Charges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                      {/* Taxes */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Taxes</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const nextTaxes = [...(editPayload.taxes || []), { label: "GST", percent: 18, amount: 0 }];
                              setEditPayload((p: any) => recalculateEditTotals({ ...p, taxes: nextTaxes }));
                            }}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Tax
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {(editPayload.taxes || []).map((t: any, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={t.label || ""}
                                onChange={(e) => {
                                  const next = [...editPayload.taxes];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  setEditPayload((p: any) => ({ ...p, taxes: next }));
                                }}
                                placeholder="GST"
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-gray-900 font-medium"
                              />
                              <input
                                type="number"
                                value={t.percent ?? 0}
                                onChange={(e) => {
                                  const pct = parseFloat(e.target.value || "0");
                                  const next = [...editPayload.taxes];
                                  next[idx] = { ...next[idx], percent: pct };
                                  setEditPayload((p: any) => ({ ...p, taxes: next }));
                                }}
                                placeholder="%"
                                className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-right text-gray-900 font-medium"
                              />
                              <input
                                type="number"
                                value={t.amount ?? 0}
                                onChange={(e) => {
                                  const amt = parseFloat(e.target.value || "0");
                                  const next = [...editPayload.taxes];
                                  next[idx] = { ...next[idx], amount: amt };
                                  setEditPayload((p: any) => recalculateEditTotals({ ...p, taxes: next }));
                                }}
                                placeholder="Amount"
                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-right text-gray-900 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = editPayload.taxes.filter((_: any, i: number) => i !== idx);
                                  setEditPayload((p: any) => recalculateEditTotals({ ...p, taxes: next }));
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Charges */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Charges / Discounts</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const nextCharges = [...(editPayload.charges || []), { label: "Delivery", amount: 0 }];
                              setEditPayload((p: any) => recalculateEditTotals({ ...p, charges: nextCharges }));
                            }}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Charge
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {(editPayload.charges || []).map((c: any, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={c.label || ""}
                                onChange={(e) => {
                                  const next = [...editPayload.charges];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  setEditPayload((p: any) => ({ ...p, charges: next }));
                                }}
                                placeholder="Delivery"
                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-gray-900 font-medium"
                              />
                              <input
                                type="number"
                                value={c.amount ?? 0}
                                onChange={(e) => {
                                  const amt = parseFloat(e.target.value || "0");
                                  const next = [...editPayload.charges];
                                  next[idx] = { ...next[idx], amount: amt };
                                  setEditPayload((p: any) => recalculateEditTotals({ ...p, charges: next }));
                                }}
                                placeholder="Amount"
                                className="w-28 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs text-right text-gray-900 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = editPayload.charges.filter((_: any, i: number) => i !== idx);
                                  setEditPayload((p: any) => recalculateEditTotals({ ...p, charges: next }));
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Total summary */}
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex justify-between items-center mt-6">
                      <div>
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Calculated Grand Total</span>
                        <div className="text-sm text-gray-500">Subtotal + Taxes + Charges</div>
                      </div>
                      <div className="text-xl font-black text-blue-700">
                        {formatCurrency(editPayload.amount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Export Statement Modal ───────────────────────────────────────────── */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExportModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 z-10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Export Wallet Statement</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Generate wallet statement PDF/Excel report</p>
                </div>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Wallet Selector */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Employee Wallet</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employee wallet... (default: All Wallets)"
                    value={exportSelectedWallet ? `${exportSelectedWallet.first_name} ${exportSelectedWallet.last_name} (ID: ${exportSelectedWallet.employee_id})` : exportWalletSearchQuery}
                    onChange={(e) => {
                      setExportWalletSearchQuery(e.target.value);
                      if (exportSelectedWallet) {
                        setExportSelectedWallet(null);
                        setExportWalletSearchQuery(e.target.value);
                      }
                      setShowExportWalletDropdown(true);
                    }}
                    onFocus={() => setShowExportWalletDropdown(true)}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                  {exportSelectedWallet && (
                    <button
                      onClick={() => {
                        setExportSelectedWallet(null);
                        setExportWalletSearchQuery("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Wallet dropdown results */}
                {showExportWalletDropdown && exportWalletsList.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowExportWalletDropdown(false)} />
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                      {exportWalletsList.map((w: any) => (
                        <button
                          key={w.employee_id}
                          onClick={() => {
                            setExportSelectedWallet(w);
                            setShowExportWalletDropdown(false);
                            setExportWalletSearchQuery("");
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{w.first_name} {w.last_name}</span>
                            <span className="text-xs text-gray-400 block">ID: {w.employee_id}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-600 bg-gray-100 rounded px-2 py-0.5">₹{Number(w.current_balance || 0).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={exportFromDate}
                    onChange={(e) => setExportFromDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={exportToDate}
                    onChange={(e) => setExportToDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Categories Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expense Category</label>
                <select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Export Format</label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-50 text-red-500 rounded animate-fade-in">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">PDF Report</span>
                    </div>
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex-1 flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-50 text-green-500 rounded animate-fade-in">
                        <FileText className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">Excel Statement</span>
                    </div>
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'excel'}
                      onChange={() => setExportFormat('excel')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={triggerExportStatement}
                disabled={exportLoading}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2 disabled:opacity-50"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Zoom Modal Overlay */}
      {zoomSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-transparent" onClick={() => setZoomSrc(null)} />
          <div className="relative max-w-5xl max-h-[90vh] bg-white rounded-xl p-2 overflow-auto flex flex-col items-center shadow-2xl border border-gray-200 z-10">
            <button
              onClick={() => setZoomSrc(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-grow overflow-auto max-h-[85vh] p-2 flex items-center justify-center min-h-[300px] min-w-[300px]">
              {String(zoomSrc).toLowerCase().split('?')[0].endsWith('.pdf') ? (
                <iframe
                  src={zoomSrc}
                  title="Document Preview"
                  className="w-[85vw] h-[80vh] border-0 rounded-lg"
                />
              ) : (
                <img
                  src={zoomSrc}
                  alt="Attachment Preview"
                  className="max-w-full h-auto max-h-[80vh] rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
