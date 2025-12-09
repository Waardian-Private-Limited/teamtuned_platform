"use client";

import React from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { Loader2, AlertCircle, Calendar, RefreshCw, MoreVertical, Eye, Edit2, ToggleLeft, ToggleRight, Trash2, Shield } from "lucide-react";
import TaskAssignmentViewer from "@/components/tasks/TaskAssignmentViewer";
import TaskCreate from "@/components/tasks/TaskCreate";

type Task = {
  id: number;
  title?: string | null;
  template_id: number;
  site_id?: number | null;
  site_name?: string | null;
  assignment_type: string;
  recurrence: string;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  assignee_count?: number;
  site_count?: number;
  assignee_names?: string | null;
  assignee_designations?: string | null;
};

type Assignment = {
  id: number;
  task_id: number;
  site_id?: number | null;
  user_id?: number | null;
  occurrence_date: string;
  status: string;
  submission_id?: number | null;
  remarks?: string | null;
};

export default function TaskAssignments({ role = "org" }: { role?: "org" | "employee" }) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [viewTaskId, setViewTaskId] = React.useState<number | null>(null);
  const [filters, setFilters] = React.useState<{ status?: string; recurrence?: string }>({});
  const [sites, setSites] = React.useState<Array<{ id: number; name: string }>>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | undefined>(undefined);
  const [loadingTasks, setLoadingTasks] = React.useState(false);
  const [loadingAssign, setLoadingAssign] = React.useState(false);
  const [page, setPage] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(20);
  const [total, setTotal] = React.useState<number>(0);
  const [hasNext, setHasNext] = React.useState<boolean>(false);

  // Permission state
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [checkingPerms, setCheckingPerms] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<any>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setUserRole(session.role);
          setPermissions(session.employee?.permissions || []);
        }
      } catch (_) { } finally {
        setCheckingPerms(false);
      }
    })();
  }, []);

  const isOrgAdmin = (userRole || "").toLowerCase() === "orgadmin";
  const canView = isOrgAdmin || permissions.some(p => ["TASK_VIEW", "TASK_ASSIGN"].includes(p));
  const canCreate = isOrgAdmin || permissions.some(p => ["TASK_CREATE", "TASK_TEMPLATES"].includes(p));

  const loadTasks = React.useCallback(async () => {
    if (!canView) return;
    setError(null);
    setLoadingTasks(true);
    try {
      const q: string[] = ["format=paginated", `page=${page}`, `limit=${limit}`];
      if (filters.status) q.push(`status=${encodeURIComponent(filters.status)}`);
      if (filters.recurrence) q.push(`recurrence=${encodeURIComponent(filters.recurrence)}`);
      if (selectedSiteId && Number.isFinite(selectedSiteId)) q.push(`site_id=${encodeURIComponent(String(selectedSiteId))}`);
      const qs = q.length ? `?${q.join("&")}` : "";
      const res = await apiClient<{ items: Task[]; total: number; page: number; limit: number; hasNext: boolean }>(`/tasks${qs}`, { method: "GET", withAuth: true });
      const items = Array.isArray((res as any)?.items) ? (res as any).items : [];
      setTasks(items);
      setTotal((res as any)?.total || items.length);
      setHasNext(!!(res as any)?.hasNext);
    } catch (e: any) {
      setError(e?.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, [filters, selectedSiteId, page, limit, canView]);

  const loadAssignments = React.useCallback(async (taskId: number) => {
    setLoadingAssign(true);
    setError(null);
    try {
      const res = await apiClient<Assignment[]>(`/tasks/${taskId}/assignments`, { method: "GET", withAuth: true });
      setAssignments(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load assignments");
    } finally {
      setLoadingAssign(false);
    }
  }, []);

  React.useEffect(() => {
    if (!checkingPerms && canView) {
      loadTasks();
    }
  }, [loadTasks, page, limit, checkingPerms, canView]);

  React.useEffect(() => {
    if (viewTaskId != null) {
      loadAssignments(viewTaskId);
    }
  }, [viewTaskId, loadAssignments]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<any>("/sites", { method: "GET", withAuth: true });
        const list = Array.isArray(res) ? res : (Array.isArray(res?.sites) ? res.sites : []);
        setSites(list);
      } catch { }
    })();
  }, []);

  const runScheduler = async () => {
    setRunning(true);
    try {
      await apiClient(`/tasks/scheduler/run`, { method: "POST", withAuth: true });
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || "Failed to run scheduler");
    } finally {
      setRunning(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient(`/tasks/${id}/status`, { method: "POST", withAuth: true, body: { status } });
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await apiClient(`/tasks/${id}`, { method: "DELETE", withAuth: true });
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || "Failed to delete task");
    }
  };

  const [confirm, setConfirm] = React.useState<{ type: 'status' | 'delete'; taskId: number; next?: 'active' | 'paused' | 'cancelled' } | null>(null);

  const [edit, setEdit] = React.useState<{ id: number; form: any } | null>(null);
  const startEdit = async (id: number) => {
    try {
      const res = await apiClient<any>(`/tasks/${id}`, { method: 'GET', withAuth: true });
      const t = res?.task || {};
      const assignees = Array.isArray(res?.assignees) ? res.assignees.map((a: any) => Number(a.user_id)).filter((n: number) => Number.isFinite(n)) : [];
      const approvalChain = Array.isArray(res?.approval_chain) ? res.approval_chain : [];
      setEdit({
        id, form: {
          title: t.title || '',
          description: t.description || '',
          template_id: t.template_id || '',
          site_id: t.site_id || '',
          assignment_type: t.assignment_type || 'single',
          recurrence: t.recurrence || 'one_time',
          start_date: t.start_date || '',
          end_date: t.end_date || '',
          due_time: t.due_time || '',
          requires_approval: !!t.requires_approval,
          assignees,
          approval_chain: approvalChain,
        }
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load task');
    }
  };
  const saveEdit = async () => {
    if (!edit) return;
    try {
      await apiClient(`/tasks/${edit.id}`, {
        method: 'PUT', withAuth: true, body: {
          title: edit.form.title || null,
          template_id: edit.form.template_id ? Number(edit.form.template_id) : undefined,
          site_id: edit.form.site_id ? Number(edit.form.site_id) : undefined,
          assignment_type: edit.form.assignment_type,
          recurrence: edit.form.recurrence,
          start_date: edit.form.start_date || null,
          end_date: edit.form.end_date || null,
          requires_approval: !!edit.form.requires_approval,
        }
      });
      setEdit(null);
      await loadTasks();
    } catch (e: any) {
      setError(e?.message || 'Failed to save task');
    }
  };

  const [view, setView] = React.useState<any | null>(null);
  const viewTask = async (id: number) => {
    try {
      const res = await apiClient<any>(`/tasks/${id}`, { method: 'GET', withAuth: true });
      const viewObj = {
        ...(res?.task || {}),
        assignees: Array.isArray(res?.assignees) ? res.assignees : [],
        approval_chain: Array.isArray(res?.approval_chain) ? res.approval_chain : [],
      };
      setView(viewObj);
    } catch (e: any) {
      setError(e?.message || 'Failed to load task');
    }
  };

  const ActionDropdown = ({
    task,
    onViewAssignments,
    onMakeActive,
    onMakeInactive,
    onDelete,
    onEdit,
    onViewTask,
  }: {
    task: Task;
    onViewAssignments: () => void;
    onMakeActive: () => void;
    onMakeInactive: () => void;
    onDelete: () => void;
    onEdit: () => void;
    onViewTask: () => void;
  }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

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
          onClick={() => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              const estH = 240;
              const width = 192;
              let top = rect.bottom + window.scrollY + 6;
              if (top + estH > window.scrollY + window.innerHeight) {
                top = rect.top + window.scrollY - estH - 6;
              }
              let left = rect.left + window.scrollX;
              if (left + width > window.scrollX + window.innerWidth) {
                left = rect.right + window.scrollX - width;
              }
              setMenuPos({ top, left });
            }
            setIsOpen((o) => !o);
          }}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div
              className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <div className="py-1">
                <button
                  onClick={() => { onViewAssignments(); setIsOpen(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Assignments</span>
                </button>
                <button
                  onClick={() => { onEdit(); setIsOpen(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Task</span>
                </button>
                <button
                  onClick={() => { onViewTask(); setIsOpen(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Task</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                {task.status !== 'active' ? (
                  <button
                    onClick={() => { onMakeActive(); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                  >
                    <ToggleRight className="w-4 h-4" />
                    <span>Activate</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { onMakeInactive(); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                  >
                    <ToggleLeft className="w-4 h-4" />
                    <span>Make Inactive</span>
                  </button>
                )}
                <button
                  onClick={() => { onDelete(); setIsOpen(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (checkingPerms) return <div className="p-8 text-center text-gray-500">Checking access...</div>;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-gray-500">
        <Shield size={48} className="mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-2">You do not have permission to view task assignments.</p>
      </div>
    );
  }

  if (viewTaskId != null) {
    return <TaskAssignmentViewer taskId={viewTaskId} onClose={() => setViewTaskId(null)} />;
  }

  return (
    <div className="p-1 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Task Assignments</h1>
          <p className="mt-1 text-sm text-gray-600">View per-task generated assignments and statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
            >
              Generate Task
            </button>
          )}
          {role === "org" && (
            <button
              onClick={runScheduler}
              disabled={running}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              {running ? "Running..." : "Run Scheduler"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value || undefined }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Recurrence</label>
            <select
              value={filters.recurrence || ''}
              onChange={(e) => setFilters((p) => ({ ...p, recurrence: e.target.value || undefined }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="one_time">one_time</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Site</label>
            <select
              value={selectedSiteId ? String(selectedSiteId) : ''}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedSiteId(v ? Number(v) : undefined);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button onClick={loadTasks} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200">
            <Calendar className="w-4 h-4" />
            Apply Filters
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm">Page</label>
            <input type="number" className="w-16 border rounded px-2 py-1 text-sm" value={page} onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))} />
            <label className="text-sm">Limit</label>
            <select className="border rounded px-2 py-1 text-sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tasks</h2>
          {loadingTasks && <Loader2 className="w-4 h-4 animate-spin text-gray-600" />}
        </div>
        {error && (
          <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurrence</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignees</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">No tasks found.</td>
                </tr>
              )}
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{t.title || `Task #${t.id}`}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{t.recurrence}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {t.assignee_names && t.assignee_names.length
                      ? (
                        <div>
                          <div title={t.assignee_names}>{t.assignee_names}</div>
                          {t.assignee_designations && t.assignee_designations.length ? (
                            <div className="text-xs text-gray-500 mt-0.5" title={t.assignee_designations}>{t.assignee_designations}</div>
                          ) : null}
                        </div>
                      )
                      : (t.assignee_count ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {t.site_name?.toString()?.length
                      ? t.site_name
                      : ((t.site_count ?? (t.site_id ? 1 : 0)) + ' sites')}
                  </td>
                  <td className="px-4 py-2 text-sm"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{t.status}</span></td>
                  <td className="px-4 py-2 text-sm">
                    <ActionDropdown
                      task={t}
                      onViewAssignments={() => setViewTaskId(t.id)}
                      onMakeActive={() => setConfirm({ type: 'status', taskId: t.id, next: 'active' })}
                      onMakeInactive={() => setConfirm({ type: 'status', taskId: t.id, next: 'paused' })}
                      onDelete={() => setConfirm({ type: 'delete', taskId: t.id })}
                      onEdit={() => startEdit(t.id)}
                      onViewTask={() => viewTask(t.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
          <div>Total: {total}</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 rounded bg-gray-100" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <button className="px-2 py-1 rounded bg-gray-100" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl max-h-[80vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-semibold">Generate Task</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <TaskCreate mode="create" defaultSiteId={selectedSiteId} onSaved={() => { setShowCreate(false); loadTasks(); }} />
            </div>
          </div>
        </div>
      )}



      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirm(null)} />
          <div className="relative w-[95%] max-w-md rounded bg-white shadow-lg">
            <div className="p-4 border-b">
              <div className="text-base font-semibold">Confirm Action</div>
            </div>
            <div className="p-4 text-sm text-slate-700">
              {confirm.type === 'delete' ? 'Are you sure you want to delete this task? This cannot be undone.' : `Are you sure you want to set status to ${confirm.next}?`}
            </div>
            <div className="p-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 rounded border" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="px-3 py-1.5 rounded bg-red-600 text-white"
                onClick={async () => {
                  if (confirm.type === 'delete') {
                    await deleteTask(confirm.taskId);
                  } else {
                    await updateStatus(confirm.taskId, confirm.next!);
                  }
                  setConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {view && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setView(null)} />
          <div className="relative mx-auto my-8 w-[95%] max-w-xl max-h-[80vh] overflow-y-auto rounded bg-white shadow-lg">
            <div className="p-4 border-b"><div className="text-base font-semibold">Task Details</div></div>
            <div className="p-4">
              <TaskCreate mode="view" initialTask={view} initialAssignees={Array.isArray(view?.assignees) ? view.assignees.map((a: any) => a.user_id) : undefined} initialApprovalChain={view?.approval_chain} readOnly />
            </div>
            <div className="p-4 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button className="px-3 py-1.5 rounded border" onClick={() => setView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEdit(null)} />
          <div className="relative mx-auto my-8 w-[95%] max-w-xl max-h-[80vh] overflow-y-auto rounded bg-white shadow-lg">
            <div className="p-4 border-b"><div className="text-base font-semibold">Edit Task</div></div>
            <div className="p-4">
              <TaskCreate mode="edit" initialTask={edit!.form} initialAssignees={edit!.form?.assignees} initialApprovalChain={edit!.form?.approval_chain} onSaved={() => { setEdit(null); loadTasks(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
