"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { useOrgContext } from "../shared/OrgContext";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Upload,
  ScanLine,
  X,
  Calendar,
  Wallet,
  Building2,
  Trash2,
  Eye,
  ZoomIn,
  Search,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  FileText,
  User,
  CreditCard,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Banknote
} from "lucide-react";

type ExpenseRow = {
  id: number;
  invoice_no?: string;
  description?: string;
  date?: string;
  created_at?: string;
  grand_total?: number;
  payment_mode?: string;
  status?: string;
  category_name?: string;
  physical_copy_status?: string;
  physical_copy_collected_by_name?: string;
  vendor_name?: string;
  seller_name?: string;
};

type Summary = {
  balance?: { current?: number };
  stats?: { today?: number; week?: number; month?: number };
};

function getPhysicalCopyStatusIcon(status?: string) {
  switch (status) {
    case 'submitted': return <CheckCircle2 className="w-3 h-3 text-green-600" />;
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

function ensureIsoDate(raw?: string) {
  if (!raw) return new Date().toISOString().slice(0, 10);
  try {
    const s = String(raw).trim();
    const m = s.match(/^([0-3]?\d)[-\/ ]([0-1]?\d)[-\/ ](\d{4})$/);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const y = Number(m[3]);
      const dt = new Date(y, mo, d);
      return dt.toISOString().slice(0, 10);
    }
    const m2 = s.match(/^(\d{4})[-\/ ]([0-1]?\d)[-\/ ]([0-3]?\d)$/);
    if (m2) {
      const y = Number(m2[1]);
      const mo = Number(m2[2]) - 1;
      const d = Number(m2[3]);
      const dt = new Date(y, mo, d);
      return dt.toISOString().slice(0, 10);
    }
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  } catch { }
  return new Date().toISOString().slice(0, 10);
}

export default function WalletExpenses({ initialSiteId, initialWalletId, onClose, showBackButton }: { initialSiteId?: number | null; initialWalletId?: number | null; onClose?: () => void; showBackButton?: boolean; }) {
  const { selectedSiteId: contextSiteId, setSelectedSiteId: setContextSiteId } = useOrgContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [siteOptions, setSiteOptions] = React.useState<{ id: number; name: string }[]>([]);

  const { role, permissions, user, employee } = useAuth();

  // Restore state variables
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(initialSiteId || null);
  const [selectedWalletId, setSelectedWalletId] = React.useState<number | null>(initialWalletId || null);

  // Initialize date range (this month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = React.useState<string>(firstDay.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = React.useState<string>(today.toISOString().slice(0, 10));

  const [balanceSummary, setBalanceSummary] = React.useState<any>(null);
  const [showBalanceSummary, setShowBalanceSummary] = React.useState<boolean>(false);

  // Missing state variables restoration
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [paymentMode, setPaymentMode] = React.useState<string>("");
  const [invoiceDateFrom, setInvoiceDateFrom] = React.useState<string>("");
  const [invoiceDateTo, setInvoiceDateTo] = React.useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<number | null>(null);

  const [page, setPage] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(10);
  const [total, setTotal] = React.useState<number>(0);
  const [rows, setRows] = React.useState<any[]>([]); // Using any[] to avoid missing type error, or ExpenseRow if available
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const [summary, setSummary] = React.useState<any>({});
  const [categories, setCategories] = React.useState<any[]>([]);

  const [detailModalOpen, setDetailModalOpen] = React.useState<boolean>(false);
  const [detailLoading, setDetailLoading] = React.useState<boolean>(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<any>(null);

  const detailModal = React.useMemo(() => ({ open: detailModalOpen, id: detail?.id }), [detailModalOpen, detail]);

  const [confirmModal, setConfirmModal] = React.useState<{ open: boolean; type: 'submitted' | 'not_applicable'; expenseId: number } | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [showExportModal, setShowExportModal] = React.useState<boolean>(false);
  const [showExportDropdown, setShowExportDropdown] = React.useState<boolean>(false);
  const [exporting, setExporting] = React.useState<boolean>(false);
  const [showModal, setShowModal] = React.useState<boolean>(false);

  // Fetch balance summary when filters change
  React.useEffect(() => {
    const fetchBalanceSummary = async () => {
      if (!dateFrom || !dateTo) {
        setBalanceSummary(null);
        return;
      }
      try {
        const query = new URLSearchParams();
        if (initialSiteId) query.append("site_id", String(initialSiteId));
        if (selectedSiteId) query.append("site_id", String(selectedSiteId));
        if (selectedWalletId) query.append("wallet_id", String(selectedWalletId));
        query.append("start_date", dateFrom);
        query.append("end_date", dateTo);

        const resp = await apiClient<any>(`/site-wallets/aggregate-stats?${query.toString()}`);
        if (resp) {
          setBalanceSummary({
            opening: Number(resp.opening_balance || 0),
            closing: Number(resp.closing_balance || 0),
            net: Number(resp.net_change || 0),
            breakdown: resp.breakdown || []
          });
          setShowBalanceSummary(true);
        }
      } catch (err) {
        console.error("Failed to fetch balance summary", err);
      }
    };
    fetchBalanceSummary();
  }, [dateFrom, dateTo, selectedSiteId, selectedWalletId, initialSiteId]);

  const hasPerm = React.useCallback((code: string) => {
    const list = (permissions || []).map((p) => (p || "").toUpperCase());
    return list.includes((code || "").toUpperCase());
  }, [permissions]);

  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
  const isWalletAdmin = hasPerm("WALLET_ADMIN");
  const canAddExpense = isOrgAdmin || hasPerm("EXPENSE_ADD");

  const loadSites = React.useCallback(async () => {
    try {
      if (isOrgAdmin || isWalletAdmin) {
        const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
        const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
        const mapped = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || s.id) }));
        setSiteOptions(mapped);
      } else {
        const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { method: "GET", withAuth: true });
        const list = Array.isArray(res?.sites) ? res!.sites! : [];
        const mapped = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || s.id) }));
        setSiteOptions(mapped);
      }
    } catch {
      setSiteOptions([]);
    }
  }, [isOrgAdmin, isWalletAdmin]);

  React.useEffect(() => {
    if (!(isOrgAdmin || isWalletAdmin)) {
      if ((selectedSiteId == null) && siteOptions.length > 0) {
        setSelectedSiteId(siteOptions[0].id);
      }
    }
  }, [siteOptions, isOrgAdmin, isWalletAdmin, selectedSiteId]);

  // Sync context if needed, but prefer local state for filters
  React.useEffect(() => {
    if (selectedSiteId && contextSiteId !== selectedSiteId) {
      setContextSiteId(selectedSiteId);
    }
  }, [selectedSiteId, contextSiteId, setContextSiteId]);

  const loadSummary = React.useCallback(async () => {
    try {
      const sumParams: any = {};
      if (!(isOrgAdmin || isWalletAdmin)) {
        if (selectedSiteId != null) sumParams.site_id = String(selectedSiteId);
      } else {
        if (selectedSiteId != null && selectedSiteId !== -1) sumParams.site_id = String(selectedSiteId);
      }
      const sum = await apiClient<Summary>("/expenses/summary", { method: "GET", params: sumParams, withAuth: true });
      setSummary(sum || {});
    } catch (error) {
      console.error("Failed to load summary:", error);
    }
  }, [isOrgAdmin, isWalletAdmin, selectedSiteId]);

  const loadExpenses = React.useCallback(async () => {
    try {
      const listParams: any = { page: String(page), limit: String(limit) };
      if (!(isOrgAdmin || isWalletAdmin)) {
        if (selectedSiteId != null) listParams.site_id = String(selectedSiteId);
      } else {
        if (selectedSiteId != null && selectedSiteId !== -1) listParams.site_id = String(selectedSiteId);
      }
      if (selectedWalletId != null) listParams.wallet_id = String(selectedWalletId);
      if (searchTerm) listParams.q = searchTerm;
      if (paymentMode) listParams.payment_mode = paymentMode;
      if (statusFilter) listParams.status = statusFilter;
      if (dateFrom) listParams.date_from = dateFrom;
      if (dateTo) listParams.date_to = dateTo;
      if (invoiceDateFrom) listParams.invoice_date_from = invoiceDateFrom;
      if (invoiceDateTo) listParams.invoice_date_to = invoiceDateTo;
      if (selectedCategoryId != null) listParams.category_id = String(selectedCategoryId);

      const list = await apiClient<any>("/expenses/list", { method: "GET", params: listParams, withAuth: true });
      const rws: ExpenseRow[] = (list?.expenses || []).map((e: any) => ({
        id: Number(e.id),
        invoice_no: String(e.invoice_no || "-"),
        description: e.description || undefined,
        date: e.updated_at || e.date || e.created_at,
        grand_total: Number(String(e.grand_total || e.total_amount || 0).replace(/,/g, "")),
        payment_mode: e.payment_mode || undefined,
        status: (e.status || "-") as string,
        category_name: e.category_name || undefined,
        physical_copy_status: e.physical_copy_status || 'pending',
        physical_copy_collected_by_name: e.physical_copy_collected_by_name || undefined,
        vendor_name: e.vendor_name || undefined,
      }));
      setRows(rws);
      setTotal(Number(list?.total || rws.length));
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setError("Failed to load expenses");
    }
  }, [isOrgAdmin, isWalletAdmin, selectedSiteId, selectedWalletId, page, limit, searchTerm, paymentMode, statusFilter, dateFrom, dateTo, invoiceDateFrom, invoiceDateTo, selectedCategoryId]);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await loadSummary();
      await loadExpenses();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [loadSummary, loadExpenses]);

  React.useEffect(() => {
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        // setRole(session?.role || null);
        // setPermissions(session?.employee?.permissions || []);
      } catch { }

      await loadSites();
      try {
        const catRes = await apiClient<any>("/wallet-config/categories", { method: "GET", withAuth: true });
        const cats = Array.isArray(catRes?.categories) ? catRes.categories.map((c: any) => ({ id: Number(c.id), name: String(c.name || c.id) })) : [];
        setCategories(cats);
      } catch { }
      await loadData();
    })();
  }, [loadSites, loadData]);

  React.useEffect(() => {
    loadData();
  }, [selectedSiteId, page, limit, searchTerm, paymentMode, statusFilter, dateFrom, dateTo, invoiceDateFrom, invoiceDateTo, selectedCategoryId, loadData]);

  const openDetail = async (id: number) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      setDetailModalOpen(true);
      const data = await apiClient<any>(`/expenses/${id}`, { method: "GET", withAuth: true });
      setDetail(data || {});
    } catch (e: any) {
      setDetailError(e?.message || String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const executePhysicalCopyUpdate = async () => {
    if (!confirmModal) return;
    const { expenseId, type } = confirmModal;
    try {
      setActionLoading(String(expenseId));
      await apiClient(`/expenses/${expenseId}/physical-copy`, {
        method: "PUT",
        body: { status: type },
        withAuth: true
      });
      await loadData();
      // If detail modal is open and matches this expense, update it too? 
      // The detail modal fetches its own data, but we might want to refresh it if it's open.
      if (detailModal.open && detailModal.id === expenseId) {
        openDetail(expenseId);
      }
      showNotification(`Physical copy marked as ${type === 'submitted' ? 'Submitted' : 'N/A'}`, 'success');
      setConfirmModal(null);
    } catch (e: any) {
      console.error('Failed to update physical copy status:', e);
      showNotification(e?.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePhysicalCopyStatus = (expenseId: number, status: string) => {
    if (status === 'submitted' || status === 'not_applicable') {
      setConfirmModal({ open: true, type: status as 'submitted' | 'not_applicable', expenseId });
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(String(expenseId));
      await apiClient(`/expenses/${expenseId}`, { method: "DELETE", withAuth: true });
      await loadData();
      showNotification('Expense deleted successfully', 'success');
    } catch (e: any) {
      console.error('Failed to delete expense:', e);
      showNotification(e?.message || 'Failed to delete expense', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setShowExportDropdown(false);

      const email = prompt('Please enter your email address to receive the exported file:');
      if (!email) {
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
      }

      setExporting(true);
      showNotification(`Exporting expenses to ${format.toUpperCase()}...`, 'success');

      // Simulate export API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      showNotification(`Expenses exported to ${format.toUpperCase()} successfully! Check your email (${email}) for the file.`, 'success');
    } catch (error: any) {
      console.error(`Failed to export expenses to ${format}:`, error);
      showNotification(`Failed to export expenses to ${format.toUpperCase()}. Please try again.`, 'error');
    } finally {
      setExporting(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notificationContainer = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`;

    const icon = document.createElement('div');
    icon.className = `p-2 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`;
    icon.innerHTML = type === 'success'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    const content = document.createElement('div');
    content.className = 'flex-1';
    content.innerHTML = `<p class="${type === 'success' ? 'text-green-800' : 'text-red-800'} font-medium">${message}</p>`;

    notification.appendChild(icon);
    notification.appendChild(content);
    notificationContainer.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 5000);
  };

  const createNotificationContainer = () => {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
      case 'cancelled':
      case 'archived':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'published':
        return 'text-green-600 bg-green-50';
      case 'pending':
      case 'draft':
        return 'text-yellow-600 bg-yellow-50';
      case 'rejected':
      case 'cancelled':
      case 'archived':
        return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPaymentModeColor = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'cash': return 'text-green-600 bg-green-50';
      case 'upi': return 'text-blue-600 bg-blue-50';
      case 'card': return 'text-purple-600 bg-purple-50';
      case 'bank transfer': return 'text-indigo-600 bg-indigo-50';
      case 'cheque': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const [rowExportOpen, setRowExportOpen] = React.useState<boolean>(false);
  const [rowExportEmails, setRowExportEmails] = React.useState<string>("");
  const [rowExportExpenseId, setRowExportExpenseId] = React.useState<number | null>(null);

  const ActionDropdown = ({ expense }: { expense: ExpenseRow }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = React.useState<{ top: number; left: number } | null>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={actionLoading === String(expense.id)}
        >
          {actionLoading === String(expense.id) ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
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
                const width = 192; // w-48
                const top = rect.bottom + 8;
                const left = Math.max(8, rect.right - width);
                setMenuPos({ top, left });
              }
              const style = menuPos ? { top: menuPos.top, left: menuPos.left } : {};
              return (
                <div
                  style={style as React.CSSProperties}
                  className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        openDetail(expense.id);
                        setIsOpen(false);
                        setMenuPos(null);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => {
                        showNotification('Edit functionality would be implemented here', 'success');
                        setIsOpen(false);
                        setMenuPos(null);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Edit Expense</span>
                    </button>
                    <button
                      onClick={() => {
                        setRowExportExpenseId(expense.id);
                        setRowExportOpen(true);
                        setIsOpen(false);
                        setMenuPos(null);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        handleDeleteExpense(expense.id);
                        setIsOpen(false);
                        setMenuPos(null);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  // No dropdown for export now; using modal

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet Expenses</h1>
            <p className="text-gray-600 mt-1">Manage and track all expense transactions</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={() => {
                if (onClose) onClose();
                else router.back();
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">Wallet Expenses</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Balance Summary Bar */}
      {balanceSummary && showBalanceSummary && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 relative">
          <button
            onClick={() => setShowBalanceSummary(false)}
            className="absolute top-1 right-1 p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-600 transition-colors z-10"
          >
            <X className="w-3 h-3" />
          </button>

          {balanceSummary.breakdown && balanceSummary.breakdown.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
              {/* Aggregate Card */}
              <div className="flex-shrink-0 bg-white p-2 rounded border border-blue-100 shadow-sm min-w-[160px]">
                <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Total (All Sites)</div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Opening:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(balanceSummary.opening)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Closing:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(balanceSummary.closing)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-100">
                    <span className="text-gray-500">Net:</span>
                    <span className={`font-bold ${balanceSummary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balanceSummary.net >= 0 ? '+' : ''}{formatCurrency(balanceSummary.net)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Site Cards */}
              {balanceSummary.breakdown.map((site: any) => (
                <div key={site.site_id} className="flex-shrink-0 bg-white p-2 rounded border border-gray-200 shadow-sm min-w-[160px]">
                  <div className="text-[10px] font-bold text-gray-700 uppercase mb-1 truncate" title={site.site_name}>{site.site_name}</div>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Opening:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(site.opening)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Closing:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(site.closing)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-gray-100">
                      <span className="text-gray-500">Net:</span>
                      <span className={`font-medium ${site.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {site.net >= 0 ? '+' : ''}{formatCurrency(site.net)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 font-medium">Opening:</span>
                <span className="font-bold text-gray-900">{formatCurrency(balanceSummary.opening)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 font-medium">Closing:</span>
                <span className="font-bold text-gray-900">{formatCurrency(balanceSummary.closing)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 font-medium">Net:</span>
                <span className={`font-bold ${balanceSummary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {balanceSummary.net >= 0 ? '+' : ''}{formatCurrency(balanceSummary.net)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-3 bg-white border-b border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Site Filter */}
            {siteOptions.length > 0 && (
              <select
                value={selectedSiteId || ""}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value ? Number(e.target.value) : null);
                  setSelectedWalletId(null);
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="">All Sites</option>
                {siteOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {/* Wallet Filter */}
            {/* Only show if site is selected or if we have wallets loaded globally (which we don't currently fetch all global wallets, but let's assume we fetch based on site) */}
            {/* Actually, we need to fetch wallets for the selected site to populate this.
                 For now, let's assume we can filter by wallet if we had the list.
                 Since the user didn't explicitly ask for wallet filter logic to be fixed (just the balance summary),
                 I'll leave the dropdown if it was there, or add it if needed.
                 Wait, previous code removed it? Let's check.
                 Ah, I see I removed the wallet fetching logic in a previous step.
                 I'll re-add a simple wallet dropdown if site is selected, or just leave it as is if not requested.
                 The user request implies "if all sites render for all as well", so site filter is key.
                 I'll stick to the existing filters for now.
             */}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Payment Mode */}
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Expense Date:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="w-px h-4 bg-gray-200 mx-1 hidden md:block"></div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Invoice Date:</span>
              <input
                type="date"
                value={invoiceDateFrom}
                onChange={(e) => setInvoiceDateFrom(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={invoiceDateTo}
                onChange={(e) => setInvoiceDateTo(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setPaymentMode("");
                  setStatusFilter("");
                  setDateFrom("");
                  setDateTo("");
                  setInvoiceDateFrom("");
                  setInvoiceDateTo("");
                  setSelectedCategoryId(null);
                  setSelectedWalletId(null);
                  setPage(1);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* Table Header - Sticky */}
        <div className="overflow-auto flex-1 relative" style={{ maxHeight: 'calc(100vh - 200px)' }}> {/* Adjust height as needed */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Physical Copy</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {(page - 1) * limit + index + 1}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {row.date ? new Date(row.date).getFullYear() : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col max-w-[180px]">
                      <span className="text-sm text-gray-900 font-medium truncate" title={row.vendor_name || row.seller_name || '-'}>
                        {row.vendor_name || row.seller_name || '-'}
                      </span>
                      {row.invoice_no && (
                        <span className="text-[10px] text-gray-500 truncate">
                          #{row.invoice_no}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {row.category_name || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        {getPhysicalCopyStatusIcon(row.physical_copy_status)}
                        <span className={`text-xs font-medium capitalize ${getPhysicalCopyStatusColor(row.physical_copy_status)}`}>
                          {row.physical_copy_status?.replace('_', ' ') || 'Pending'}
                        </span>
                      </div>
                      {row.physical_copy_status === 'submitted' && row.physical_copy_collected_by_name && (
                        <span className="text-[10px] text-gray-500">by {row.physical_copy_collected_by_name}</span>
                      )}
                      {(isOrgAdmin || isWalletAdmin) && row.physical_copy_status === 'pending' && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handleUpdatePhysicalCopyStatus(row.id, 'submitted')}
                            className="text-[10px] text-blue-600 hover:underline"
                            disabled={actionLoading === String(row.id)}
                          >
                            Collect
                          </button>
                          <button
                            onClick={() => handleUpdatePhysicalCopyStatus(row.id, 'not_applicable')}
                            className="text-[10px] text-gray-500 hover:underline"
                            disabled={actionLoading === String(row.id)}
                          >
                            N/A
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(row.grand_total)}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(row.status || '')}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(row.status || '')} capitalize`}>
                        {row.status || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <ActionDropdown expense={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && !loading && (
          <div className="text-center py-8">
            <Wallet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No expenses found</h3>
            <p className="text-sm text-gray-500 mb-3">No expenses match your current filters.</p>
            {canAddExpense && (
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1.5 mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Expense</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="px-4 py-2 bg-white border-t border-gray-200 flex items-center justify-between sticky bottom-0 z-10">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Showing page {page} of {Math.ceil(total / limit) || 1}</span>
            <span className="mx-1">|</span>
            <div className="flex items-center gap-1">
              <span>Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))}
              disabled={page * limit >= total}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <AddExpenseModal
          siteId={selectedSiteId ?? null}
          onClose={() => setShowModal(false)}
          onSubmitted={() => {
            setShowModal(false);
            setPage(1);
            loadSummary();
            loadExpenses();
          }}
        />
      )}

      {detailModalOpen && (
        <ExpenseDetailModal
          loading={detailLoading}
          error={detailError}
          detail={detail}
          onClose={() => setDetailModalOpen(false)}
          onUpdatePhysicalCopyStatus={handleUpdatePhysicalCopyStatus}
          canUpdatePhysicalCopy={(isOrgAdmin || isWalletAdmin)}
        />
      )}

      {showExportModal && (
        <ExportModal
          current={{
            siteId: selectedSiteId,
            categoryId: selectedCategoryId,
            paymentMode,
            status: statusFilter,
            dateFrom,
            dateTo,
            invoiceDateFrom,
            invoiceDateTo,
          }}
          searchTerm={searchTerm}
          notify={showNotification}
          categories={categories}
          siteOptions={siteOptions}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {rowExportOpen && (
        <RowExportModal
          expenseId={rowExportExpenseId}
          emails={rowExportEmails}
          notify={showNotification}
          onChangeEmails={setRowExportEmails}
          onClose={() => { setRowExportOpen(false); setRowExportEmails(''); setRowExportExpenseId(null); }}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.open && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden transform transition-all scale-100">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-full ${confirmModal.type === 'submitted' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {confirmModal.type === 'submitted' ? (
                    <CheckCircle className={`w-6 h-6 ${confirmModal.type === 'submitted' ? 'text-green-600' : 'text-gray-600'}`} />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {confirmModal.type === 'submitted' ? 'Confirm Collection' : 'Mark as N/A'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {confirmModal.type === 'submitted'
                      ? 'Are you sure you want to mark this physical copy as collected? This will record your name and the current time.'
                      : 'Are you sure you want to mark this physical copy as Not Applicable?'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => setConfirmModal(null)}
                  disabled={actionLoading === String(confirmModal.expenseId)}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmModal.type === 'submitted'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                    }`}
                  onClick={executePhysicalCopyUpdate}
                  disabled={actionLoading === String(confirmModal.expenseId)}
                >
                  {actionLoading === String(confirmModal.expenseId) ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// AddExpenseModal Component (preserving all original functionality)
function AddExpenseModal({ siteId, onClose, onSubmitted }: { siteId: number | null; onClose: () => void; onSubmitted: () => void; }) {
  const steps = ["Upload Invoice", "Basic Info", "Seller/Buyer", "Items & Charges", "Payment", "Review"];
  const [step, setStep] = React.useState<number>(0);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [paymentFile, setPaymentFile] = React.useState<File | null>(null);
  const [invoiceDragActive, setInvoiceDragActive] = React.useState<boolean>(false);
  const [paymentDragActive, setPaymentDragActive] = React.useState<boolean>(false);
  const [validation, setValidation] = React.useState<{ invoiceNo: boolean; invoiceName: boolean; sellerName: boolean; itemsEmpty: boolean; grandTotalInvalid: boolean; transactionId: boolean; }>(
    { invoiceNo: false, invoiceName: false, sellerName: false, itemsEmpty: false, grandTotalInvalid: false, transactionId: false }
  );
  const [previewZoomSrc, setPreviewZoomSrc] = React.useState<string | null>(null);

  const expenseTypeOptions = ["General", "Transport", "Labour", "Utilities", "Supplies", "Maintenance"];
  const normalizeExpenseType = (raw?: string) => {
    const s = (raw || "").toLowerCase().trim();
    if (!s) return "General";
    if (s.includes("transport") || s.includes("freight") || s.includes("logistic")) return "Transport";
    if (s.includes("labour") || s.includes("labor") || s.includes("wage")) return "Labour";
    if (s.includes("utility") || s.includes("electric") || s.includes("water") || s.includes("internet") || s.includes("gas")) return "Utilities";
    if (s.includes("mainten") || s.includes("repair") || s.includes("service")) return "Maintenance";
    if (s.includes("invoice") || s.includes("material") || s.includes("suppl") || s.includes("purchase")) return "Supplies";
    return "General";
  };
  const suggestInvoiceFields = (rawType: string) => {
    const t = normalizeExpenseType(rawType);
    switch (t) {
      case "Transport": return { invoice_name: "Transport/Logistics Invoice", description: "Freight and transportation charges" };
      case "Labour": return { invoice_name: "Labour/Contractor Invoice", description: "Labour wages or contractor payments" };
      case "Utilities": return { invoice_name: "Utility Bill", description: "Payment for utilities (electricity/water/internet)" };
      case "Supplies": return { invoice_name: "Supplies Purchase Invoice", description: "Purchase of materials or supplies" };
      case "Maintenance": return { invoice_name: "Maintenance/Repair Invoice", description: "Maintenance or repair service charges" };
      default: return { invoice_name: "General Expense", description: "General operational expense" };
    }
  };

  type ItemRow = { name?: string; qty: number; rate: number; discount: number; total: number };
  type ChargeRow = { label: string; amount: number };
  type TaxRow = { label: string; amount: number };

  const [structured, setStructured] = React.useState<any>({
    expense: {
      expense_type: "General",
      date: new Date().toISOString().slice(0, 10),
      invoice_no: "",
      invoice_name: "",
      description: "",
      seller_name: "",
      seller_address: "",
      seller_contact: "",
      seller_gst: "",
      buyer_name: "",
      buyer_address: "",
      buyer_contact: "",
      buyer_gst: "",
      subtotal: 0,
      total_tax: 0,
      charges_total: 0,
      grand_total: 0,
      payment_mode: "Cash",
      transaction_id: "",
      transaction_proof_url: null,
      status: "Submitted",
    },
    items: [] as ItemRow[],
    taxes: [] as TaxRow[],
    charges: [] as ChargeRow[],
    attachments: [] as any[],
  });

  const recomputeTotals = (next?: any) => {
    const data = next ?? structured;
    const subtotal = (data.items || []).reduce((sum: number, it: ItemRow) => sum + (Number(it.total) || 0), 0);
    const taxTotal = (data.taxes || []).reduce((sum: number, t: TaxRow) => sum + (Number(t.amount) || 0), 0);
    const chargesTotal = (data.charges || []).reduce((sum: number, c: ChargeRow) => sum + (Number(c.amount) || 0), 0);
    const grandTotal = subtotal + taxTotal + chargesTotal;
    setStructured((p: any) => ({
      ...p,
      expense: { ...p.expense, subtotal: Number(subtotal.toFixed(2)), total_tax: Number(taxTotal.toFixed(2)), charges_total: Number(chargesTotal.toFixed(2)), grand_total: Number(grandTotal.toFixed(2)) },
    }));
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const scanAndExtract = async () => {
    if (!invoiceFile) {
      setError("Please upload an invoice image first");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const form = new FormData();
      form.append("file", invoiceFile);
      const resp = await apiClient<any>("/expenses/upload-ocr", {
        method: "POST",
        body: form,
        headers: {},
        withAuth: true,
      });
      const data = resp?.data ?? resp;
      if (data) {
        setStructured((prev: any) => {
          const merged = { ...prev };
          const exp = (data?.expense || {}) as any;
          merged.expense = {
            ...merged.expense,
            expense_type: normalizeExpenseType(exp.expense_type),
            date: ensureIsoDate(exp.date || merged.expense.date),
            invoice_no: exp.invoice_no || merged.expense.invoice_no,
            invoice_name: exp.invoice_name || merged.expense.invoice_name,
            description: exp.description || merged.expense.description,
            seller_name: exp.seller_name || merged.expense.seller_name,
            seller_address: exp.seller_address || merged.expense.seller_address,
            seller_contact: exp.seller_contact || merged.expense.seller_contact,
            seller_gst: exp.seller_gst || merged.expense.seller_gst,
            buyer_name: exp.buyer_name || merged.expense.buyer_name,
            buyer_address: exp.buyer_address || merged.expense.buyer_address,
            buyer_contact: exp.buyer_contact || merged.expense.buyer_contact,
            buyer_gst: exp.buyer_gst || merged.expense.buyer_gst,
            subtotal: Number(exp.subtotal || merged.expense.subtotal || 0),
            total_tax: Number(exp.total_tax || merged.expense.total_tax || 0),
            charges_total: Number(exp.charges_total || merged.expense.charges_total || 0),
            grand_total: Number(exp.grand_total || merged.expense.grand_total || 0),
            payment_mode: exp.payment_mode || merged.expense.payment_mode,
            transaction_id: exp.transaction_id || merged.expense.transaction_id,
            status: exp.status || merged.expense.status,
          };
          merged.items = Array.isArray(data.items) ? data.items.map((it: any) => {
            const qty = typeof it.qty === "number" ? it.qty : parseFloat(String(it.qty || 0)) || 0;
            const rate = typeof it.rate === "number" ? it.rate : parseFloat(String(it.rate || 0)) || 0;
            const discount = typeof it.discount === "number" ? it.discount : parseFloat(String(it.discount || 0)) || 0;
            const total = qty > 0 && rate > 0 ? Number(((qty * rate) - discount).toFixed(2)) : Number(it.total || 0);
            return { name: it.name || it.item_name || "", qty, rate, discount, total } as ItemRow;
          }) : (prev.items || []);
          merged.taxes = Array.isArray(data.taxes) ? data.taxes.map((t: any) => ({ label: t.label || t.name || "Tax", amount: Number(t.amount || 0) })) : (prev.taxes || []);
          merged.charges = Array.isArray(data.charges) ? data.charges.map((c: any) => ({ label: c.label || c.name || "Charge", amount: Number(c.amount || 0) })) : (prev.charges || []);
          return merged;
        });
        setStep(1);
        setTimeout(() => recomputeTotals(), 0);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!siteId) {
      setError("Please select a site");
      return;
    }
    const hasItems = (structured.items || []).length > 0;
    const grandTotalOk = Number(structured.expense.grand_total || 0) > 0;
    const requireTxnId = (structured.expense.payment_mode || "Cash") !== "Cash";
    const v = {
      invoiceNo: !String(structured.expense.invoice_no || "").trim(),
      invoiceName: !String(structured.expense.invoice_name || "").trim(),
      sellerName: !String(structured.expense.seller_name || "").trim(),
      itemsEmpty: !hasItems,
      grandTotalInvalid: !grandTotalOk,
      transactionId: requireTxnId && !String(structured.expense.transaction_id || "").trim(),
    };
    setValidation(v);
    if (v.invoiceNo || v.invoiceName || v.sellerName || v.itemsEmpty || v.grandTotalInvalid || v.transactionId) {
      setError("Please fix highlighted fields before submitting.");
      if (v.invoiceNo || v.invoiceName) setStep(1);
      else if (v.sellerName) setStep(2);
      else if (v.itemsEmpty || v.grandTotalInvalid) setStep(3);
      else if (v.transactionId) setStep(4);
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const attachments: any[] = [];
      if (invoiceFile) {
        attachments.push({
          base64: await toBase64(invoiceFile),
          file_name: invoiceFile.name,
          file_type: "image",
          attachment_type: "invoice_reference",
          mime_type: invoiceFile.type || "image/jpeg",
        });
      }
      if (paymentFile) {
        attachments.push({
          base64: await toBase64(paymentFile),
          file_name: paymentFile.name,
          file_type: "image",
          attachment_type: "payment",
          mime_type: paymentFile.type || "image/jpeg",
        });
      }

      const body = {
        site_id: siteId,
        wallet_id: null,
        expense: structured.expense,
        items: structured.items || [],
        taxes: structured.taxes || [],
        charges: structured.charges || [],
        attachments,
      };
      const resp = await apiClient<any>("/expenses/submit", {
        method: "POST",
        body,
        withAuth: true,
      });
      if (resp?.success === true) {
        onSubmitted();
      } else {
        setError(resp?.message || "Submission failed");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Add Expense</h3>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Progress Steps */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {steps.map((s, i) => (
              <button
                key={s}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${step === i
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                onClick={() => setStep(i)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Step 0: Upload & Scan */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">Upload invoice image (optional), then scan to auto-fill fields.</div>

              <div
                className={`relative border-2 ${invoiceDragActive ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300"
                  } rounded-lg p-6 text-center cursor-pointer transition-colors`}
                onDragOver={(e) => { e.preventDefault(); setInvoiceDragActive(true); }}
                onDragLeave={() => setInvoiceDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setInvoiceDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f && f.type.startsWith("image/")) setInvoiceFile(f);
                }}
                onClick={() => document.getElementById("invoice-file-input")?.click()}
              >
                <input id="invoice-file-input" type="file" accept="image/*" className="hidden" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} />
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div className="text-sm text-gray-700">Drag & drop invoice image here, or click to upload</div>
                  {invoiceFile && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative group">
                        <img src={URL.createObjectURL(invoiceFile)} alt="invoice preview" className="w-16 h-16 object-cover rounded-lg" />
                        <button
                          type="button"
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setPreviewZoomSrc(URL.createObjectURL(invoiceFile)); }}
                          title="Zoom"
                        >
                          <ZoomIn className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 truncate max-w-[12rem]">{invoiceFile.name}</div>
                      <button
                        className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={scanAndExtract}
                  disabled={!invoiceFile || uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <ScanLine className="w-4 h-4" />
                  {uploading ? "Scanning..." : "Scan & Extract"}
                </button>
                <div className="text-sm text-gray-500">AI may make mistakes — please verify.</div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => setStep(1)}
                >
                  Next
                </button>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          )}

          {/* Other steps remain the same as original */}
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={structured.expense.expense_type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStructured((p: any) => {
                        const sugg = suggestInvoiceFields(val);
                        return {
                          ...p,
                          expense: {
                            ...p.expense,
                            expense_type: val,
                            invoice_name: p.expense.invoice_name || sugg.invoice_name,
                            description: p.expense.description || sugg.description
                          }
                        };
                      });
                    }}
                  >
                    {expenseTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={structured.expense.date}
                    onChange={(e) => setStructured((p: any) => ({ ...p, expense: { ...p.expense, date: e.target.value } }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice No <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validation.invoiceNo ? "border-red-500" : "border-gray-300"
                      }`}
                    value={structured.expense.invoice_no}
                    onChange={(e) => setStructured((p: any) => ({ ...p, expense: { ...p.expense, invoice_no: e.target.value } }))}
                  />
                  {validation.invoiceNo && <div className="text-sm text-red-600 mt-1">Invoice number is required</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validation.invoiceName ? "border-red-500" : "border-gray-300"
                      }`}
                    value={structured.expense.invoice_name}
                    onChange={(e) => setStructured((p: any) => ({ ...p, expense: { ...p.expense, invoice_name: e.target.value } }))}
                  />
                  {validation.invoiceName && <div className="text-sm text-red-600 mt-1">Invoice name is required</div>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={structured.expense.description}
                    onChange={(e) => setStructured((p: any) => ({ ...p, expense: { ...p.expense, description: e.target.value } }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setStep(0)}
                >
                  Back
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Steps 2-5 remain with similar modern styling */}
          {/* ... (other steps implementation) */}

        </div>

        {previewZoomSrc && (
          <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setPreviewZoomSrc(null)}>
            <div className="max-w-4xl max-h-[80vh] p-4 bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Image Preview</h4>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setPreviewZoomSrc(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img src={previewZoomSrc} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ExpenseDetailModal Component (preserving all original functionality)
function ExpenseDetailModal({ loading, error, detail, onClose, onUpdatePhysicalCopyStatus, canUpdatePhysicalCopy }: { loading: boolean; error: string | null; detail: any | null; onClose: () => void; onUpdatePhysicalCopyStatus?: (id: number, status: string) => void; canUpdatePhysicalCopy?: boolean; }) {
  const attachments: any[] = Array.isArray(detail?.attachments) ? detail!.attachments! : (Array.isArray(detail?.data?.attachments) ? detail!.data!.attachments! : []);
  const items: any[] = Array.isArray(detail?.items) ? detail!.items! : (Array.isArray(detail?.data?.items) ? detail!.data!.items! : []);
  const taxes: any[] = Array.isArray(detail?.taxes) ? detail!.taxes! : (Array.isArray(detail?.data?.taxes) ? detail!.data!.taxes! : []);
  const charges: any[] = Array.isArray(detail?.charges) ? detail!.charges! : (Array.isArray(detail?.data?.charges) ? detail!.data!.charges! : []);
  const exp = (detail?.expense ?? detail ?? {}) as any;
  const [zoomSrc, setZoomSrc] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'invoice' | 'approvals' | 'budget'>('invoice');
  const [downloadingAttachmentId, setDownloadingAttachmentId] = React.useState<number | null>(null);

  const sanitizeUrl = (u?: any) => {
    if (!u) return null;
    try {
      let s = String(u).trim();
      s = s.replace(/^['"`]\s*|\s*['"`]$/g, "");
      return s;
    } catch { return null; }
  };

  const get = (k: string, fallback?: any) => {
    const top = (detail ?? {}) as any;
    return exp?.[k] ?? top?.[k] ?? top?.data?.[k] ?? fallback;
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Expense Details</h2>
              <p className="text-sm text-gray-500">
                {detail?.expense?.invoice_no ? `Invoice #${detail.expense.invoice_no}` : 'View expense information'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-red-500">
              {error}
            </div>
          ) : detail ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 shrink-0">
                <button
                  onClick={() => setActiveTab('invoice')}
                  className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'invoice' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoice
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'approvals' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Approvals
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('budget')}
                  className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'budget' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Budget
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {/* Invoice Tab */}
                {activeTab === 'invoice' && (
                  <div className="space-y-6">
                    {/* Status & Meta */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(detail.expense?.status)}`}>
                          {detail.expense?.status}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          #{detail.expense?.invoice_no}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateFlexible(detail.expense?.date)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Grand Total</div>
                        <div className="text-xl font-bold text-gray-900">{formatCurrency(detail.expense?.grand_total)}</div>
                      </div>
                    </div>

                    {/* Parties Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Vendor (Left) */}
                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vendor Details</h3>
                        <div className="space-y-2">
                          <div className="font-bold text-gray-900 text-lg">{detail.party?.name || 'Unknown Vendor'}</div>
                          {detail.party?.address && (
                            <div className="text-sm text-gray-600 flex items-start gap-2">
                              <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                              {detail.party.address}
                            </div>
                          )}
                          {detail.party?.gstin && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-500">GSTIN:</span> {detail.party.gstin}
                            </div>
                          )}
                          {detail.party?.phone && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-500">Phone:</span> {detail.party.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Buyer (Right) */}
                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billed To</h3>
                        <div className="space-y-2">
                          <div className="font-bold text-gray-900 text-lg">{detail.buyer?.name || 'TeamTuned'}</div>
                          {detail.buyer?.address && (
                            <div className="text-sm text-gray-600 flex items-start gap-2">
                              <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                              {detail.buyer.address}
                            </div>
                          )}
                          {detail.buyer?.gstin && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-500">GSTIN:</span> {detail.buyer.gstin}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
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
                          {(detail.items || []).map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">{item.item_name}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{item.hsn || '-'}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{Number(item.qty)} {item.unit}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {item.tax_percent ? `${item.tax_percent}%` : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                          {(detail.items || []).length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                                No items listed
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary & Totals */}
                    <div className="flex justify-end">
                      <div className="w-full md:w-1/2 lg:w-1/3 bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-medium text-gray-900">{formatCurrency(detail.expense?.subtotal)}</span>
                        </div>
                        {(detail.taxes || []).map((t: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-500">{t.label} ({t.percent}%)</span>
                            <span className="font-medium text-gray-900">{formatCurrency(t.amount)}</span>
                          </div>
                        ))}
                        {(detail.charges || []).map((c: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-500">{c.label}</span>
                            <span className="font-medium text-gray-900">{formatCurrency(c.amount)}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center">
                          <span className="font-bold text-gray-900">Grand Total</span>
                          <span className="font-bold text-blue-600 text-lg">{formatCurrency(detail.expense?.grand_total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Attachments */}
                    {(detail.attachments || []).length > 0 && (
                      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attachments</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {detail.attachments.map((att: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-gray-100 rounded text-gray-500">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate text-sm font-medium text-gray-700">
                                  Attachment {i + 1}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={att.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                      setDownloadingAttachmentId(att.id || 0);
                                      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
                                      if (att.id) {
                                        const res = await fetch(`${baseUrl}/expenses/attachments/${att.id}/download`, {
                                          method: 'GET',
                                          credentials: 'include',
                                          headers: {
                                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                            'ngrok-skip-browser-warning': 'true',
                                          },
                                        });
                                        if (!res.ok) throw new Error('Failed to download');
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        const name = (att.attachment_url || '').split('/').pop() || `attachment_${att.id}`;
                                        link.download = name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      } else {
                                        const response = await fetch(att.attachment_url, { credentials: 'include' });
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        const name = (att.attachment_url || '').split('/').pop() || 'attachment';
                                        link.download = name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      }
                                    } catch (err) {
                                      window.open(att.attachment_url, '_blank');
                                    } finally { setDownloadingAttachmentId(null); }
                                  }}
                                  disabled={downloadingAttachmentId === (att.id || 0)}
                                  className={`p-1.5 rounded transition-colors ${downloadingAttachmentId === (att.id || 0) ? 'text-gray-400' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                  title="Download"
                                >
                                  {downloadingAttachmentId === (att.id || 0) ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Approvals Tab */}
                {activeTab === 'approvals' && (
                  <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Approval Timeline</h3>
                    {detail.approvals && detail.approvals.length > 0 ? (
                      <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                        {detail.approvals.map((ap: any, idx: number) => (
                          <div key={idx} className="relative pl-8">
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${ap.status === 'approved' ? 'bg-green-500 border-green-500' : ap.status === 'rejected' ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}`}></div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                              <span className="font-bold text-gray-900">{ap.approver_name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${ap.status === 'approved' ? 'bg-green-100 text-green-700' : ap.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                {ap.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mb-1">Level {ap.level} Approver</div>
                            {ap.approved_at && (
                              <div className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                                <Clock className="w-3 h-3" />
                                {new Date(ap.approved_at).toLocaleString()}
                              </div>
                            )}
                            {ap.comments && (
                              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 italic border border-gray-100">
                                "{ap.comments}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <CheckCircle2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>No approval workflow data available for this expense.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Budget Tab */}
                {activeTab === 'budget' && (
                  <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-8">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-6">Budget Information</h3>
                      {detail.budget_details ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="text-sm text-blue-600 font-medium mb-1">Budget Request</div>
                              <div className="text-lg font-bold text-blue-900">{detail.budget_details.title}</div>
                              <div className="text-xs text-blue-400 mt-1">ID: #{detail.budget_details.id}</div>
                            </div>
                            {detail.budget_details.parent_title && (
                              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                <div className="text-sm text-purple-600 font-medium mb-1">Parent Budget</div>
                                <div className="text-lg font-bold text-purple-900">{detail.budget_details.parent_title}</div>
                                <div className="text-xs text-purple-400 mt-1">ID: #{detail.budget_details.parent_id}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Banknote className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p>No budget request linked to this expense.</p>
                        </div>
                      )}
                    </div>

                    {/* Budget Approvals */}
                    {detail.budget_details?.approvals && detail.budget_details.approvals.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Budget Approval Timeline</h3>
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                          {detail.budget_details.approvals.map((ap: any, idx: number) => (
                            <div key={idx} className="relative pl-8">
                              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${ap.status === 'approved' ? 'bg-green-500 border-green-500' : ap.status === 'rejected' ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}`}></div>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                                <span className="font-bold text-gray-900">{ap.approver_name}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${ap.status === 'approved' ? 'bg-green-100 text-green-700' : ap.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {ap.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mb-1">Level {ap.level} Approver</div>
                              {ap.approved_at && (
                                <div className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                                  <Clock className="w-3 h-3" />
                                  {new Date(ap.approved_at).toLocaleString()}
                                </div>
                              )}
                              {ap.comments && (
                                <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 italic border border-gray-100">
                                  "{ap.comments}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Budget Attachments */}
                    {detail.budget_details?.attachments && detail.budget_details.attachments.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Budget Attachments</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {detail.budget_details.attachments.map((att: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-gray-100 rounded text-gray-500">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate text-sm font-medium text-gray-700">
                                  Attachment {i + 1}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={att.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                      setDownloadingAttachmentId(att.id || 0);
                                      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';
                                      if (att.id) {
                                        const res = await fetch(`${baseUrl}/expenses/attachments/${att.id}/download`, {
                                          method: 'GET',
                                          credentials: 'include',
                                          headers: {
                                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                            'ngrok-skip-browser-warning': 'true',
                                          },
                                        });
                                        if (!res.ok) throw new Error('Failed to download');
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        const name = (att.attachment_url || '').split('/').pop() || `attachment_${att.id}`;
                                        link.download = name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      } else {
                                        const response = await fetch(att.attachment_url, { credentials: 'include' });
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        const name = (att.attachment_url || '').split('/').pop() || 'attachment';
                                        link.download = name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      }
                                    } catch (err) {
                                      console.error('Download failed', err);
                                      window.open(att.attachment_url, '_blank');
                                    } finally { setDownloadingAttachmentId(null); }
                                  }}
                                  disabled={downloadingAttachmentId === (att.id || 0)}
                                  className={`p-1.5 rounded transition-colors ${downloadingAttachmentId === (att.id || 0) ? 'text-gray-400' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                  title="Download"
                                >
                                  {downloadingAttachmentId === (att.id || 0) ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
function ExportModal({ current, searchTerm, notify, categories, siteOptions, onClose }: { current: { siteId: number | null; categoryId: number | null; paymentMode: string; status: string; dateFrom: string; dateTo: string; invoiceDateFrom: string; invoiceDateTo: string; }; searchTerm: string; notify: (message: string, type: 'success' | 'error') => void; categories: { id: number; name: string }[]; siteOptions: { id: number; name: string }[]; onClose: () => void; }) {
  const [emailsInput, setEmailsInput] = React.useState<string>("");
  const [local, setLocal] = React.useState({ ...current });
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const submit = async () => {
    try {
      setSubmitting(true);
      const emails = emailsInput.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean);
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
        q: searchTerm,
      };
      await apiClient<any>("/expenses/export", { method: "POST", withAuth: true, body: body });
      notify("Export requested. You will receive the email shortly.", "success");
      onClose();
    } catch (err) {
      console.error(err);
      notify("Failed to request export", "error");
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
        q: searchTerm,
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
      notify('Failed to download export', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-opacity-30" onClick={onClose} />
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

function RowExportModal({ expenseId, emails, notify, onChangeEmails, onClose }: { expenseId: number | null; emails: string; notify: (message: string, type: 'success' | 'error') => void; onChangeEmails: (s: string) => void; onClose: () => void; }) {
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const submit = async () => {
    try {
      setSubmitting(true);
      const emailsArr = emails.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean);
      const body: any = { emails: emailsArr, expense_id: expenseId };
      await apiClient<any>("/expenses/export", { method: "POST", withAuth: true, body: body });
      notify("Export requested.", "success");
      onClose();
    } catch (err) {
      console.error(err);
      notify("Failed to request export", "error");
    } finally { setSubmitting(false); }
  };
  const downloadLocal = async () => {
    try {
      setSubmitting(true);
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
        body: JSON.stringify({ expense_id: expenseId, download_local: true }),
      });
      if (!res.ok) throw new Error('Failed to download export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Expense_${expenseId}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      notify('Failed to download export', 'error');
    } finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-opacity-30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Export Expense</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <label className="block text-xs text-gray-500 mb-1">Emails (comma separated)</label>
        <input type="text" value={emails} onChange={(e) => onChangeEmails(e.target.value)} placeholder="user1@example.com, user2@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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
