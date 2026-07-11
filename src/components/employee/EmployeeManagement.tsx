"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import AdditionalDebitsWizard from "./AdditionalDebitsWizard";
import {
  Users,
  Search,
  Filter,
  Download,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Building,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Upload,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  User,
  Pencil,
} from "lucide-react";

// Types for dropdown datasets
export type Department = { id: number; name: string };
export type Role = { id: number; name: string; department_id: number };
export type Site = { id: number; name: string; code: string };
export type AttendancePolicy = {
  id?: number;
  policy_name: string;
  policy_description?: string;
  leave_cycle: "monthly" | "yearly";
  total_annual_leaves: number;
  max_leave_per_month: number;
  max_carry_forward_leaves: number;
  monthly_carry_forward_allowed: boolean;

  standard_work_hours?: number;
  grace_period_minutes?: number;
  max_late_marks_per_month?: number;
  late_logout_redeem_minutes?: number;
  redeem_nextday_allowed?: boolean;
  redeem_carry_forward_days?: number;

  auto_convert_to_compoff?: boolean;
  min_extra_work_for_compoff_minutes?: number;
  compoff_requires_approval?: boolean;
};

// Simplified Employee model (UI only for now)
export type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id?: number | null;
  role_id?: number | null;
  designation?: string | null;
  site_ids?: number[];
  status?: 'active' | 'inactive' | 'invited' | 'Invited';
  onboarding_token?: string | null;
  onboarding_token_expires_at?: string | null;
  created_at?: string;
  work_type?: string;
  face_image_url?: string | null;
  updated_by_name?: string | null;
  shift_updated_by_name?: string | null;
  status_changed_by_name?: string | null;
  status_changed_at?: string | null;
};

const weeklyDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Normalize various date formats to HTML date input format (YYYY-MM-DD)
const normalizeDateForInput = (val: unknown): string => {
  if (!val) return "";
  try {
    if (typeof val === "string") {
      const s = val.trim();
      if (!s) return "";
      // Already in yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // ISO string with time
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      }
      // dd/mm/yyyy
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split("/");
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
      // dd-mm-yyyy
      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split("-");
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    if (typeof val === "number") {
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    if (val instanceof Date) {
      return Number.isNaN(val.getTime()) ? "" : val.toISOString().slice(0, 10);
    }
    return "";
  } catch {
    return "";
  }
};

import EmployeeLeaveHistory from "@/components/leaves/EmployeeLeaveHistory";

import { useAuth } from "@/context/AuthContext";
function useCountUp(target: number, duration = 800) {
  const [v, setV] = useState(0);
  const { role, permissions, user, organization } = useAuth();

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      setV(Math.floor(p * (Number.isFinite(target) ? target : 0)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return v;
}

export default function EmployeeManagement() {
  const { role, permissions } = useAuth();
  // Permissions
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";

  const hasPerm = (code: string | string[]) => {
    if (isOrgAdmin) return true;
    const check = (c: string) => (permissions || []).some((p) => (p || "").toUpperCase() === c.toUpperCase());
    if (Array.isArray(code)) return code.some(check);
    return check(code);
  };

  const isHRMode = hasPerm("HR_MODE");

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  // Modal State
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: 'info',
    onConfirm: () => { },
  });

  const closeConfirmation = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Leave History Modal State
  const [showLeaveHistory, setShowLeaveHistory] = useState(false);
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState<{ id: number, name: string } | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);

  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<'active' | 'terminated' | 'all'>('active');
  const [showView, setShowView] = useState<boolean>(false);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [viewData, setViewData] = useState<any>(null);

  // Form state
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [roleId, setRoleId] = useState<number | "">("");
  const [reportingManagerId, setReportingManagerId] = useState<number | "">("");
  const [managerSearchQuery, setManagerSearchQuery] = useState<string>("");
  const [showManagerDropdown, setShowManagerDropdown] = useState<boolean>(false);
  const [managersList, setManagersList] = useState<Employee[]>([]);
  const [managersLoading, setManagersLoading] = useState<boolean>(false);
  const [designation, setDesignation] = useState<string>("");
  const [workType, setWorkType] = useState<string>(""); // Full-time / Contract / Daily Wage / Intern
  const [startDate, setStartDate] = useState<string>("");
  const [assignedSiteIds, setAssignedSiteIds] = useState<Set<number>>(new Set());
  const [inchargeSiteIds, setInchargeSiteIds] = useState<Set<number>>(new Set());
  const [allowPunchFromHQ, setAllowPunchFromHQ] = useState<boolean>(false);

  // Primary site and budget
  const [primarySiteId, setPrimarySiteId] = useState<number | "">("");
  const [siteBudget, setSiteBudget] = useState<any>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [originalSalary, setOriginalSalary] = useState<number>(0);
  const [originalPrimarySiteId, setOriginalPrimarySiteId] = useState<number | null>(null);

  // Additional debits
  const [availableDebits, setAvailableDebits] = useState<any[]>([]);
  const [assignedDebitIds, setAssignedDebitIds] = useState<Set<number>>(new Set());
  const [showDebitWizard, setShowDebitWizard] = useState(false);

  const [salaryType, setSalaryType] = useState<string>(""); // Monthly / Daily / Hourly
  const [salaryAmount, setSalaryAmount] = useState<string>("");
  const [yearlyPackage, setYearlyPackage] = useState<string>("");
  const [salaryItems, setSalaryItems] = useState<{ component_id: number; component_name: string; component_type: "credit" | "debit"; amount: number }[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<{ id: number; component_name: string; component_type: "credit" | "debit" }[]>([]);
  const [bankAccountNo, setBankAccountNo] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [bankBranch, setBankBranch] = useState<string>("");
  const [panNumber, setPanNumber] = useState<string>("");
  const [aadhaarNumber, setAadhaarNumber] = useState<string>("");
  const [pfUan, setPfUan] = useState<string>("");
  const [employerPfAmount, setEmployerPfAmount] = useState<string>("");
  const [weeklyOff, setWeeklyOff] = useState<Set<string>>(new Set());
  const [shiftStart, setShiftStart] = useState<string>(""); // time
  const [shiftEnd, setShiftEnd] = useState<string>(""); // time
  const [isFlexibleTime, setIsFlexibleTime] = useState<boolean>(false);
  const [flexibleHours, setFlexibleHours] = useState<string>("");
  const [isFlexibleWeekOff, setIsFlexibleWeekOff] = useState<boolean>(false);
  const [flexibleWeekOffDays, setFlexibleWeekOffDays] = useState<string>("");
  const [policyId, setPolicyId] = useState<number | "">("");

  const selectedPolicy = React.useMemo(() => {
    const idNum = typeof policyId === "number" ? policyId : null;
    return policies.find((p) => (p.id || null) === idNum) || null;
  }, [policyId, policies]);
  const isEditing = editingEmployeeId != null;

  // UI State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterDeptId, setFilterDeptId] = useState<number | "">("");
  const [filterRoleId, setFilterRoleId] = useState<number | "">("");
  const [filterSiteId, setFilterSiteId] = useState<number | "">("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showTerminated, setShowTerminated] = useState<boolean>(false);
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [totalEntries, setTotalEntries] = useState<number>(0);


  const totalCount = useCountUp(totalEntries || 0);
  const deptCount = useCountUp(departments.length || 0);
  const roleCount = useCountUp(roles.length || 0);
  const siteCount = useCountUp(sites.length || 0);

  // Auto-select first site for non-HR/non-OrgAdmin users on first load
  useEffect(() => {
    if (sites.length > 0 && !isHRMode && !isOrgAdmin && filterSiteId === "") {
      const firstSiteId = sites[0]?.id;
      if (firstSiteId) {
        setFilterSiteId(firstSiteId);
      }
    }
  }, [sites, isHRMode, isOrgAdmin, filterSiteId]);

  const filtered = employees;

  const totalPages = Math.max(1, Math.ceil((totalEntries || filtered.length) / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageSlice = filtered;

  useEffect(() => {
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          // setRole((session.role || null) as string | null);
          // setPermissions(session.employee?.permissions || []);
        }
      } catch { }
    })();
  }, [role, permissions]);

  // Fetch salary components
  useEffect(() => {
    const fetchComponents = async () => {
      try {
        const data = await apiClient('/organization/salary-components?status=active');
        setSalaryComponents(data || []);
      } catch (error) {
        console.error('Failed to fetch salary components:', error);
      }
    };
    fetchComponents();
  }, []);

  // Fetch available debits
  useEffect(() => {
    const fetchDebits = async () => {
      try {
        const data = await apiClient('/organization/employees/additional-debits?status=active');
        setAvailableDebits(data || []);
      } catch (error) {
        console.error('Failed to fetch debits:', error);
      }
    };
    fetchDebits();
  }, []);

  // Fetch assigned debits
  useEffect(() => {
    const fetchDebits = async () => {
      if (!viewData?.id) return; // Don't fetch if no employee ID

      try {
        const data = await apiClient(`/organization/employees/${viewData.id}/debits`);
        setAssignedDebitIds(new Set(data.map((d: any) => d.id)) || new Set());
      } catch (error) {
        console.error('Failed to fetch assigned debits:', error);
      }
    };
    fetchDebits();
  }, [viewData?.id]);

  const deleteEmployee = async (id: number) => {
    if (!hasPerm("EMP_DELETE")) {
      setError("Not authorized to delete employees");
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: "Delete Employee",
      message: "Are you sure you want to delete this employee? This action cannot be undone.",
      type: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(String(id));
          await apiClient(`/organization/employees/${id}`, { method: "DELETE" });
          await fetchEmployees();

          // Show success notification
          showNotification('Employee deleted successfully', 'success');
        } catch (e: any) {
          setError(e?.message || "Failed to delete employee");
          showNotification(e?.message || "Failed to delete employee", 'error');
        } finally {
          setActionLoading(null);
          closeConfirmation();
        }
      }
    });
  };

  // Helper functions for modern notifications
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

  const showNotification = (message: string, type: 'success' | 'error') => {
    const container = document.getElementById('notification-container') || createNotificationContainer();
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
    container.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
      }, 500);
    }, 5000);
  };

  const toggleWeekly = (day: string) => {
    setWeeklyOff((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleSite = (id: number) => {
    setAssignedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // remove incharge if unassigned
        setInchargeSiteIds((prevIncharge) => {
          const ni = new Set(prevIncharge);
          ni.delete(id);
          return ni;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleInchargeSite = (id: number) => {
    if (!assignedSiteIds.has(id)) return;
    setInchargeSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Check site budget
  const checkSiteBudget = async (siteId: number) => {
    if (!siteId) {
      setSiteBudget(null);
      return;
    }

    setBudgetLoading(true);
    try {
      const budget = await apiClient(`/organization/employees/sites/${siteId}/budget`);
      setSiteBudget(budget);
    } catch (error: any) {
      console.error('Failed to fetch site budget:', error);
      setSiteBudget(null);
    } finally {
      setBudgetLoading(false);
    }
  };

  // Handle primary site change
  const handlePrimarySiteChange = async (siteId: number | "") => {
    setPrimarySiteId(siteId);
    if (siteId) {
      setAssignedSiteIds((prev) => {
        const next = new Set(prev);
        next.add(siteId);
        return next;
      });
      await checkSiteBudget(siteId);
    } else {
      setSiteBudget(null);
    }
  };

  // Validate salary against budget
  const validateSalaryAgainstBudget = (): boolean => {
    // If no primary site or no budget loaded, we can't validate yet (or budget is disabled)
    // Note: If budget is disabled for the site, siteBudget.has_budget should be false.
    if (!primarySiteId || !siteBudget || !siteBudget.has_budget) return true;

    const newSalary = Number(salaryAmount) || 0;
    let available = Number(siteBudget.budget_remaining) || 0;

    // If editing and the primary site hasn't changed, 
    // we should add back the *original* salary to the "available" pool,
    // because that amount is currently consumed by *this* employee.
    if (editingEmployeeId && Number(primarySiteId) === Number(originalPrimarySiteId)) {
      available += (Number(originalSalary) || 0);
    }

    if (newSalary > available) {
      const msg = `Salary amount (₹${newSalary.toLocaleString()}) exceeds available budget (₹${available.toLocaleString()})`;
      setError(msg);
      showNotification(msg, 'error');
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    return true;
  };

  const lookupIFSC = async () => {
    const code = ifscCode.trim().toUpperCase();
    const pattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!pattern.test(code)) {
      setBankName("");
      setBankBranch("");
      return;
    }
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (!res.ok) throw new Error("Invalid IFSC");
      const data = await res.json();
      setBankName((data as any).BANK || "");
      setBankBranch((data as any).BRANCH || "");
    } catch (_) {
      setBankName("");
      setBankBranch("");
    }
  };

  const resetForm = () => {
    setStep(1);
    setFirstName("");
    setLastName("");
    setGender("");
    setDob("");
    setPhone("");
    setEmail("");

    setDepartmentId("");
    setRoleId("");
    setReportingManagerId("");
    setManagerSearchQuery("");
    setManagersList([]);
    setDesignation("");
    setWorkType("");
    setStartDate("");
    setAssignedSiteIds(new Set());
    setInchargeSiteIds(new Set());
    setAllowPunchFromHQ(false);
    setPrimarySiteId("");
    setSiteBudget(null);
    setAssignedDebitIds(new Set());
    setSalaryType("");
    setSalaryAmount("");
    setYearlyPackage("");
    setSalaryItems([]);
    setBankAccountNo("");
    setIfscCode("");
    setBankName("");
    setBankBranch("");
    setPanNumber("");
    setAadhaarNumber("");
    setPfUan("");
    setEmployerPfAmount("");
    setWeeklyOff(new Set());
    setShiftStart("");
    setShiftEnd("");
    setIsFlexibleTime(false);
    setFlexibleHours("");
    setIsFlexibleWeekOff(false);
    setFlexibleWeekOffDays("");
    setPolicyId("");
  };

  const [importing, setImporting] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setActionLoading("template");
      const blob = await apiClient("/organization/employees/import/template", {
        method: "GET",
        responseType: "blob",
        withAuth: true
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employee_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showNotification("Template downloaded successfully", "success");
    } catch (e: any) {
      showNotification(e.message || "Failed to download template", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setActionLoading("import");
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient<{ success: boolean; imported: number; failed: number; errors: any[]; message?: string }>("/organization/employees/import", {
        method: "POST",
        body: formData,
        withAuth: true
      });

      if (res.imported > 0 || res.success) {
        showNotification(`Successfully imported ${res.imported} employees.`, "success");
        if (res.failed > 0) {
          setError(`Import completed with ${res.failed} failures. Check console for details.`);
          console.error('Import errors:', res.errors);
        }
        fetchEmployees();
      } else {
        showNotification(res.message || "Import failed", "error");
      }
    } catch (e: any) {
      showNotification(e.message || "Import failed", "error");
    } finally {
      setImporting(false);
      setActionLoading(null);
      e.target.value = '';
    }
  };

  const openEdit = async (id: number) => {
    if (!hasPerm("EMP_EDIT")) {
      setError("Not authorized to edit employees");
      return;
    }
    try {
      setError("");
      setValidationMessage("");
      const data = await apiClient(`/organization/employees/${id}`, { method: "GET" });
      resetForm();
      setEditingEmployeeId(id);
      setFirstName((data as any).first_name || "");
      setLastName((data as any).last_name || "");
      setGender((data as any).gender || "");
      setDob(normalizeDateForInput((data as any).date_of_birth));
      setPhone(((data as any).phone || "").replace(/\D/g, ""));
      setEmail((data as any).email || "");
      setDepartmentId((data as any).department_id || "");
      setRoleId((data as any).role_id || "");
      setReportingManagerId((data as any).reporting_manager_id || "");
      setDesignation((data as any).designation || "");
      setWorkType((data as any).work_type || "");
      setStartDate(normalizeDateForInput((data as any).employment_start_date));
      const sids = Array.isArray((data as any).site_ids) ? (data as any).site_ids : [];
      setAssignedSiteIds(new Set(sids));
      const siteArr = Array.isArray((data as any).sites) ? (data as any).sites : [];
      const inchargeIds = siteArr.length
        ? siteArr.filter((s: any) => !!s?.is_incharge).map((s: any) => Number(s.id)).filter((n: any) => Number.isFinite(n))
        : (((data as any).incharge ? sids : []) as number[]);
      setInchargeSiteIds(new Set(inchargeIds));

      // Set Primary Site
      const pSite = siteArr.find((s: any) => s.is_primary);
      const pSiteId = pSite ? pSite.id : "";
      setPrimarySiteId(pSiteId);
      setOriginalPrimarySiteId(pSite ? pSite.id : null);
      if (pSiteId) {
        checkSiteBudget(pSiteId);
      } else {
        setSiteBudget(null);
      }
      setAllowPunchFromHQ(!!(data as any).allow_punch_from_hq);
      setShiftStart((data as any).shift_start_time || "");
      setShiftEnd((data as any).shift_end_time || "");
      setIsFlexibleTime(!!((data as any).flexible_time || false));
      setFlexibleHours(((data as any).flexible_hours != null && !Number.isNaN(Number((data as any).flexible_hours))) ? String(Number((data as any).flexible_hours)) : "");
      setIsFlexibleWeekOff(!!((data as any).is_flexible_week_off || false));
      setFlexibleWeekOffDays(((data as any).flexible_week_off_days != null && !Number.isNaN(Number((data as any).flexible_week_off_days))) ? String(Number((data as any).flexible_week_off_days)) : "");
      setPolicyId((data as any).attendance_policy_id || "");
      setSalaryType((data as any).salary_type || "");
      const salAmt = (data as any).salary_amount != null ? Number((data as any).salary_amount) : 0;
      setSalaryAmount(salAmt ? String(salAmt) : "");
      setOriginalSalary(salAmt); // Track original salary
      setYearlyPackage((data as any).yearly_package != null ? String(Number((data as any).yearly_package)) : "");
      const sitems = Array.isArray((data as any).salary_breakdown)
        ? (data as any).salary_breakdown.map((i: any) => ({
          component_id: i.component_id,
          component_name: i.name,
          component_type: i.type,
          amount: Number(i.amount)
        }))
        : [];
      setSalaryItems(sitems);
      const debitIds = Array.isArray((data as any).assigned_debit_ids) ? (data as any).assigned_debit_ids : [];
      setAssignedDebitIds(new Set(debitIds));
      const bd = (data as any).bank_details || {};
      setBankAccountNo(bd.bank_account_no || "");
      setIfscCode(bd.ifsc_code || "");
      setBankName(bd.bank_name || "");
      setBankBranch(bd.branch_name || "");
      setPanNumber(bd.pan_number || "");
      setAadhaarNumber(bd.aadhaar_number || "");
      setPfUan(bd.pf_uan || "");
      setEmployerPfAmount(bd.employer_pf_amount != null ? String(Number(bd.employer_pf_amount)) : "");
      setWeeklyOff(new Set(Array.isArray((data as any).weekly_off_days) ? (data as any).weekly_off_days : []));
      setStep(1);
      setShowAdd(true);
    } catch (e: any) {
      setError(e?.message || "Failed to load employee details");
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("format", "paginated");
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      // Only HR Mode or OrgAdmin can filter by site
      if (typeof filterSiteId === "number") {
        params.set("site_id", String(filterSiteId));
      }

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (typeof filterDeptId === "number") params.set("department_id", String(filterDeptId));
      if (typeof filterRoleId === "number") params.set("role_id", String(filterRoleId));
      if (filterGender !== "all") params.set("gender", filterGender);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (showTerminated) params.set("include_terminated", "true");


      const data = await apiClient<{ data: Employee[]; total: number; page: number; limit: number; hasNext: boolean }>(`/organization/employees?${params.toString()}`, { method: "GET" });
      // API returns 'data' key for array, but we were looking for 'items'.
      // Also handle case where it might be 'items' for other endpoints if shared.
      const items = Array.isArray((data as any)?.data) ? (data as any).data : (Array.isArray((data as any)?.items) ? (data as any).items : []);
      setEmployees(items);
      // Track server pagination meta for UI controls
      const total = Number((data as any)?.total || 0);
      setTotalEntries(total);
    } catch (e: any) {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdowns on load is handled below

  // Initial load and reactive fetches
  // Combined into one useEffect below matching dependencies


  const fetchDropdowns = async () => {
    try {
      // Determine if we should fetch only assigned sites (not just incharge)
      const shouldFetchAssignedOnly = !isOrgAdmin && !isHRMode;

      const sitesUrl = shouldFetchAssignedOnly
        ? "/sites?assigned_only=1"
        : "/sites";

      const [deptData, roleData, sitesData, policyData] = await Promise.all([
        apiClient<Department[]>("/organization/departments", { method: "GET" }).catch(() => []),
        apiClient<Role[]>("/organization/roles", { method: "GET" }).catch(() => []),
        apiClient<{ sites: any[] }>(sitesUrl, { method: "GET" }).catch(() => ({ sites: [] })),
        apiClient<AttendancePolicy[]>("/attendance/policies", { method: "GET" }).catch(() => []),
      ]);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);
      const normalizedSites: Site[] = (sitesData.sites || []).map((s: any) => ({ id: s.id, name: s.name, code: s.code }));
      setSites(normalizedSites);
      setPolicies(Array.isArray(policyData) ? policyData : []);
    } catch (_) { }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterDeptId, filterRoleId, filterSiteId, filterGender, page, pageSize, statusFilter]);


  useEffect(() => {
    fetchDropdowns();
  }, []);

  // Re-fetch dropdowns when permissions change (for site filtering)
  useEffect(() => {
    if (role !== null && permissions.length >= 0) {
      fetchDropdowns();
    }
  }, [role, isOrgAdmin, isHRMode]);

  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
  const isPersonalValid = () => {
    return (
      Boolean(firstName.trim()) &&
      Boolean(lastName.trim()) &&
      isValidEmail(email) &&
      /^\d+$/.test(phone.trim())
    );
  };
  const isJobValid = () => {
    return Boolean(workType) && Boolean(startDate) && typeof departmentId === "number" && typeof roleId === "number" && Boolean(primarySiteId); // Primary site is mandatory
  };
  const isAttendanceValid = () => {
    if (typeof policyId !== "number") return false;
    if (isFlexibleTime) {
      const hrs = Number(flexibleHours);
      return Number.isFinite(hrs) && hrs > 0;
    }
    return Boolean(shiftStart) && Boolean(shiftEnd);
  };
  const isSalaryValid = () => {
    const amt = Number(salaryAmount) || 0;
    const total = salaryItems.reduce((t, i) => t + (Number(i.amount) || 0), 0);
    return salaryItems.length > 0 && total === amt;
  };

  const next = () => {
    if (step === 1 && !isPersonalValid()) { setValidationMessage("Please fill First Name, Last Name, and provide a valid Email and numeric Phone."); return; }
    if (step === 2 && !isJobValid()) { setValidationMessage("Please select Department, Role, Work Type, Employment Start Date, and Primary Site."); return; }
    if (step === 3 && !isAttendanceValid()) { setValidationMessage("Select Weekly Off Day(s), Shift Start/End, and a Policy."); return; }
    if (step === 4) {
      if (!isSalaryValid()) {
        setValidationMessage("Enter Salary Type and Amount (ensure total breakdown equals amount).");
        return;
      }
      if (!validateSalaryAgainstBudget()) {
        return;
      }
    }
    setValidationMessage("");
    setStep((s) => Math.min(5, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const openView = async (id: number) => {
    if (!hasPerm("EMP_VIEW")) { setError("Not authorized to view employees"); return; }
    try {
      setError("");
      setViewLoading(true);
      setShowView(true);
      setViewData(null);
      const data = await apiClient(`/organization/employees/${id}`, { method: "GET" });
      setViewData(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load employee details");
    } finally {
      setViewLoading(false);
    }
  };

  const saveEmployee = async () => {
    if (!hasPerm("EMP_ADD")) {
      setError("Not authorized to add employees");
      return;
    }

    // Validate salary against budget
    if (!validateSalaryAgainstBudget()) {
      setSaving(false);
      return;
    }

    if (!validateSalaryAgainstBudget()) return;
    setSaving(true);
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender: gender || null,
      date_of_birth: dob || null,
      phone: phone || null,
      email: email.trim(),

      department_id: typeof departmentId === "number" ? departmentId : null,
      role_id: typeof roleId === "number" ? roleId : null,
      reporting_manager_id: typeof reportingManagerId === "number" ? reportingManagerId : null,
      designation: designation || null,
      work_type: workType || null,
      employment_start_date: startDate || null,
      site_ids: Array.from(assignedSiteIds),
      primary_site_id: primarySiteId || null,
      assigned_debit_ids: Array.from(assignedDebitIds),
      site_incharge_ids: Array.from(inchargeSiteIds),
      site_assignments: Array.from(assignedSiteIds).map((id) => ({ site_id: id, is_incharge: inchargeSiteIds.has(id), is_primary: id === Number(primarySiteId) })),
      incharge: inchargeSiteIds.size > 0,
      allow_punch_from_hq: allowPunchFromHQ,
      salary_type: salaryType || null,
      salary_amount: salaryAmount ? Number(salaryAmount) : null,
      yearly_package: yearlyPackage ? Number(yearlyPackage) : null,
      salary_breakdown: salaryItems.length ? salaryItems.map((si) => ({
        component_id: si.component_id,
        name: si.component_name,
        type: si.component_type,
        amount: Number(si.amount)
      })) : [],
      bank_account_no: bankAccountNo || null,
      ifsc_code: ifscCode || null,
      bank_name: bankName || null,
      bank_branch: bankBranch || null,
      pan_number: panNumber || null,
      aadhaar_number: aadhaarNumber || null,
      pf_uan: pfUan || null,
      employer_pf_amount: employerPfAmount ? Number(employerPfAmount) : null,
      weekly_off_days: Array.from(weeklyOff),
      flexible_time: isFlexibleTime,
      flexible_hours: isFlexibleTime ? (flexibleHours ? Number(flexibleHours) : null) : null,
      shift_start_time: isFlexibleTime ? null : (shiftStart || null),
      shift_end_time: isFlexibleTime ? null : (shiftEnd || null),
      attendance_policy_id: typeof policyId === "number" ? policyId : null,
      is_flexible_week_off: isFlexibleWeekOff,
      flexible_week_off_days: isFlexibleWeekOff ? (flexibleWeekOffDays ? Number(flexibleWeekOffDays) : 0) : 0,
    };

    try {
      await apiClient("/organization/employees", { method: "POST", body: payload });
      setShowAdd(false);
      resetForm();
      await fetchEmployees();
      showNotification('Employee created successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to save employee (endpoint may be unavailable)");
      showNotification(e?.message || "Failed to save employee", 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateEmployee = async () => {
    if (!editingEmployeeId) return;
    if (!hasPerm("EMP_EDIT")) {
      setError("Not authorized to edit employees");
      return;
    }
    if (!validateSalaryAgainstBudget()) return;
    setSaving(true);
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender: gender || null,
      date_of_birth: dob || null,
      phone: phone || null,
      email: email.trim(),

      department_id: typeof departmentId === "number" ? departmentId : null,
      role_id: typeof roleId === "number" ? roleId : null,
      reporting_manager_id: typeof reportingManagerId === "number" ? reportingManagerId : null,
      designation: designation || null,
      work_type: workType || null,
      employment_start_date: startDate || null,
      site_ids: Array.from(assignedSiteIds),
      assigned_debit_ids: Array.from(assignedDebitIds),
      site_incharge_ids: Array.from(inchargeSiteIds),
      site_assignments: Array.from(assignedSiteIds).map((id) => ({ site_id: id, is_incharge: inchargeSiteIds.has(id), is_primary: id === Number(primarySiteId) })),
      incharge: inchargeSiteIds.size > 0,
      allow_punch_from_hq: allowPunchFromHQ,
      salary_type: salaryType || null,
      salary_amount: salaryAmount ? Number(salaryAmount) : null,
      yearly_package: yearlyPackage ? Number(yearlyPackage) : null,
      salary_breakdown: salaryItems.length ? salaryItems.map((si) => ({
        component_id: si.component_id,
        name: si.component_name,
        type: si.component_type,
        amount: Number(si.amount)
      })) : [],
      bank_account_no: bankAccountNo || null,
      ifsc_code: ifscCode || null,
      bank_name: bankName || null,
      bank_branch: bankBranch || null,
      pan_number: panNumber || null,
      aadhaar_number: aadhaarNumber || null,
      pf_uan: pfUan || null,
      employer_pf_amount: employerPfAmount ? Number(employerPfAmount) : null,
      weekly_off_days: Array.from(weeklyOff),
      flexible_time: isFlexibleTime,
      flexible_hours: isFlexibleTime ? (flexibleHours ? Number(flexibleHours) : null) : null,
      shift_start_time: isFlexibleTime ? null : (shiftStart || null),
      shift_end_time: isFlexibleTime ? null : (shiftEnd || null),
      attendance_policy_id: typeof policyId === "number" ? policyId : null,
      is_flexible_week_off: isFlexibleWeekOff,
      flexible_week_off_days: isFlexibleWeekOff ? (flexibleWeekOffDays ? Number(flexibleWeekOffDays) : 0) : 0,
    };

    try {
      await apiClient(`/organization/employees/${editingEmployeeId}`, { method: "PUT", body: payload });
      setShowAdd(false);
      resetForm();
      setEditingEmployeeId(null);
      await fetchEmployees();
      showNotification('Employee updated successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to update employee");
      showNotification(e?.message || "Failed to update employee", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (id: number) => {
    try {
      setActionLoading(String(id));
      await apiClient(`/organization/employees/${id}/resend-invitation`, { method: "POST" });
      showNotification("Invitation resent successfully", "success");
      await fetchEmployees();
    } catch (e: any) {
      showNotification(e.message || "Failed to resend invitation", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateAccess = async (id: number) => {
    try {
      setActionLoading(String(id));
      const res = await apiClient<{ success: boolean; message: string }>(`/organization/employees/${id}/regenerate-access`, { method: "POST" });
      showNotification(res.message || "Access regenerated successfully", "success");
      await fetchEmployees();
    } catch (e: any) {
      showNotification(e.message || "Failed to regenerate access", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkInvite = async () => {
    try {
      // Get all invited employees
      const invitedEmployees = employees.filter(emp => emp.status?.toLowerCase() === 'invited');

      if (invitedEmployees.length === 0) {
        showNotification("No invited employees found", "error");
        return;
      }

      setConfirmationModal({
        isOpen: true,
        title: "Bulk Send Invitations",
        message: `Are you sure you want to send invitations to ${invitedEmployees.length} employee(s)?`,
        type: 'info',
        onConfirm: async () => {
          try {
            setActionLoading("bulk-invite");
            const employee_ids = invitedEmployees.map(emp => emp.id);

            const response = await apiClient<{ success: boolean; message: string; results: any }>(
              '/organization/employees/bulk-resend-invitations',
              {
                method: "POST",
                body: { employee_ids }
              }
            );

            showNotification(response.message || "Bulk invitations sent successfully", "success");
            await fetchEmployees();
          } catch (e: any) {
            showNotification(e.message || "Failed to send bulk invitations", "error");
          } finally {
            setActionLoading(null);
            closeConfirmation();
          }
        }
      });

    } catch (e: any) {
      showNotification(e.message || "Failed to send bulk invitations", "error");
    }
  };


  const handleToggleStatus = async (id: number, currentStatus: string) => {
    // If invited, we might be activating them manually or deactivating?
    // "make inactive active" -> toggle Active <-> Inactive.
    // Normalized status:
    const s = (currentStatus || "").toLowerCase();
    const newStatus = s === "active" ? "Inactive" : "Active";

    setConfirmationModal({
      isOpen: true,
      title: `${newStatus === 'Inactive' ? 'Deactivate' : 'Activate'} Employee`,
      message: `Are you sure you want to mark this employee as ${newStatus}?`,
      type: newStatus === 'Inactive' ? 'warning' : 'info',
      onConfirm: async () => {
        try {
          setActionLoading(String(id));
          await apiClient(`/organization/employees/${id}/toggle-status`, { method: "POST", body: { status: newStatus } });
          showNotification(`Employee marked as ${newStatus}`, "success");
          await fetchEmployees();
        } catch (e: any) {
          showNotification(e.message || "Failed to update status", "error");
        } finally {
          setActionLoading(null);
          closeConfirmation();
        }
      }
    });
  };

  const getStatusColor = (employee: Employee) => {
    const status = (employee.status || 'active').toLowerCase();

    if (status === 'invited') {
      const isExpired = employee.onboarding_token_expires_at && new Date(employee.onboarding_token_expires_at) < new Date();
      if (isExpired) return 'text-orange-800 bg-orange-50 border border-orange-200';
      return 'text-blue-700 bg-blue-50 border border-blue-200';
    }

    switch (status) {
      case 'active': return 'text-green-700 bg-green-50 border border-green-200';
      case 'inactive': return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'terminated': return 'text-red-700 bg-red-50 border border-red-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusIcon = (employee: Employee) => {
    const status = (employee.status || 'active').toLowerCase();

    if (status === 'invited') {
      const isExpired = employee.onboarding_token_expires_at && new Date(employee.onboarding_token_expires_at) < new Date();
      if (isExpired) return <AlertCircle className="w-3 h-3 text-orange-600" />;
      return <Mail className="w-3 h-3 text-blue-500" />;
    }

    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'inactive': return <AlertCircle className="w-3 h-3 text-amber-500" />;
      case 'terminated': return <XCircle className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  const getWorkTypeColor = (workType: string = '') => {
    switch (workType) {
      case 'Full-time': return 'text-blue-700 bg-blue-50 border border-blue-200';
      case 'Contract': return 'text-orange-700 bg-orange-50 border border-orange-200';
      case 'Daily Wage': return 'text-purple-700 bg-purple-50 border border-purple-200';
      case 'Intern': return 'text-green-700 bg-green-50 border border-green-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  // Action Dropdown Component with improved positioning
  const ActionDropdown = ({ employee }: { employee: Employee }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [placeUp, setPlaceUp] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Check permissions
    const canView = isOrgAdmin || hasPerm("EMP_VIEW");
    const canEdit = isOrgAdmin || hasPerm("EMP_EDIT");
    const canDelete = isOrgAdmin || hasPerm("EMP_DELETE");

    // If no permissions at all, don't show the dropdown
    if (!canView && !canEdit && !canDelete) {
      return null;
    }

    useEffect(() => {
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

    useEffect(() => {
      if (isOpen) {
        const rect = triggerRef.current?.getBoundingClientRect();
        const spaceBelow = typeof window !== 'undefined' ? (window.innerHeight - (rect?.bottom || 0)) : 0;
        const approxMenuHeight = 200;
        setPlaceUp(spaceBelow < approxMenuHeight + 16);
      }
    }, [isOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen((o) => !o)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          disabled={actionLoading === String(employee.id)}
        >
          {actionLoading === String(employee.id) ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <MoreVertical className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <div className={`fixed ${placeUp ? 'bottom-auto' : 'top-auto'} w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[101]`}
              style={{
                left: triggerRef.current ? `${triggerRef.current.getBoundingClientRect().right - 192}px` : '0',
                top: placeUp ? 'auto' : triggerRef.current ? `${triggerRef.current.getBoundingClientRect().bottom + 4}px` : '0',
                bottom: placeUp && triggerRef.current ? `${window.innerHeight - triggerRef.current.getBoundingClientRect().top + 4}px` : 'auto'
              }}
            >
              <div className="py-1">
                {canView && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedHistoryEmployee({ id: employee.id, name: `${employee.first_name} ${employee.last_name}` });
                        setShowLeaveHistory(true);
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Employee Leaves</span>
                    </button>
                    <button
                      onClick={() => {
                        openView(employee.id);
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </>
                )}

                {canEdit && (
                  <button
                    onClick={() => {
                      openEdit(employee.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => {
                      deleteEmployee(employee.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}

                {canEdit && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    {/* Resend Invitation Logic */}
                    {(employee.status?.toLowerCase() === 'invited') && (
                      <button
                        onClick={() => {
                          handleResendInvite(employee.id);
                          setIsOpen(false);
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Resend Invite</span>
                      </button>
                    )}

                    {isOrgAdmin && (
                      <button
                        onClick={() => {
                          handleRegenerateAccess(employee.id);
                          setIsOpen(false);
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Regenerate Access</span>
                      </button>
                    )}

                    {/* Toggle Active/Inactive / Reactivate Terminated */}
                    {employee.status?.toLowerCase() !== 'invited' && (
                      <button
                        onClick={() => {
                          handleToggleStatus(employee.id, employee.status || 'Active');
                          setIsOpen(false);
                        }}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-sm hover:bg-gray-50 ${(employee.status || '').toLowerCase() === 'active' ? 'text-amber-700' : 'text-green-700'
                          }`}
                      >
                        {(employee.status || '').toLowerCase() === 'active' ? (
                          <>
                            <X className="w-4 h-4" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // View Employee Modal
  const ViewEmployeeModal = () => {
    if (!showView || !viewData) return null;

    return (
      <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Employee Details</h3>
              <button
                onClick={() => setShowView(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {viewLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {viewData.face_image_url && (
                      <div className="mb-6 flex justify-center md:justify-start">
                        <div className="relative group">
                          <img
                            src={viewData.face_image_url}
                            alt="Face Registry"
                            className="w-32 h-32 rounded-xl object-cover border-2 border-white shadow-lg ring-1 ring-gray-100"
                          />
                          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10"></div>
                        </div>
                      </div>
                    )}
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Personal Information</h4>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {`${viewData?.first_name || ""} ${viewData?.last_name || ""}`.trim() || "-"}
                          </p>
                          <p className="text-sm text-gray-500">Full Name</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{viewData?.email || "-"}</p>
                          <p className="text-sm text-gray-500">Email</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{viewData?.phone || "-"}</p>
                          <p className="text-sm text-gray-500">Phone</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 pt-2 border-t border-gray-50">
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{viewData?.updated_by_name || "System"}</p>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Last Updated By</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Employment Details</h4>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center space-x-3">
                        <Building className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {departments.find(d => d.id === viewData?.department_id)?.name || "-"}
                          </p>
                          <p className="text-sm text-gray-500">Department</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {roles.find(r => r.id === viewData?.role_id)?.name || "-"}
                          </p>
                          <p className="text-sm text-gray-500">Role</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {viewData?.employment_start_date ? new Date(viewData.employment_start_date).toLocaleDateString() : "-"}
                          </p>
                          <p className="text-sm text-gray-500">Start Date</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {Array.isArray(viewData?.site_ids) && viewData.site_ids.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Assigned Sites</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewData.site_ids.map((siteId: number) => {
                        const site = sites.find(s => s.id === siteId);
                        return site ? (
                          <span key={site.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <MapPin className="w-3 h-3 mr-1" />
                            {site.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {viewData?.designation && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Designation</h4>
                    <p className="mt-1 text-sm text-gray-900">{viewData.designation}</p>
                  </div>
                )}

                {viewData?.work_type && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Work Type</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWorkTypeColor(viewData.work_type)} mt-1`}>
                      {viewData.work_type}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowView(false);
                openEdit(viewData.id);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Employee
            </button>
            <button
              onClick={() => setShowView(false)}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading && employees.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage and monitor all employees</p>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <div className="h-9 bg-gray-200 rounded flex-1 animate-pulse"></div>
            <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden">
          <div className="bg-gray-50">
            <div className="grid grid-cols-5 gap-4 px-4 py-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  const canViewEmployees = isOrgAdmin || hasPerm("EMP_VIEW") || hasPerm("EMP_ADD") || hasPerm("EMP_EDIT") || hasPerm("EMP_DELETE");
  if (!canViewEmployees) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage and monitor all employees</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view employees.</p>
        </div>
      </div>
    );
  }

  // Confirmation Modal
  const ConfirmationModal = () => {
    if (!confirmationModal.isOpen) return null;

    const icon = confirmationModal.type === 'danger'
      ? <AlertCircle className="w-6 h-6 text-red-600" />
      : confirmationModal.type === 'warning'
        ? <AlertCircle className="w-6 h-6 text-amber-600" />
        : <AlertCircle className="w-6 h-6 text-blue-600" />; // Default/Info

    const btnClass = confirmationModal.type === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : confirmationModal.type === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm p-4 md:p-6">
        <div className="relative w-full max-w-md transform rounded-2xl bg-white p-6 text-left shadow-xl transition-all border border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${confirmationModal.type === 'danger' ? 'bg-red-100' : confirmationModal.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {confirmationModal.title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {confirmationModal.message}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
              onClick={closeConfirmation}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnClass}`}
              onClick={confirmationModal.onConfirm}
            >
              {confirmationModal.type === 'danger' ? 'Delete' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const confirmExport = async () => {
    try {
      setActionLoading("export");
      const blob = await apiClient<Blob>("/organization/employees/export", {
        method: "POST",
        body: { status: exportStatus },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Employees_${exportStatus}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification("Employees exported successfully", "success");
      setShowExportModal(false);
    } catch (e: any) {
      showNotification(e.message || "Failed to export employees", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const ExportModal = () => {
    if (!showExportModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm p-4 md:p-6">
        <div className="relative w-full max-w-sm transform rounded-2xl bg-white p-6 text-left shadow-xl transition-all border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Export Employees</h3>
            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-500 mb-2">Select which employees to export:</p>

            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="exportStatus"
                value="active"
                checked={exportStatus === 'active'}
                onChange={() => setExportStatus('active')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">Active Only</span>
                <span className="block text-xs text-gray-500">Includes Active and Invited employees</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="exportStatus"
                value="terminated"
                checked={exportStatus === 'terminated'}
                onChange={() => setExportStatus('terminated')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">Terminated Only</span>
                <span className="block text-xs text-gray-500">Only terminated employees</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="exportStatus"
                value="all"
                checked={exportStatus === 'all'}
                onChange={() => setExportStatus('all')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">All Employees</span>
                <span className="block text-xs text-gray-500">Active, Invited, and Terminated</span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-lg border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              onClick={confirmExport}
              disabled={actionLoading === "export"}
            >
              {actionLoading === "export" ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Download
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Render modals */}
      <ConfirmationModal />
      <ExportModal />
      <ViewEmployeeModal />

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employee Management</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {(isOrgAdmin || hasPerm("EMP_ADD")) && (
              <>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={actionLoading === "template"}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
                >
                  {actionLoading === "template" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">Template</span>
                </button>
                <button
                  onClick={() => document.getElementById('import-file-input')?.click()}
                  disabled={actionLoading === "import"}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
                >
                  {actionLoading === "import" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="hidden sm:inline">Import</span>
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  disabled={actionLoading === "export"}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
                >
                  {actionLoading === "export" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => window.location.href = isOrgAdmin ? '/org-admin/employees/shifts' : '/employee/employees/shifts'}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1 text-sm"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Shifts</span>
                </button>

                {/* Bulk Invite Button - Show only if there are invited employees */}
                {employees.filter(emp => emp.status?.toLowerCase() === 'invited').length > 0 && (
                  <button
                    onClick={handleBulkInvite}
                    disabled={actionLoading === "bulk-invite"}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === "bulk-invite" ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      Bulk Invite ({employees.filter(emp => emp.status?.toLowerCase() === 'invited').length})
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    resetForm();
                    setEditingEmployeeId(null);
                    setShowAdd(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Employee</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-10 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <select
                value={filterDeptId}
                onChange={(e) => { const v = e.target.value; setFilterDeptId(v ? Number(v) : ""); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={filterRoleId}
                onChange={(e) => { const v = e.target.value; setFilterRoleId(v ? Number(v) : ""); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Roles</option>
                {roles
                  .filter((r) => (typeof filterDeptId === "number" ? r.department_id === filterDeptId : true))
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="invited">Invited</option>
              </select>

              <select
                value={filterGender}
                onChange={(e) => { setFilterGender(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <div className="flex items-center space-x-2 px-1">
                <input
                  id="showTerminated"
                  type="checkbox"
                  checked={showTerminated}
                  onChange={(e) => { setShowTerminated(e.target.checked); setPage(1); }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="showTerminated" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Show Terminated
                </label>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
              <select
                value={filterSiteId}
                onChange={(e) => { const v = e.target.value; setFilterSiteId(v ? Number(v) : ""); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {isHRMode || isOrgAdmin ? <option value="">All Sites</option> : null}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchEmployees()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setFilterDeptId("");
                    setFilterRoleId("");
                    setFilterSiteId("");
                    setSearchQuery("");
                    setStatusFilter("all");
                    setShowTerminated(false);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Total Employees</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{totalCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Departments</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{deptCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Roles</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{roleCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Briefcase className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Sites</p>
              <p className="text-2xl font-bold text-rose-900 mt-1">{siteCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <MapPin className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modified By
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pageSlice.map((employee) => {
                const deptName = departments.find((d) => d.id === employee.department_id)?.name || "-";
                const roleName = roles.find((r) => r.id === employee.role_id)?.name || "-";

                return (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {employee.face_image_url ? (
                          <img
                            src={employee.face_image_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0 bg-gray-50"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold border border-gray-200 flex-shrink-0">
                            {(employee.first_name?.[0] || "").toUpperCase()}{(employee.last_name?.[0] || "").toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{employee.email}</div>
                          {employee.phone && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">{employee.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{deptName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {roleName}
                      {employee.designation && (
                        <div className="text-sm text-gray-500">{employee.designation}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          {getStatusIcon(employee)}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(employee)} capitalize`}>
                            {(() => {
                              const st = (employee.status || "active");
                              if (st.toLowerCase() === 'invited') {
                                const isExpired = employee.onboarding_token_expires_at && new Date(employee.onboarding_token_expires_at) < new Date();
                                return isExpired ? "Invited (Expired)" : "Invited";
                              }
                              return st;
                            })()}
                          </span>
                        </div>
                        {employee.status_changed_by_name && (
                          <div className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">
                            by {employee.status_changed_by_name}
                            {employee.status_changed_at && ` on ${new Date(employee.status_changed_at).toLocaleDateString('en-IN')}`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 min-w-[120px]">
                        <User size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate">{employee.updated_by_name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ActionDropdown employee={employee} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


        {filtered.length === 0 && !loading && (
          <div className="text-center py-8">
            <User className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No employees found</h3>
            <p className="text-xs text-gray-500 mb-3">No employees match your current filters.</p>
            {(isOrgAdmin || hasPerm("EMP_ADD")) && (
              <button
                onClick={() => { resetForm(); setEditingEmployeeId(null); setShowAdd(true); }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm mx-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Add First Employee</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{pageStart + 1}</span> to <span className="font-medium">{Math.min(pageStart + pageSize, totalEntries || filtered.length)}</span> of <span className="font-medium">{totalEntries || filtered.length}</span> employees
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setPage(1)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) pages.push(<span key="ellipsis1" className="px-1 text-gray-500">...</span>);
                  }
                  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                    pages.push(
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pages.push(<span key="ellipsis2" className="px-1 text-gray-500">...</span>);
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setPage(totalPages)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === totalPages
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Modal (existing code, kept as is) */}
      {showAdd && (
        <div className="fixed inset-0 bg-opacity-20 backdrop-blur-sm z-40 flex items-start justify-center p-4">
          <div className="bg-white rounded shadow max-w-3xl w-full my-6 max-h-[80vh] overflow-y-auto">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">{isEditing ? "Edit Employee" : "Add Employee"}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-600 hover:text-gray-800 text-sm">Close</button>
            </div>

            <div className="px-4 py-4 my-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 rounded bg-gray-100">Step {step} / 5</span>
                  <div className="text-gray-600">Fill all required details</div>
                </div>
                {validationMessage && (
                  <div className="mt-2 text-sm text-red-600">{validationMessage}</div>
                )}
              </div>

              {/* steps UI unchanged - keeping your existing form structure */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">First Name *</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Last Name *</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full border rounded px-2 py-2">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date of Birth</label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Phone Number *</label>
                    <input
                      inputMode="numeric"
                      pattern="^\\d*$"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full border rounded px-2 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Department *</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Role *</label>
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Select Role</option>
                      {roles
                        .filter((r) => (typeof departmentId === "number" ? r.department_id === departmentId : true))
                        .map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Designation</label>
                    <input value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div className="relative">
                    <label className="block text-xs text-gray-600 mb-1">Reporting Manager (optional)</label>
                    <div className="relative">
                      <div
                        onClick={() => setShowManagerDropdown(!showManagerDropdown)}
                        className="w-full border rounded px-2 py-2 cursor-pointer bg-white flex items-center justify-between hover:border-gray-400 transition-colors"
                      >
                        <span className={reportingManagerId ? "text-gray-900" : "text-gray-400"}>
                          {reportingManagerId
                            ? (() => {
                              const manager = [...employees, ...managersList].find((e) => e.id === reportingManagerId);
                              if (!manager) return "None";
                              const deptName = departments.find((d) => d.id === manager.department_id)?.name || null;
                              const roleName = roles.find((r) => r.id === manager.role_id)?.name || null;
                              const name = `${manager.first_name} ${manager.last_name}`.trim();
                              return [name, deptName, roleName, manager.designation || null].filter(Boolean).join(" | ");
                            })()
                            : "Select Manager"}
                        </span>
                        <div className="flex items-center gap-1">
                          {reportingManagerId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReportingManagerId("");
                                setManagerSearchQuery("");
                                setManagersList([]);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <X className="w-3 h-3 text-gray-500" />
                            </button>
                          )}
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showManagerDropdown ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                      {showManagerDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => {
                              setShowManagerDropdown(false);
                              setManagerSearchQuery("");
                              setManagersList([]);
                            }}
                          />
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                            <div className="p-2 border-b border-gray-200">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search by name (min 2 chars)..."
                                  value={managerSearchQuery}
                                  onChange={async (e) => {
                                    const query = e.target.value;
                                    setManagerSearchQuery(query);

                                    // Only search when 2+ characters typed
                                    if (query.trim().length >= 2) {
                                      setManagersLoading(true);
                                      try {
                                        const data = await apiClient<{ data: Employee[] }>(
                                          `/organization/employees?format=paginated&search=${encodeURIComponent(query.trim())}&limit=10`,
                                          { method: 'GET', withAuth: true }
                                        );
                                        const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                                        setManagersList(items);
                                      } catch (e) {
                                        console.error('Failed to search managers:', e);
                                        setManagersList([]);
                                      } finally {
                                        setManagersLoading(false);
                                      }
                                    } else {
                                      // Clear results when less than 2 characters
                                      setManagersList([]);
                                    }
                                  }}
                                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto max-h-48">
                              {managersLoading ? (
                                <div className="px-3 py-6 text-center text-sm text-gray-500">
                                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                                  Searching...
                                </div>
                              ) : managerSearchQuery.trim().length < 2 ? (
                                <div className="px-3 py-6 text-center text-sm text-gray-500">
                                  Type at least 2 characters to search
                                </div>
                              ) : managersList.length === 0 ? (
                                <div className="px-3 py-6 text-center text-sm text-gray-500">
                                  No managers found
                                </div>
                              ) : (
                                managersList.map((emp) => {
                                  const deptName = departments.find((d) => d.id === emp.department_id)?.name || null;
                                  const roleName = roles.find((r) => r.id === emp.role_id)?.name || null;
                                  const name = `${emp.first_name} ${emp.last_name}`.trim();
                                  const isSelected = reportingManagerId === emp.id;

                                  return (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      onClick={() => {
                                        setReportingManagerId(emp.id);
                                        setShowManagerDropdown(false);
                                        setManagerSearchQuery("");
                                        setManagersList([]);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0 ${isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700"
                                        }`}
                                    >
                                      <div className="font-medium">{name}</div>
                                      {(deptName || roleName || emp.designation) && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {[deptName, roleName, emp.designation].filter(Boolean).join(" | ")}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Work Type *</label>
                    <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="w-full border rounded px-2 py-2">
                      <option value="">Select</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Daily Wage">Daily Wage</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Employment Start Date *</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-2">
                      Primary Site <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={primarySiteId}
                      onChange={(e) => handlePrimarySiteChange(Number(e.target.value) || "")}
                      className="w-full border rounded px-2 py-2"
                      required
                    >
                      <option value="">Select Primary Site</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>

                    {budgetLoading && (
                      <p className="text-xs text-gray-500 mt-1">Loading budget...</p>
                    )}

                    {siteBudget && siteBudget.has_budget && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Budget:</span>
                            <span className="font-medium">₹{siteBudget.budget_amount?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Used:</span>
                            <span className="font-medium">₹{siteBudget.budget_used?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Remaining:</span>
                            <span className="font-medium text-green-600">₹{siteBudget.budget_remaining?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={allowPunchFromHQ} onChange={(e) => setAllowPunchFromHQ(e.target.checked)} />
                      <span>Allow Punch from HQ</span>
                    </label>
                  </div>
                </div>
              )}

              {step === 3 && (
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Weekly Off Day(s) *</label>
                      <div className="flex flex-wrap gap-2">
                        {weeklyDays.map((d) => (
                          <button
                            key={d}
                            type="button"
                            disabled={isFlexibleWeekOff}
                            onClick={() => toggleWeekly(d)}
                            className={`px-3 py-1 rounded border ${weeklyOff.has(d) ? "bg-blue-600 text-white" : "bg-white"} ${isFlexibleWeekOff ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">Flexible Week Off?</label>
                      <div className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isFlexibleWeekOff}
                          onChange={(e) => {
                            setIsFlexibleWeekOff(e.target.checked);
                            if (e.target.checked) {
                              setWeeklyOff(new Set());
                            }
                          }}
                        />
                        <span>Enable flexible week off instead of fixed weekdays</span>
                      </div>
                    </div>
                    {isFlexibleWeekOff && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Number of Days *</label>
                        <input
                          type="number"
                          min={0}
                          max={31}
                          placeholder="e.g., 5"
                          value={flexibleWeekOffDays}
                          onChange={(e) => setFlexibleWeekOffDays(e.target.value)}
                          className="w-full border rounded px-2 py-2 text-sm"
                        />
                        <div className="text-xs text-gray-500 mt-1">Specify maximum week off days allowed per cycle.</div>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-2">Flexible Time?</label>
                      <div className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={isFlexibleTime} onChange={(e) => setIsFlexibleTime(e.target.checked)} />
                        <span>Enable flexible work hours instead of fixed shift</span>
                      </div>
                    </div>
                    {isFlexibleTime ? (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Flexible Work Hours *</label>
                        <input
                          type="number"
                          min={1}
                          placeholder="e.g., 8"
                          value={flexibleHours}
                          onChange={(e) => setFlexibleHours(e.target.value)}
                          className="w-full border rounded px-2 py-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">Specify required work hours per day.</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Shift Timing Start *</label>
                          <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="w-full border rounded px-2 py-2" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Shift Timing End *</label>
                          <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="w-full border rounded px-2 py-2" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Leave & Attendance Policy *</label>
                      <select value={policyId} onChange={(e) => setPolicyId(e.target.value ? Number(e.target.value) : "")} className="w-full border rounded px-2 py-2">
                        <option value="">Select Policy</option>
                        {policies.map((p) => (
                          <option key={p.id} value={p.id}>{p.policy_name}</option>
                        ))}
                      </select>
                      {selectedPolicy && (
                        <div className="mt-2 text-xs text-gray-700 space-y-1">
                          <div>
                            <strong>Leaves Cycle:</strong> {selectedPolicy.leave_cycle || '—'}
                          </div>

                          {selectedPolicy.leave_cycle === 'monthly' ? (
                            <>
                              <div>
                                <strong>Leave per Month:</strong> {selectedPolicy.max_leave_per_month || 0}
                              </div>
                              <div>
                                <strong>Grace Period for Late Mark (minutes):</strong>{' '}
                                {selectedPolicy.grace_period_minutes || 0}
                              </div>
                              <div>
                                <strong>Late Logout Redeem Minutes:</strong>{' '}
                                {selectedPolicy.late_logout_redeem_minutes || 0}
                              </div>
                            </>
                          ) : selectedPolicy.leave_cycle === 'yearly' ? (
                            <>
                              <div>
                                <strong>Total Annual Leaves:</strong> {selectedPolicy.total_annual_leaves || 0}
                              </div>
                              <div>
                                <strong>Max Leave per Month:</strong> {selectedPolicy.max_leave_per_month || 0}
                              </div>
                              <div>
                                <strong>Grace Period for Late Mark (minutes):</strong>{' '}
                                {selectedPolicy.grace_period_minutes || 0}
                              </div>
                              <div>
                                <strong>Late Logout Redeem Minutes:</strong>{' '}
                                {selectedPolicy.late_logout_redeem_minutes || 0}
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-500 italic">No leave cycle defined.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {step === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Salary Type *</label>
                    <select value={salaryType} onChange={(e) => setSalaryType(e.target.value)} className="w-full border rounded px-2 py-2">
                      <option value="">Select</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Daily">Daily</option>
                      <option value="Hourly">Hourly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Yearly Package</label>
                    <input
                      type="number"
                      value={yearlyPackage}
                      onChange={(e) => {
                        const v = e.target.value;
                        setYearlyPackage(v);
                        if (salaryType === "Monthly") {
                          const y = Number(v);
                          setSalaryAmount(y > 0 ? String(Math.round(y / 12)) : "");
                        }
                      }}
                      className="w-full border rounded px-2 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Salary Amount *</label>
                    <input type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Salary Breakdown *</label>
                    <div className="space-y-2">
                      {salaryItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2">
                          <select
                            value={item.component_id || ''}
                            onChange={(e) => {
                              const componentId = Number(e.target.value);
                              const component = salaryComponents.find(c => c.id === componentId);
                              if (component) {
                                setSalaryItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    component_id: componentId,
                                    component_name: component.component_name,
                                    component_type: component.component_type
                                  };
                                  return next;
                                });
                              }
                            }}
                            className="col-span-6 border rounded px-2 py-2"
                          >
                            <option value="">Select component</option>
                            {salaryComponents.map((comp) => (
                              <option key={comp.id} value={comp.id}>
                                {comp.component_name} ({comp.component_type})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={item.amount || ''}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setSalaryItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], amount: v };
                                return next;
                              });
                            }}
                            className="col-span-4 border rounded px-2 py-2"
                          />
                          <button
                            type="button"
                            onClick={() => setSalaryItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="col-span-2 bg-red-500 text-white rounded px-2 py-2"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSalaryItems((prev) => [...prev, { component_id: 0, component_name: '', component_type: 'credit', amount: 0 }])}
                        className="w-full bg-gray-200 rounded px-2 py-2"
                      >
                        + Add Item
                      </button>
                      <div className="text-xs text-gray-600">
                        Total: {salaryItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-2">Additional Debits</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                      {availableDebits.length === 0 ? (
                        <p className="text-xs text-gray-500">No additional debits available</p>
                      ) : (
                        availableDebits.map((debit) => (
                          <label key={debit.id} className="flex items-start gap-2 text-sm hover:bg-gray-50 p-2 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={assignedDebitIds.has(debit.id)}
                              onChange={(e) => {
                                const newSet = new Set(assignedDebitIds);
                                if (e.target.checked) {
                                  newSet.add(debit.id);
                                } else {
                                  newSet.delete(debit.id);
                                }
                                setAssignedDebitIds(newSet);
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{debit.debit_name}</div>
                              {debit.description && (
                                <div className="text-xs text-gray-500">{debit.description}</div>
                              )}
                              <div className="text-xs text-gray-600 mt-1">
                                {debit.debit_type === 'fixed'
                                  ? `₹${debit.fixed_amount}`
                                  : `${debit.percentage_value}% of ${debit.reference_amount?.replace('_', ' ')}`}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        Select debits to apply to this employee's salary
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDebitWizard(true)}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Create New Debit
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bank Account No.</label>
                    <input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">IFSC Code</label>
                    <input value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} onBlur={lookupIFSC} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bank Name</label>
                    <input value={bankName} disabled readOnly className="w-full border rounded px-2 py-2 bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Branch</label>
                    <input value={bankBranch} disabled readOnly className="w-full border rounded px-2 py-2 bg-gray-100 cursor-not-allowed" />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">PAN Number</label>
                    <input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Aadhaar Number</label>
                    <input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">PF UAN</label>
                    <input value={pfUan} onChange={(e) => setPfUan(e.target.value)} className="w-full border rounded px-2 py-2" />
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <button onClick={back} className="px-3 py-2 text-sm rounded border">Back</button>
                {step < 5 ? (
                  <button onClick={next} className="px-3 py-2 text-sm bg-black text-white rounded hover:bg-gray-900">Continue</button>
                ) : (
                  <button
                    onClick={isEditing ? updateEmployee : saveEmployee}
                    disabled={saving || (isEditing ? !hasPerm("EMP_EDIT") : !hasPerm("EMP_ADD"))}
                    className="px-3 py-2 text-sm bg-black text-white rounded disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-900 flex items-center space-x-2"
                  >
                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{saving ? "Saving..." : (isEditing ? "Save Changes" : "Save Employee")}</span>
                  </button>
                )}
              </div>
            </div>
          </div >
        </div >
      )
      }

      {/* Employee Leave History Modal */}
      {
        showLeaveHistory && selectedHistoryEmployee && (
          <EmployeeLeaveHistory
            employeeId={selectedHistoryEmployee.id}
            employeeName={selectedHistoryEmployee.name}
            onClose={() => {
              setShowLeaveHistory(false);
              setSelectedHistoryEmployee(null);
            }}
          />
        )
      }

      {/* Additional Debits Wizard */}
      {showDebitWizard && (
        <AdditionalDebitsWizard
          onClose={() => setShowDebitWizard(false)}
          salaryItems={salaryItems.map(s => ({ id: s.component_id, name: s.component_name, type: s.component_type, amount: Number(s.amount) }))}
          onSuccess={async () => {
            // Refresh debits list
            try {
              const data = await apiClient('/organization/employees/additional-debits?status=active');
              setAvailableDebits(data || []);
            } catch (error) {
              console.error('Failed to refresh debits:', error);
            }
          }}
        />
      )}

      {/* Hidden File Input for Import */}
      <input
        type="file"
        id="import-file-input"
        className="hidden"
        accept=".xlsx,.xls"
        onChange={handleImport}
      />
    </div >
  );
}
