"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";

import { useAuth } from "@/context/AuthContext";
type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export default function TaskCreate({ mode = "create", initialTask, initialAssignees, initialApprovalChain, onSaved, onCancel, readOnly, defaultSiteId, initialDataCollection }: { mode?: "create" | "edit" | "view"; initialTask?: any; initialAssignees?: number[]; initialApprovalChain?: Array<{ level: number; approver_user_id?: number; is_mandatory?: boolean; approver_name?: string }>; onSaved?: () => void; onCancel?: () => void; readOnly?: boolean; defaultSiteId?: number; initialDataCollection?: boolean }) {
  const [templates, setTemplates] = useState<Array<{ id: number; name: string }>>([]);
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; user_id?: number }>>([]);

  // Assignee Search & Display States
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("");
  const [assigneeSearchResults, setAssigneeSearchResults] = useState<Array<{ id: number; name: string; designation?: string }>>([]);
  const [assigneeSearchLoading, setAssigneeSearchLoading] = useState(false);
  const [selectedAssigneeDetails, setSelectedAssigneeDetails] = useState<Array<{ id: number; name: string; designation?: string }>>([]);

  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  // Assignment selection states - now support multiple
  const [targetRoleIds, setTargetRoleIds] = useState<number[]>([]);
  const [targetDeptIds, setTargetDeptIds] = useState<number[]>([]);
  const [targetSiteIds, setTargetSiteIds] = useState<number[]>([]);
  const [sharedCompletionMode, setSharedCompletionMode] = useState<"individual" | "first_responder">("individual");
  const [allowCrossUserView, setAllowCrossUserView] = useState<boolean>(false);
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [customDateInput, setCustomDateInput] = useState<string>("");

  // Approval chain employees (searchable)
  const [approverSearchList, setApproverSearchList] = useState<Array<{ id: number; name: string; user_id?: number; designation?: string; site_name?: string }>>([]);
  const [approverSearchLoading, setApproverSearchLoading] = useState<boolean>(false);
  const [approverSearchTerm, setApproverSearchTerm] = useState<string>("");

  const [templateId, setTemplateId] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [assignmentType, setAssignmentType] = useState<string>("single");
  const [recurrence, setRecurrence] = useState<string>("daily");
  const [monthlyDaysInput, setMonthlyDaysInput] = useState<string>("");
  const [weeklyDays, setWeeklyDays] = useState<Weekday[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("Asia/Kolkata");
  const [requiresApproval, setRequiresApproval] = useState<boolean>(false);
  const [skipWeekOff, setSkipWeekOff] = useState<boolean>(false);
  const [skipHoliday, setSkipHoliday] = useState<boolean>(false);
  const [skipLeave, setSkipLeave] = useState<boolean>(false);
  const [assignNextWorkingDay, setAssignNextWorkingDay] = useState<boolean>(false);
  const [isDataCollection, setIsDataCollection] = useState<boolean>(false);

  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [approvalChain, setApprovalChain] = useState<Array<{ level: number; approver_user_id?: number; is_mandatory?: boolean; approver_name?: string }>>([]);
  const [newApprovalLevel, setNewApprovalLevel] = useState<string>("1");
  const [newApprovalMandatory, setNewApprovalMandatory] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const weekdaysList: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthlyDays = useMemo(() => {
    return monthlyDaysInput
      .split(/[ ,]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
  }, [monthlyDaysInput]);

  const assignees = useMemo(() => selectedAssignees.map((user_id) => ({ user_id })), [selectedAssignees]);

  const toggleWeekday = (wd: Weekday) => {
    setWeeklyDays((prev) => (prev.includes(wd) ? prev.filter((d) => d !== wd) : [...prev, wd]));
  };

  // Removed legacy addApprovalLevel


  // Load templates and sites on mount
  const { role, user, organization, employee } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const t = await apiClient<Array<{ id: number; name: string }>>("/templates", { method: "GET", withAuth: true });
        setTemplates(Array.isArray(t) ? t : []);
      } catch { }

      try {
        // Check if Org Admin
        const isOrgAdmin = (role || "").toLowerCase() === "orgadmin" || ((user as any)?.roles || []).map((r: any) => String(r).toLowerCase()).includes("orgadmin");

        if (isOrgAdmin) {
          const s = await apiClient<{ sites: any[] }>("/sites", { method: "GET", withAuth: true });
          const normalized = (s?.sites || []).map((x: any) => ({ id: Number(x.id), name: String(x.name || x.code || x.id) }));
          setSites(normalized);
        } else {
          // Fetch assigned sites from API directly
          const s = await apiClient<{ sites: any[] }>("/sites?assigned_only=true", { method: "GET", withAuth: true });
          const normalized = (s?.sites || []).map((x: any) => ({ id: Number(x.id), name: String(x.name || x.code || x.id) }));
          setSites(normalized);
        }
      } catch (e) {
        // Fallback or error handling
      }
    })();
  }, [role, user, employee]);


  // Clear assignees when site changes
  useEffect(() => {
    // Only clear if we are engaging in a new creation flow or explicit change (not initial load)
    if (mode === 'create' && siteId) {
      // setSelectedAssignees([]);
      // setSelectedAssigneeDetails([]);
      // Actually, let's just keep it simple: if site changes, prev selection is likely invalid.
      // But for "Edit" mode, we don't want to clear immediately on mount.
    }
  }, [siteId, mode]);

  // Load details for initial assignees
  useEffect(() => {
    (async () => {
      if (initialAssignees?.length) {
        try {
          // Fetch details for these IDs
          const data = await apiClient<{ items: Array<any> }>("/organization/employees", {
            method: "GET",
            params: { format: "paginated", ids: initialAssignees.join(','), limit: "100" },
            withAuth: true
          });
          const items = (Array.isArray(data?.items) ? data.items : []) as any[];
          const normalized = items.map((e: any) => ({
            id: Number(e.id),
            name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || (e.email || `Employee ${e.id}`),
            designation: e.designation
          }));
          setSelectedAssigneeDetails(normalized);
          setSelectedAssignees(normalized.map(n => n.id));
        } catch { }
      }
    })();
  }, [initialAssignees]);

  const handleAssigneeSearch = async (term: string) => {
    setAssigneeSearchTerm(term);
    if (!term || term.length < 2) {
      setAssigneeSearchResults([]);
      return;
    }
    setAssigneeSearchLoading(true);
    try {
      const params: any = { format: "paginated", search: term, limit: "15" };
      if (siteId) params.site_id = siteId; // Filter by site if selected

      const data = await apiClient<{ items: any[] }>("/organization/employees", {
        method: "GET",
        params,
        withAuth: true
      });
      // Check both data (new) and items (old/standard) keys
      const raw = (data as any).data || (data as any).items || [];
      const items = Array.isArray(raw) ? raw : [];

      setAssigneeSearchResults(items.map((e: any) => ({
        id: Number(e.id),
        name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || (e.email || `Employee ${e.id}`),
        designation: e.designation
      })));
    } catch {
      setAssigneeSearchResults([]);
    } finally {
      setAssigneeSearchLoading(false);
    }
  };

  const selectAssignee = (user: { id: number; name: string; designation?: string }) => {
    if (assignmentType === 'single') {
      setSelectedAssignees([user.id]);
      setSelectedAssigneeDetails([user]);
      setAssigneeSearchTerm("");
      setAssigneeSearchResults([]);
    } else {
      // Multiple
      if (!selectedAssignees.includes(user.id)) {
        setSelectedAssignees(prev => [...prev, user.id]);
        setSelectedAssigneeDetails(prev => [...prev, user]);
      }
      setAssigneeSearchTerm("");
      setAssigneeSearchResults([]);
    }
  };

  const removeAssignee = (id: number) => {
    setSelectedAssignees(prev => prev.filter(x => x !== id));
    setSelectedAssigneeDetails(prev => prev.filter(x => x.id !== id));
  };


  // Fetch Roles and Departments
  useEffect(() => {
    (async () => {
      try {
        const r = await apiClient<Array<{ id: number; name: string }>>("/organization/roles", { method: "GET", withAuth: true });
        setRoles(Array.isArray(r) ? r : []);
      } catch { }

      try {
        const d = await apiClient<Array<{ id: number; name: string }>>("/organization/departments", { method: "GET", withAuth: true });
        setDepartments(Array.isArray(d) ? d : []);
      } catch { }
    })();
  }, []);

  // Search Approvers
  const handleApproverSearch = async (term: string) => {
    setApproverSearchTerm(term);
    if (!term || term.length < 2) {
      setApproverSearchList([]);
      return;
    }

    setApproverSearchLoading(true);
    try {
      // Use hq=true to search globally if allowed, otherwise it respects permissions
      const data = await apiClient<{ data: Array<any> }>("/organization/employees", {
        method: "GET",
        params: { format: "paginated", search: term, limit: "15", hq: "true", purpose: "approver_search" },
        withAuth: true,
      });

      const items = (Array.isArray(data?.data) ? data.data : (Array.isArray(data as any) ? data : [])) as any[];
      const normalized = items.map((e: any) => ({
        id: Number(e.id),
        user_id: Number(e.id),
        name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || (e.email || `Employee ${e.id}`),
        designation: e.designation || null,
        site_name: e.site_ids?.length ? "Assigned" : "HQ" // Simplified, real site name might need more fetching or just show designation
      }));
      setApproverSearchList(normalized);
    } catch {
      setApproverSearchList([]);
    } finally {
      setApproverSearchLoading(false);
    }
  };

  const addApprover = (user: { id: number; name: string; user_id?: number }) => {
    const lvl = Number(newApprovalLevel);
    if (!Number.isFinite(lvl)) return;

    // Check if already added at this level? (Optional check)
    setApprovalChain((prev) => [
      ...prev,
      {
        level: lvl,
        approver_user_id: user.user_id || user.id,
        is_mandatory: newApprovalMandatory,
        approver_name: user.name
      }
    ]);
    setNewApprovalLevel("" + (lvl + 1));
    setApproverSearchTerm("");
    setApproverSearchList([]);
  };

  // Removed legacy fetchApprovers effect

  // Prefill in edit/view mode
  useEffect(() => {
    if (initialTask) {
      setTemplateId(initialTask.template_id ? String(initialTask.template_id) : "");
      setSiteId(initialTask.site_id ? String(initialTask.site_id) : "");
      setTitle(initialTask.title || "");
      setDescription(initialTask.description || "");
      setAssignmentType(initialTask.assignment_type || "single");
      setSharedCompletionMode(initialTask.shared_completion_mode || "individual");
      setAllowCrossUserView(!!initialTask.allow_cross_user_view);

      // Parse JSON arrays for multiple assignments
      const parseIds = (val: any) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(Number);
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed.map(Number) : [];
        } catch {
          return [Number(val)].filter(n => !isNaN(n));
        }
      };
      setTargetRoleIds(parseIds(initialTask.target_role_id));
      setTargetDeptIds(parseIds(initialTask.target_department_id));
      setTargetSiteIds(parseIds(initialTask.target_site_id));
      // Custom dates are strings (dd-mm format)
      const parseDates = (val: any) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String);
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          return [];
        }
      };
      setCustomDates(parseDates(initialTask.recurrence_custom_dates));

      setRecurrence(initialTask.recurrence || "daily");
      const rr = initialTask.recurrence_rule ? (typeof initialTask.recurrence_rule === 'string' ? (() => { try { return JSON.parse(initialTask.recurrence_rule); } catch { return {}; } })() : initialTask.recurrence_rule) : null;
      if (recurrence === "weekly" && rr?.weekdays) setWeeklyDays(rr.weekdays as Weekday[]);
      if (recurrence === "monthly" && rr?.monthDays) setMonthlyDaysInput((rr.monthDays as number[])?.join(", ") || "");
      setStartDate(initialTask.start_date || "");
      setDueTime(initialTask.due_time || "");
      setTimezone(initialTask.timezone || timezone);
      setRequiresApproval(!!initialTask.requires_approval);
      const skips = initialTask.skip_rules ? (typeof initialTask.skip_rules === 'string' ? (() => { try { return JSON.parse(initialTask.skip_rules); } catch { return {}; } })() : initialTask.skip_rules) : {};
      setSkipWeekOff(!!skips.skip_on_week_off);
      setSkipHoliday(!!skips.skip_on_holiday);
      setSkipLeave(!!skips.skip_on_leave);
      if (Array.isArray(initialAssignees)) setSelectedAssignees(initialAssignees.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
      if (Array.isArray(initialApprovalChain)) setApprovalChain(
        initialApprovalChain.map((a) => ({
          level: Number(a.level),
          approver_user_id: a.approver_user_id,
          is_mandatory: a.is_mandatory !== false,
          approver_name: a.approver_name || undefined, // Now we get names from backend
        }))
      );
      setIsDataCollection(!!initialTask.is_data_collection);
    }
    // Set data collection mode if initialDataCollection is provided
    if (initialDataCollection && !initialTask) {
      setIsDataCollection(true);
    }
    // Preselect site based on defaultSiteId when creating
    if (!initialTask && defaultSiteId && !siteId) {
      setSiteId(String(defaultSiteId));
    }
  }, [initialTask, recurrence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    console.log('Form validation:', { templateId, assignmentType, recurrence, mode });
    if (!templateId || !assignmentType || !recurrence) {
      const errorMsg = "Template, assignment type, and recurrence are required.";
      console.error('Validation failed:', errorMsg, { templateId, assignmentType, recurrence });
      setMessage(errorMsg);
      return;
    }
    if (!isDataCollection && recurrence === "weekly" && weeklyDays.length === 0) {
      setMessage("Please select at least one weekday for weekly recurrence.");
      return;
    }
    if (!isDataCollection && recurrence === "monthly" && monthlyDays.length === 0) {
      setMessage("Please enter at least one day number (1–31).");
      return;
    }



    // If type is single/multiple/shared, we need assignees
    if (['single', 'multiple', 'shared'].includes(assignmentType) && selectedAssignees.length === 0) {
      setMessage("Please select at least one assignee.");
      return;
    }
    // If type is role/department/site, we need selection
    if (assignmentType === 'role' && targetRoleIds.length === 0) {
      const errorMsg = "Please select at least one target role.";
      console.error('Validation failed:', errorMsg, { assignmentType, targetRoleIds });
      setMessage(errorMsg);
      return;
    }
    if (assignmentType === 'department' && targetDeptIds.length === 0) {
      const errorMsg = "Please select at least one target department.";
      console.error('Validation failed:', errorMsg, { assignmentType, targetDeptIds });
      setMessage(errorMsg);
      return;
    }
    if (assignmentType === 'site' && targetSiteIds.length === 0) {
      const errorMsg = "Please select at least one target site.";
      console.error('Validation failed:', errorMsg, { assignmentType, targetSiteIds });
      setMessage(errorMsg);
      return;
    }
    if (recurrence === 'custom' && customDates.length === 0) {
      setMessage("Please add at least one custom date (dd-mm format).");
      return;
    }

    const recurrence_rule =
      recurrence === "weekly"
        ? JSON.stringify({ weekdays: weeklyDays })
        : recurrence === "monthly"
          ? JSON.stringify({ monthDays: monthlyDays })
          : null;

    const recurrence_custom_dates = recurrence === 'custom' && customDates.length > 0
      ? customDates
      : undefined;

    // For Role/Dept/Site, we don't send explicit assignees (Backend expands them). 
    // We only send assignees for Single/Multiple/Shared.
    const assigneesToSend = ['single', 'multiple', 'shared'].includes(assignmentType) ? assignees : [];

    // Legacy support removal: we don't use siteAssigneesArr anymore since "Additional Sites" is removed.
    // If we wanted to support multi-site assignments via 'site' type, the backend handles it via criteria.

    const body = {
      template_id: Number(templateId),
      site_id: siteId ? Number(siteId) : null,
      title: title,
      description: description,
      assignment_type: assignmentType,
      target_role_id: assignmentType === 'role' ? targetRoleIds : undefined,
      target_department_id: assignmentType === 'department' ? targetDeptIds : undefined,
      target_site_id: assignmentType === 'site' ? targetSiteIds : undefined,
      shared_completion_mode: (!isDataCollection && ['multiple', 'role', 'department', 'site'].includes(assignmentType)) ? sharedCompletionMode : 'individual',
      recurrence,
      recurrence_rule,
      recurrence_custom_dates,
      start_date: recurrence === "daily" ? null : startDate || null,
      end_date: null,
      due_time: dueTime || null,
      timezone: timezone || "Asia/Kolkata",
      skip_rules: {
        skip_on_week_off: skipWeekOff,
        skip_on_holiday: skipHoliday,
        skip_on_leave: skipLeave,
      },
      assign_next_working_day: assignNextWorkingDay,
      requires_approval: requiresApproval,
      allow_cross_user_view: allowCrossUserView,
      assignees: assigneesToSend,
      approval_chain: requiresApproval ? approvalChain : [],
      status: "active",
      is_data_collection: isDataCollection,
    };

    try {
      setSubmitting(true);
      if (mode === "create") {
        const data = await apiClient<{ id: number; message?: string }>("/tasks", { method: "POST", body, withAuth: true });
        if (data && data.id) {
          setMessage(`Task created. ID: ${data.id}`);
        } else {
          setMessage(data?.message || "Task created");
        }
      } else if (mode === "edit" && initialTask?.id) {
        await apiClient(`/tasks/${initialTask.id}`, { method: "PUT", body, withAuth: true });
        setMessage("Task updated");
      }
      onSaved?.();
    } catch (err: any) {
      setMessage(err?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Generate Task</h1>
      </div>
      {message && <div className="mb-3 text-sm text-red-600">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Data Collection Mode */}
        <div className="flex items-center gap-2 mb-4 bg-blue-50 p-3 rounded border border-blue-100">
          <input
            id="isDataCollection"
            type="checkbox"
            checked={isDataCollection}
            onChange={(e) => {
              setIsDataCollection(e.target.checked);
              if (e.target.checked) {
                setRecurrence("daily");
                setStartDate("");
                setDueTime("");
              }
            }}
            disabled={!!readOnly}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <label htmlFor="isDataCollection" className="block text-sm font-medium text-blue-900">
              Data Collection Mode (Always Available)
            </label>
            <p className="text-xs text-blue-700">
              Tasks are not scheduled but are always available for assignees to fill multiple times.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={!!readOnly}
            >
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name ?? `Template ${t.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Site</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              disabled={!!readOnly}
            >
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name ?? `Site ${s.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!!readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!!readOnly}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assignment Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={assignmentType}
              onChange={(e) => {
                setAssignmentType(e.target.value);
                setSelectedAssignees([]);
              }}
              disabled={!!readOnly}
            >
              <option value="single">Single User</option>
              <option value="multiple">Multiple Users</option>
              <option value="role">Role Wise</option>
              <option value="department">Department Wise</option>
              <option value="site">Site Wise</option>
            </select>
            {assignmentType === 'site' && (
              <p className="text-xs text-gray-500 mt-1">Assigns to all employees in the selected site.</p>
            )}
          </div>

          {/* Shared Mode Toggle - Show for any group assignment if not data collection */}
          {!isDataCollection && ['multiple', 'role', 'department', 'site'].includes(assignmentType) && (
            <div className="flex flex-col justify-center">
              <label className="block text-sm font-medium mb-1">Completion Mode</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="completionMode"
                    value="individual"
                    checked={sharedCompletionMode === 'individual'}
                    onChange={() => setSharedCompletionMode('individual')}
                    disabled={!!readOnly}
                  />
                  <span className="text-sm">Individual (Everyone must do it)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="completionMode"
                    value="first_responder"
                    checked={sharedCompletionMode === 'first_responder'}
                    onChange={() => setSharedCompletionMode('first_responder')}
                    disabled={!!readOnly}
                  />
                  <span className="text-sm">Shared (First one wins)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Assignment Input */}
        <div className="mb-4">
          {assignmentType === 'role' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Roles (Multiple)</label>

              {/* Selected roles as chips */}
              {targetRoleIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {targetRoleIds.map(id => {
                    const role = roles.find(r => r.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm border border-blue-100">
                        <span>{role?.name || `Role ${id}`}</span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setTargetRoleIds(prev => prev.filter(x => x !== id))}
                            className="hover:text-blue-900 font-bold ml-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dropdown to add more */}
              {!readOnly && (
                <select
                  className="w-full border rounded px-3 py-2"
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id && !targetRoleIds.includes(id)) {
                      setTargetRoleIds(prev => [...prev, id]);
                    }
                  }}
                >
                  <option value="">Add Role...</option>
                  {roles.filter(r => !targetRoleIds.includes(r.id)).map(r =>
                    <option key={r.id} value={r.id}>{r.name}</option>
                  )}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">Select multiple roles. Employees matching ANY role will be assigned.</p>
            </div>
          )}

          {assignmentType === 'department' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Departments (Multiple)</label>

              {/* Selected departments as chips */}
              {targetDeptIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {targetDeptIds.map(id => {
                    const dept = departments.find(d => d.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm border border-green-100">
                        <span>{dept?.name || `Dept ${id}`}</span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setTargetDeptIds(prev => prev.filter(x => x !== id))}
                            className="hover:text-green-900 font-bold ml-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dropdown to add more */}
              {!readOnly && (
                <select
                  className="w-full border rounded px-3 py-2"
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id && !targetDeptIds.includes(id)) {
                      setTargetDeptIds(prev => [...prev, id]);
                    }
                  }}
                >
                  <option value="">Add Department...</option>
                  {departments.filter(d => !targetDeptIds.includes(d.id)).map(d =>
                    <option key={d.id} value={d.id}>{d.name}</option>
                  )}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">Select multiple departments. Employees matching ANY department will be assigned.</p>
            </div>
          )}

          {assignmentType === 'site' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Sites (Multiple)</label>

              {/* Selected sites as chips */}
              {targetSiteIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {targetSiteIds.map(id => {
                    const site = sites.find(s => s.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm border border-purple-100">
                        <span>{site?.name || `Site ${id}`}</span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setTargetSiteIds(prev => prev.filter(x => x !== id))}
                            className="hover:text-purple-900 font-bold ml-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dropdown to add more */}
              {!readOnly && (
                <select
                  className="w-full border rounded px-3 py-2"
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id && !targetSiteIds.includes(id)) {
                      setTargetSiteIds(prev => [...prev, id]);
                    }
                  }}
                >
                  <option value="">Add Site...</option>
                  {sites.filter(s => !targetSiteIds.includes(s.id)).map(s =>
                    <option key={s.id} value={s.id}>{s.name}</option>
                  )}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">Select multiple sites. All employees in these sites will be assigned.</p>
            </div>
          )}

          {/* Assignee Search Interface for Single/Multiple */}
          {['single', 'multiple'].includes(assignmentType) && (
            <div className="space-y-3">
              <label className="block text-sm font-medium mb-1">Assignees</label>

              {/* Selected Assignees List */}
              {selectedAssigneeDetails.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedAssigneeDetails.map(u => (
                    <div key={u.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm border border-blue-100">
                      <span>{u.name}</span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => removeAssignee(u.id)}
                          className="hover:text-blue-900 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Search Input (Hide if Single & Selected) */}
              {(!readOnly && (assignmentType === 'multiple' || selectedAssignees.length === 0)) && (
                <div className="relative">
                  <input
                    className="w-full border rounded px-3 py-2"
                    placeholder={assignmentType === 'single' ? "Search for an employee..." : "Search to add employees..."}
                    value={assigneeSearchTerm}
                    onChange={(e) => handleAssigneeSearch(e.target.value)}
                  />
                  {assigneeSearchLoading && (
                    <div className="absolute right-3 top-2.5 text-xs text-gray-500">Loading...</div>
                  )}

                  {/* Search Results Dropdown */}
                  {assigneeSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {assigneeSearchResults.map(u => (
                        <div
                          key={u.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                          onClick={() => selectAssignee(u)}
                        >
                          <div className="text-sm">
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.designation}</div>
                          </div>
                          {selectedAssignees.includes(u.id) && <span className="text-xs text-gray-400">Selected</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1">
                {assignmentType === 'single' ? 'Search and select one employee.' : 'Search and add multiple employees.'} Employees filters by selected Site.
              </p>
            </div>
          )}
        </div>

        {/* Recurrence Wrapper */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {!isDataCollection && (
            <div>
              <label className="block text-sm font-medium mb-1">Recurrence</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                disabled={!!readOnly}
              >
                <option value="one_time">One Time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (Every 3 Months)</option>
                <option value="yearly">Yearly (Every 12 Months)</option>
                <option value="custom">Custom Dates (Yearly)</option>
              </select>
            </div>
          )}

          {!isDataCollection && (
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata"
                disabled={!!readOnly}
              />
            </div>
          )}
        </div>

        {!isDataCollection && recurrence === "monthly" && (
          <div>
            <label className="block text-sm font-medium mb-1">Month day(s) (1–31)</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={monthlyDaysInput}
              onChange={(e) => setMonthlyDaysInput(e.target.value)}
              placeholder="e.g., 1, 11, 21"
              disabled={!!readOnly}
            />
            <p className="text-xs text-gray-500 mt-1">Valid: {monthlyDays.join(", ") || "None"}</p>
          </div>
        )}

        {!isDataCollection && recurrence === "weekly" && (
          <div>
            <label className="block text-sm font-medium mb-2">Select weekday(s)</label>
            <div className="flex flex-wrap gap-2">
              {weekdaysList.map((wd) => (
                <button
                  disabled={!!readOnly}
                  key={wd}
                  type="button"
                  className={`px-3 py-1 rounded border ${weeklyDays.includes(wd) ? "bg-blue-600 text-white" : "bg-white"
                    }`}
                  onClick={() => toggleWeekday(wd)}
                >
                  {wd}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Dates Picker */}
        {!isDataCollection && recurrence === 'custom' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Custom Dates (dd-mm format)</label>

            {/* Selected dates as chips */}
            {customDates.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {customDates.map(date => (
                  <div key={date} className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-sm border border-orange-100">
                    <span>{date}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setCustomDates(prev => prev.filter(d => d !== date))}
                        className="hover:text-orange-900 font-bold ml-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input to add new date */}
            {!readOnly && (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="dd-mm (e.g., 15-03 for March 15)"
                  value={customDateInput}
                  onChange={(e) => setCustomDateInput(e.target.value)}
                  pattern="\d{2}-\d{2}"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  onClick={() => {
                    const match = customDateInput.match(/^(\d{2})-(\d{2})$/);
                    if (match) {
                      const day = parseInt(match[1]);
                      const month = parseInt(match[2]);
                      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                        if (!customDates.includes(customDateInput)) {
                          setCustomDates(prev => [...prev, customDateInput]);
                          setCustomDateInput('');
                        }
                      } else {
                        alert('Invalid date. Day must be 1-31, month must be 1-12.');
                      }
                    } else {
                      alert('Invalid format. Use dd-mm (e.g., 15-03)');
                    }
                  }}
                >
                  Add Date
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Task will recur <strong>yearly</strong> on these dates. Example: "15-03" = March 15th every year.
            </p>
          </div>
        )}

        {!isDataCollection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurrence !== "daily" && (
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!!readOnly}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Due Time</label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!!readOnly}
              />
            </div>
          </div>
        )
        }

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input
              id="requiresApproval"
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              disabled={!!readOnly}
            />
            <label htmlFor="requiresApproval" className="text-sm">
              Requires Approval
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="allowCrossUserView"
              type="checkbox"
              checked={allowCrossUserView}
              onChange={(e) => setAllowCrossUserView(e.target.checked)}
              disabled={!!readOnly}
            />
            <label htmlFor="allowCrossUserView" className="text-sm">
              Allow assigned users to see each other's submissions
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="skipWeekOff"
              type="checkbox"
              checked={skipWeekOff}
              onChange={(e) => setSkipWeekOff(e.target.checked)}
              disabled={!!readOnly}
            />
            <label htmlFor="skipWeekOff" className="text-sm">
              Skip on Week Off
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="skipHoliday"
              type="checkbox"
              checked={skipHoliday}
              onChange={(e) => setSkipHoliday(e.target.checked)}
              disabled={!!readOnly}
            />
            <label htmlFor="skipHoliday" className="text-sm">
              Skip on Holiday
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="skipLeave"
              type="checkbox"
              checked={skipLeave}
              onChange={(e) => setSkipLeave(e.target.checked)}
              disabled={!!readOnly}
            />
            <label htmlFor="skipLeave" className="text-sm">
              Skip on Leave
            </label>
          </div>
          {!isDataCollection && recurrence === "one_time" && (
            <div className="flex items-center gap-2">
              <input
                id="assignNextWorkingDay"
                type="checkbox"
                checked={assignNextWorkingDay}
                onChange={(e) => setAssignNextWorkingDay(e.target.checked)}
                disabled={!!readOnly}
              />
              <label htmlFor="assignNextWorkingDay" className="text-sm">
                Assign on Next Working Day
              </label>
            </div>
          )}
        </div>


        {/* Old Assignees Section Removed - replaced by Dynamic Assignment Input above */}

        {/* Additional Sites Removal */}

        {
          requiresApproval && (
            <div className="border rounded p-3 space-y-2 bg-gray-50">
              <div className="font-medium">Approval Chain</div>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs">Next Level:</label>
                  <input
                    className="w-16 border rounded px-2 py-1 text-sm text-center"
                    value={newApprovalLevel}
                    onChange={(e) => setNewApprovalLevel(e.target.value)}
                    disabled={!!readOnly}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="mandatory"
                    type="checkbox"
                    checked={newApprovalMandatory}
                    onChange={(e) => setNewApprovalMandatory(e.target.checked)}
                    disabled={!!readOnly}
                  />
                  <label htmlFor="mandatory" className="text-xs">
                    Mandatory
                  </label>
                </div>
              </div>

              <div className="space-y-1 mt-2">
                {/* Search Interface */}
                <div className="flex flex-col gap-2 p-3 bg-white rounded border">
                  <label className="text-xs font-semibold">Search for Approver (Any Site)</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="Search user..."
                      value={approverSearchTerm}
                      onChange={(e) => handleApproverSearch(e.target.value)}
                      disabled={!!readOnly}
                    />
                  </div>
                  {approverSearchLoading && <div className="text-xs text-gray-500">Searching...</div>}
                  {approverSearchList.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border-t mt-1">
                      {approverSearchList.map(u => (
                        <div key={u.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b">
                          <div className="text-sm">
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.designation} - {u.site_name}</div>
                          </div>
                          <button
                            type="button"
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                            onClick={() => addApprover(u)}
                          >
                            Add L{newApprovalLevel}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {approvalChain.map((a, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 border rounded">
                    <span className="text-sm">
                      L{a.level}: {a.approver_name || `User ${a.approver_user_id}`} {a.is_mandatory ? "(Mandatory)" : "(Optional)"}
                    </span>
                    <button
                      type="button"
                      className="text-red-500 text-xs"
                      onClick={() => {
                        if (!readOnly)
                          setApprovalChain((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            className="px-4 py-2 rounded border"
            onClick={() => {
              if (onCancel) onCancel();
              // else history.back if using router (not passed here)
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white font-medium disabled:opacity-50"
            disabled={submitting || !!readOnly}
          >
            {submitting ? "Saving..." : mode === "create" ? "Create Task" : "Update Task"}
          </button>
        </div>
      </form >
    </div >
  );
}
