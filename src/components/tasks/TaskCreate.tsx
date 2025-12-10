"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";

import { useAuth } from "@/context/AuthContext";
type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export default function TaskCreate({ mode = "create", initialTask, initialAssignees, initialApprovalChain, onSaved, readOnly, defaultSiteId }: { mode?: "create" | "edit" | "view"; initialTask?: any; initialAssignees?: number[]; initialApprovalChain?: Array<{ level: number; approver_user_id?: number; is_mandatory?: boolean }>; onSaved?: () => void; readOnly?: boolean; defaultSiteId?: number }) {
  const [templates, setTemplates] = useState<Array<{ id: number; name: string }>>([]);
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; user_id?: number }>>([]);
  const [extraSiteIds, setExtraSiteIds] = useState<number[]>([]);
  const [siteEmployees, setSiteEmployees] = useState<Record<string, Array<{ id: number; name: string; user_id?: number }>>>({});
  const [siteAssignees, setSiteAssignees] = useState<Record<string, number[]>>({});
  // Approval chain employees (paginated)
  const [approvers, setApprovers] = useState<Array<{ id: number; name: string; user_id?: number }>>([]);
  const [approverPage, setApproverPage] = useState<number>(1);
  const [approverLimit, setApproverLimit] = useState<number>(20);
  const [approverHasNext, setApproverHasNext] = useState<boolean>(false);
  const [approverSearch, setApproverSearch] = useState<string>("");

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

  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [approvalChain, setApprovalChain] = useState<Array<{ level: number; approver_user_id?: number; is_mandatory?: boolean }>>([]);
  const [newApprovalLevel, setNewApprovalLevel] = useState<string>("1");
  const [newApprovalUserId, setNewApprovalUserId] = useState<string>("");
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

  const addApprovalLevel = () => {
    const lvl = Number(newApprovalLevel);
    if (!Number.isFinite(lvl)) return;
    const entry: { level: number; approver_user_id?: number; is_mandatory?: boolean } = { level: lvl, is_mandatory: newApprovalMandatory };
    if (newApprovalUserId) entry.approver_user_id = Number(newApprovalUserId);
    setApprovalChain((prev) => [...prev, entry]);
    setNewApprovalLevel("" + (lvl + 1));
    setNewApprovalUserId("");
    setNewApprovalMandatory(true);
  };

  // Load templates and sites on mount
  const { role, user, organization, employee } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const t = await apiClient<Array<{ id: number; name: string }>>("/templates", { method: "GET", withAuth: true });
        setTemplates(Array.isArray(t) ? t : []);
      } catch { }
      try {
        const s = await apiClient<{ sites: any[] }>("/sites", { method: "GET", withAuth: true });
        const normalized = (s?.sites || []).map((x: any) => ({ id: Number(x.id), name: String(x.name || x.code || x.id) }));
        setSites(normalized);
      } catch (e) {
        // Fallback for employees without SITE_VIEW: use sites from session
        try {
          const authorizedSites = (employee as any)?.sites || [];
          const normalized = authorizedSites.map((x: any) => ({ id: Number(x.id), name: String(x.name || x.code || x.id) }));
          setSites(normalized);
        } catch { }
      }
    })();
  }, []);

  // Load employees when site changes (filtered by site)
  useEffect(() => {
    (async () => {
      if (!siteId) {
        setEmployees([]);
        return;
      }
      try {
        const data = await apiClient<{ items: Array<any>; total: number; page: number; limit: number; hasNext: boolean }>("/organization/employees", {
          method: "GET",
          params: { format: "paginated", page: "1", limit: String(50), site_id: siteId, hq: "false" },
          withAuth: true,
        });
        const items = Array.isArray(data?.items) ? data.items : [];
        const normalized = items.map((e: any) => ({ id: Number(e.id), user_id: Number(e.id), name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || (e.email || `Employee ${e.id}`) }));
        setEmployees(normalized);
      } catch {
        setEmployees([]);
      }
    })();
  }, [siteId]);

  useEffect(() => {
    (async () => {
      for (const sid of extraSiteIds) {
        const key = String(sid);
        if (siteEmployees[key]) continue;
        try {
          const data = await apiClient<{ items: Array<any>; total: number; page: number; limit: number; hasNext: boolean }>("/organization/employees", {
            method: "GET",
            params: { format: "paginated", page: "1", limit: String(50), site_id: String(sid), hq: "false" },
            withAuth: true,
          });
          const items = Array.isArray(data?.items) ? data.items : [];
          const normalized = items.map((e: any) => ({ id: Number(e.id), user_id: Number(e.id), name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || (e.email || `Employee ${e.id}`) }));
          setSiteEmployees((prev) => ({ ...prev, [key]: normalized }));
        } catch {
          setSiteEmployees((prev) => ({ ...prev, [key]: [] }));
        }
      }
    })();
  }, [extraSiteIds]);

  // Load approvers (paginated), across organization (HQ mode)
  const fetchApprovers = async (opts?: { reset?: boolean }) => {
    try {
      const page = opts?.reset ? 1 : approverPage;
      const params: Record<string, string> = {
        format: "paginated",
        page: String(page),
        limit: String(approverLimit),
        hq: "true",
      };
      if (approverSearch.trim()) params.search = approverSearch.trim();
      const data = await apiClient<{ items: Array<any>; total: number; page: number; limit: number; hasNext: boolean }>("/organization/employees", {
        method: "GET",
        params,
        withAuth: true,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      const normalized = items.map((e: any) => ({ id: Number(e.id), user_id: Number(e.id), name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || (e.email || `Employee ${e.id}`), designation: e.designation || null }));
      setApproverHasNext(!!data?.hasNext);
      if (opts?.reset) {
        setApprovers(normalized);
        setApproverPage(2);
      } else {
        setApprovers((prev) => [...prev, ...normalized]);
        setApproverPage(page + 1);
      }
    } catch {
      if (opts?.reset) {
        setApprovers([]);
        setApproverPage(1);
        setApproverHasNext(false);
      }
    }
  };

  useEffect(() => {
    if (requiresApproval) {
      fetchApprovers({ reset: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresApproval, siteId]);

  // Prefill in edit/view mode
  useEffect(() => {
    if (initialTask) {
      setTemplateId(initialTask.template_id ? String(initialTask.template_id) : "");
      setSiteId(initialTask.site_id ? String(initialTask.site_id) : "");
      setTitle(initialTask.title || "");
      setDescription(initialTask.description || "");
      setAssignmentType(initialTask.assignment_type || "single");
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
      if (Array.isArray(initialApprovalChain)) setApprovalChain(initialApprovalChain.map((a) => ({ level: Number(a.level), approver_user_id: a.approver_user_id, is_mandatory: a.is_mandatory !== false })));
    }
    // Preselect site based on defaultSiteId when creating
    if (!initialTask && defaultSiteId && !siteId) {
      setSiteId(String(defaultSiteId));
    }
    if (!initialTask && defaultSiteId && !siteId) {
      setSiteId(String(defaultSiteId));
    }
  }, [initialTask, recurrence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!templateId || !assignmentType || !recurrence) {
      setMessage("Template, assignment type, and recurrence are required.");
      return;
    }
    if (recurrence === "weekly" && weeklyDays.length === 0) {
      setMessage("Please select at least one weekday for weekly recurrence.");
      return;
    }
    if (recurrence === "monthly" && monthlyDays.length === 0) {
      setMessage("Please enter at least one day number (1–31).");
      return;
    }

    const recurrence_rule =
      recurrence === "weekly"
        ? JSON.stringify({ weekdays: weeklyDays })
        : recurrence === "monthly"
          ? JSON.stringify({ monthDays: monthlyDays })
          : null;

    const siteAssigneesArr: Array<{ site_id: number; assignee_user_ids: number[] }> = [];
    if (siteId && selectedAssignees.length) {
      siteAssigneesArr.push({ site_id: Number(siteId), assignee_user_ids: selectedAssignees });
    }
    for (const sid of extraSiteIds) {
      const key = String(sid);
      const arr = siteAssignees[key] || [];
      if (arr.length) siteAssigneesArr.push({ site_id: Number(sid), assignee_user_ids: arr });
    }

    const body = {
      template_id: Number(templateId),
      site_id: siteId ? Number(siteId) : null,
      title: title || null,
      description: description || null,
      assignment_type: assignmentType,
      recurrence,
      recurrence_rule,
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
      assignees,
      site_assignees: siteAssigneesArr,
      approval_chain: requiresApproval ? approvalChain : [],
      status: "active",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template</label>
            <select className="w-full border rounded px-3 py-2" value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={!!readOnly}>
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={String(t.id)}>{t.name ?? `Template ${t.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Site</label>
            <select className="w-full border rounded px-3 py-2" value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={!!readOnly}>
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name ?? `Site ${s.id}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input className="w-full border rounded px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!!readOnly} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input className="w-full border rounded px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!!readOnly} />
          </div>
        </div>

        {/* Translations removed per requirement; keep plain title/description only */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assignment Type</label>
            <select className="w-full border rounded px-3 py-2" value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)} disabled={!!readOnly}>
              <option value="single">single</option>
              <option value="multiple">multiple</option>
              <option value="shared">shared</option>
              <option value="role">role</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recurrence</label>
            <select className="w-full border rounded px-3 py-2" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} disabled={!!readOnly}>
              <option value="one_time">one_time</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <input className="w-full border rounded px-3 py-2" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Kolkata" disabled={!!readOnly} />
          </div>
        </div>

        {recurrence === "monthly" && (
          <div>
            <label className="block text-sm font-medium mb-1">Month day(s) (1–31)</label>
            <input className="w-full border rounded px-3 py-2" value={monthlyDaysInput} onChange={(e) => setMonthlyDaysInput(e.target.value)} placeholder="e.g., 1, 11, 21" disabled={!!readOnly} />
            <p className="text-xs text-gray-500 mt-1">Valid: {monthlyDays.join(", ") || "None"}</p>
          </div>
        )}

        {recurrence === "weekly" && (
          <div>
            <label className="block text-sm font-medium mb-2">Select weekday(s)</label>
            <div className="flex flex-wrap gap-2">
              {weekdaysList.map((wd) => (
                <button disabled={!!readOnly}
                  key={wd}
                  type="button"
                  className={`px-3 py-1 rounded border ${weeklyDays.includes(wd) ? "bg-blue-600 text-white" : "bg-white"}`}
                  onClick={() => toggleWeekday(wd)}
                >
                  {wd}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurrence !== "daily" && (
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!!readOnly} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Due Time</label>
            <input type="time" className="w-full border rounded px-3 py-2" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={!!readOnly} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input id="requiresApproval" type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} disabled={!!readOnly} />
            <label htmlFor="requiresApproval" className="text-sm">Requires Approval</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="skipWeekOff" type="checkbox" checked={skipWeekOff} onChange={(e) => setSkipWeekOff(e.target.checked)} disabled={!!readOnly} />
            <label htmlFor="skipWeekOff" className="text-sm">Skip on Week Off</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="skipHoliday" type="checkbox" checked={skipHoliday} onChange={(e) => setSkipHoliday(e.target.checked)} disabled={!!readOnly} />
            <label htmlFor="skipHoliday" className="text-sm">Skip on Holiday</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="skipLeave" type="checkbox" checked={skipLeave} onChange={(e) => setSkipLeave(e.target.checked)} disabled={!!readOnly} />
            <label htmlFor="skipLeave" className="text-sm">Skip on Leave</label>
          </div>
          {recurrence === "one_time" && (
            <div className="flex items-center gap-2">
              <input id="assignNextWorkingDay" type="checkbox" checked={assignNextWorkingDay} onChange={(e) => setAssignNextWorkingDay(e.target.checked)} disabled={!!readOnly} />
              <label htmlFor="assignNextWorkingDay" className="text-sm">Assign on Next Working Day</label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Assignees</label>
          {assignmentType === "multiple" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {employees.map((emp) => {
                const value = Number(emp.user_id ?? emp.id);
                const checked = selectedAssignees.includes(value);
                return (
                  <label key={emp.id} className="flex items-center gap-2 border rounded px-3 py-2">
                    <input disabled={!!readOnly}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedAssignees((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(value); else next.delete(value);
                          return Array.from(next);
                        });
                      }}
                    />
                    <span className="text-sm">
                      {emp.name ?? `Employee ${emp.id}`}
                      {" "}
                      {("designation" in emp && (emp as any).designation) ? <span className="text-gray-500">— {(emp as any).designation}</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <select disabled={!!readOnly}
              className="w-full border rounded px-3 py-2"
              value={selectedAssignees[0] ? String(selectedAssignees[0]) : ""}
              onChange={(e) => setSelectedAssignees(e.target.value ? [Number(e.target.value)] : [])}
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={String(emp.user_id ?? emp.id)}>
                  {(emp.name ?? `Employee ${emp.id}`)}{("designation" in emp && (emp as any).designation) ? ` — ${(emp as any).designation}` : ""}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">Employees are filtered by selected site.</p>
        </div>

        <div className="border rounded p-3 space-y-2">
          <div className="font-medium">Additional Sites</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {sites.map((s) => {
              const checked = extraSiteIds.includes(Number(s.id));
              return (
                <label key={s.id} className="flex items-center gap-2 border rounded px-3 py-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setExtraSiteIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(Number(s.id)); else next.delete(Number(s.id));
                        return Array.from(next);
                      });
                    }}
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              );
            })}
          </div>
          {extraSiteIds.map((sid) => {
            const key = String(sid);
            const list = siteEmployees[key] || [];
            const selected = siteAssignees[key] || [];
            return (
              <div key={`site-${sid}`} className="space-y-2">
                <div className="text-sm font-medium">Assignees for site #{sid}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {list.map((emp) => {
                    const value = Number(emp.user_id ?? emp.id);
                    const checked = selected.includes(value);
                    return (
                      <label key={emp.id} className="flex items-center gap-2 border rounded px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSiteAssignees((prev) => {
                              const cur = new Set(prev[key] || []);
                              if (e.target.checked) cur.add(value); else cur.delete(value);
                              return { ...prev, [key]: Array.from(cur) };
                            });
                          }}
                        />
                        <span className="text-sm">{emp.name ?? `Employee ${emp.id}`}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {requiresApproval && (
          <div className="border rounded p-3 space-y-2">
            <div className="font-medium">Approval Chain</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div>
                <label className="block text-xs mb-1">Level</label>
                <input className="w-full border rounded px-2 py-1" value={newApprovalLevel} onChange={(e) => setNewApprovalLevel(e.target.value)} disabled={!!readOnly} />
              </div>
              <div>
                <label className="block text-xs mb-1">Approver Search</label>
                <input className="w-full border rounded px-2 py-1" value={approverSearch} onChange={(e) => setApproverSearch(e.target.value)} placeholder="Name or email" disabled={!!readOnly} />
              </div>
              <div>
                <label className="block text-xs mb-1">Approver</label>
                <select className="w-full border rounded px-2 py-1" value={newApprovalUserId} onChange={(e) => setNewApprovalUserId(e.target.value)} disabled={!!readOnly}>
                  <option value="">Select employee</option>
                  {approvers.map((emp) => (
                    <option key={emp.id} value={String(emp.user_id ?? emp.id)}>
                      {(emp.name ?? `Employee ${emp.id}`)}{("designation" in emp && (emp as any).designation) ? ` — ${(emp as any).designation}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="mandatory" type="checkbox" checked={newApprovalMandatory} onChange={(e) => setNewApprovalMandatory(e.target.checked)} disabled={!!readOnly} />
                <label htmlFor="mandatory" className="text-xs">Mandatory</label>
              </div>
              <div className="flex gap-2">
                <button type="button" className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => fetchApprovers({ reset: true })} disabled={!!readOnly}>Search</button>
                <button type="button" className="px-3 py-2 rounded bg-blue-600 text-white" onClick={addApprovalLevel} disabled={!!readOnly}>Add Level</button>
              </div>
            </div>
            {approverHasNext && (
              <div className="mt-2">
                <button type="button" className="px-3 py-2 rounded bg-gray-200" onClick={() => fetchApprovers()}>Load more approvers</button>
              </div>
            )}
            {approvalChain.length > 0 && (
              <div className="space-y-2">
                {approvalChain
                  .sort((a, b) => a.level - b.level)
                  .map((a) => (
                    <div key={`level-${a.level}`} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                      <div className="font-medium">Level {a.level}</div>
                      <div className="text-gray-700">
                        Approver: {a.approver_user_id ? a.approver_user_id : "—"}
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{a.is_mandatory !== false ? "Mandatory" : "Optional"}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div>
          {mode !== "view" && (
            <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white" disabled={submitting}>
              {submitting ? (mode === "create" ? "Creating..." : "Saving...") : (mode === "create" ? "Generate Task" : "Save Changes")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
