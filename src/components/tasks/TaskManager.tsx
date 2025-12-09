"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { Plus, RefreshCw, Shield } from "lucide-react";

type Task = {
  id: number;
  template_id: number;
  site_id?: number | null;
  title?: string | null;
  assignment_type: "single" | "multiple" | "shared" | "role";
  recurrence: "one_time" | "daily" | "weekly" | "monthly";
  start_date?: string | null;
  end_date?: string | null;
  status: "active" | "paused" | "cancelled" | string;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  role: "org" | "employee";
};

export default function TaskManager({ role }: Props) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);

  // Permissions
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [checkingPerms, setCheckingPerms] = React.useState(true);

  const [form, setForm] = React.useState<any>({
    template_id: "",
    site_id: "",
    title: "",
    description: "",
    assignment_type: "single",
    recurrence: "one_time",
    start_date: "",
    end_date: "",
    timezone: "UTC",
    requires_approval: false,
  });

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

  const hasPerm = (code: string) => (permissions || []).includes(code);
  const isOrgAdmin = (userRole || "").toLowerCase() === "orgadmin";
  const canView = isOrgAdmin || hasPerm("TASK_VIEW") || hasPerm("TASK_TEMPLATES");
  const canCreate = isOrgAdmin || hasPerm("TASK_CREATE") || hasPerm("TASK_TEMPLATES");

  const fetchTasks = async () => {
    if (!canView && !checkingPerms) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<Task[]>("/tasks", { method: "GET" });
      setTasks(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!checkingPerms && canView) fetchTasks();
  }, [checkingPerms, canView]);

  const saveTask = async () => {
    try {
      await apiClient("/tasks", {
        method: "POST", body: {
          template_id: Number(form.template_id),
          site_id: form.site_id ? Number(form.site_id) : null,
          title: form.title || null,
          description: form.description || null,
          assignment_type: form.assignment_type,
          recurrence: form.recurrence,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          timezone: form.timezone || "UTC",
          requires_approval: !!form.requires_approval,
        }
      });
      setShowCreate(false);
      setForm({ template_id: "", site_id: "", title: "", description: "", assignment_type: "single", recurrence: "one_time", start_date: "", end_date: "", timezone: "UTC", requires_approval: false });
      await fetchTasks();
    } catch (e: any) {
      alert(e?.message || "Create failed");
    }
  };

  if (checkingPerms) return <div className="p-4 text-sm">Checking permissions...</div>;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
        <Shield size={48} className="mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p>You do not have permission to view task templates.</p>
      </div>
    );
  }

  return (
    <section className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Tasks</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded border text-black" onClick={() => fetchTasks()} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          {(role === "org" || canCreate) && (
            <button className="px-3 py-1.5 rounded bg-black text-white flex items-center gap-1" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {loading && <div className="text-sm text-black">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="px-3 py-2 text-left border">ID</th>
              <th className="px-3 py-2 text-left border">Title</th>
              <th className="px-3 py-2 text-left border">Template</th>
              <th className="px-3 py-2 text-left border">Assignment</th>
              <th className="px-3 py-2 text-left border">Recurrence</th>
              <th className="px-3 py-2 text-left border">Start</th>
              <th className="px-3 py-2 text-left border">End</th>
              <th className="px-3 py-2 text-left border">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border">{t.id}</td>
                <td className="px-3 py-2 border">{t.title || '-'}</td>
                <td className="px-3 py-2 border">{t.template_id}</td>
                <td className="px-3 py-2 border">{t.assignment_type}</td>
                <td className="px-3 py-2 border">{t.recurrence}</td>
                <td className="px-3 py-2 border">{t.start_date || '-'}</td>
                <td className="px-3 py-2 border">{t.end_date || '-'}</td>
                <td className="px-3 py-2 border">{t.status}</td>
              </tr>
            ))}
            {tasks.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-gray-500">No tasks found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative mx-auto mt-20 w-[95%] max-w-xl rounded bg-white shadow-lg">
            <div className="p-4 border-b">
              <h3 className="text-base font-semibold">Create Task</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <label className="block text-xs text-slate-600 mb-1">Title</label>
                <input className="w-full border rounded px-2 py-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Template ID</label>
                <input className="w-full border rounded px-2 py-1" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Site ID</label>
                <input className="w-full border rounded px-2 py-1" value={form.site_id} onChange={(e) => setForm({ ...form, site_id: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Assignment Type</label>
                <select className="w-full border rounded px-2 py-1" value={form.assignment_type} onChange={(e) => setForm({ ...form, assignment_type: e.target.value })}>
                  <option value="single">single</option>
                  <option value="multiple">multiple</option>
                  <option value="shared">shared</option>
                  <option value="role">role</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Recurrence</label>
                <select className="w-full border rounded px-2 py-1" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                  <option value="one_time">one_time</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                <input type="date" className="w-full border rounded px-2 py-1" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">End Date</label>
                <input type="date" className="w-full border rounded px-2 py-1" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="inline-flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={!!form.requires_approval} onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })} />
                  Requires approval
                </label>
              </div>
            </div>
            <div className="p-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 rounded border text-black" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="px-3 py-1.5 rounded bg-black text-white" onClick={saveTask}>Create</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}