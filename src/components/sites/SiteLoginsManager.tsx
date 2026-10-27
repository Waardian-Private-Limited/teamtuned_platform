"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/apiClient";
import { cx, field } from "@/theme/tokens";
import { formatDateTime } from "@/lib/datetime";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog, type ConfirmState } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { Switch } from "@/components/ui/Switch";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { PageHeader, primaryBtn, secondaryBtn } from "@/features/expense-bills/components/Primitives";
import { SearchBox, th, td, trCls } from "@/features/labour/components/shared/Primitives";

interface SiteLogin {
    id: number;
    site_id: number | null;
    username: string;
    collection_name: string | null;
    status: "active" | "inactive";
    created_at: string;
}

interface Site {
    id: number;
    name: string;
}

interface FormState {
    username: string;
    password: string;
    site_id: string;
    collection_name: string;
    active: boolean;
}

const EMPTY: FormState = { username: "", password: "", site_id: "", collection_name: "", active: true };

export default function SiteLoginsManager() {
    const [logins, setLogins] = useState<SiteLogin[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<SiteLogin | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState<ConfirmState | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [loginsRes, sitesRes] = await Promise.all([
                apiClient<{ success: boolean; data: SiteLogin[] }>("/organization/site-logins"),
                apiClient<{ status: string; sites: Site[] }>("/sites"),
            ]);
            setLogins(loginsRes.data || []);
            setSites(sitesRes.sites || []);
        } catch {
            toast.error("Failed to load site logins");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const siteName = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return logins;
        return logins.filter((l) => l.username.toLowerCase().includes(q) || (l.collection_name || "").toLowerCase().includes(q));
    }, [logins, search]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY);
        setErrors({});
        setOpen(true);
    };

    const openEdit = (login: SiteLogin) => {
        setEditing(login);
        setForm({ username: login.username, password: "", site_id: login.site_id ? String(login.site_id) : "", collection_name: login.collection_name || "", active: login.status === "active" });
        setErrors({});
        setOpen(true);
    };

    const close = () => { setOpen(false); setEditing(null); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const next: { username?: string; password?: string } = {};
        if (!form.username.trim()) next.username = "Enter a username";
        if (!editing && !form.password) next.password = "Enter a password";
        setErrors(next);
        if (Object.keys(next).length) return;

        const body = {
            username: form.username.trim(),
            site_id: form.site_id ? parseInt(form.site_id, 10) : null,
            collection_name: form.collection_name,
            status: form.active ? "active" : "inactive",
            ...(form.password ? { password: form.password } : {}),
        };
        setSaving(true);
        try {
            if (editing) {
                await apiClient(`/organization/site-logins/${editing.id}`, { method: "PUT", body });
                toast.success("Site login updated");
            } else {
                await apiClient("/organization/site-logins", { method: "POST", body });
                toast.success("Site login created");
            }
            close();
            load();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Operation failed");
        } finally {
            setSaving(false);
        }
    };

    const askDelete = (login: SiteLogin) => setConfirm({
        title: "Delete site login",
        body: <>Delete <strong>{login.username}</strong>? Machines can no longer sign in with it.</>,
        cta: "Delete",
        danger: true,
        run: async () => {
            try {
                await apiClient(`/organization/site-logins/${login.id}`, { method: "DELETE" });
                setLogins((list) => list.filter((l) => l.id !== login.id));
                toast.success("Site login deleted");
            } catch {
                toast.error("Failed to delete");
            }
        },
    });

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4 2xl:p-5">
            <PageHeader title="Site logins" description="Credentials that kiosks and site machines use to sign in.">
                <SearchBox value={search} onChange={setSearch} placeholder="Search username or name" />
                <button type="button" className={primaryBtn} onClick={openCreate}>
                    <Plus className="h-4 w-4" aria-hidden /> New login
                </button>
            </PageHeader>

            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface tt-scroll-hidden">
                {loading ? (
                    <TableSkeleton rows={6} columns={5} />
                ) : rows.length === 0 ? (
                    <EmptyState
                        compact={!!search}
                        title={search ? "No site logins match your search" : "No site logins yet"}
                        description={search ? undefined : "Create a login for each kiosk or site machine."}
                        action={search ? undefined : { label: "New login", onClick: openCreate }}
                    />
                ) : (
                    <table className="w-full min-w-[720px] border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className={th}>Username</th>
                                <th className={th}>Display name</th>
                                <th className={th}>Site</th>
                                <th className={cx(th, "w-32")}>Status</th>
                                <th className={cx(th, "w-44")}>Created</th>
                                <th className={cx(th, "w-24 text-right")}><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((login) => (
                                <tr key={login.id} className={trCls}>
                                    <td className={cx(td, "align-middle font-semibold text-fg")}>{login.username}</td>
                                    <td className={cx(td, "align-middle text-fg-muted")}>{login.collection_name || "—"}</td>
                                    <td className={cx(td, "align-middle")}>
                                        {login.site_id ? (siteName.get(login.site_id) || `Site ${login.site_id}`) : <span className="text-fg-subtle">Not tied to a site</span>}
                                    </td>
                                    <td className={cx(td, "align-middle")}>
                                        <StatusPill label={login.status === "active" ? "Active" : "Inactive"} tone={login.status === "active" ? "active" : "inactive"} />
                                    </td>
                                    <td className={cx(td, "align-middle text-fg-muted")}>{formatDateTime(login.created_at)}</td>
                                    <td className={cx(td, "align-middle")}>
                                        <div className="flex justify-end gap-1">
                                            <button type="button" aria-label={`Edit ${login.username}`} title="Edit" onClick={() => openEdit(login)} className="rounded-lg p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button type="button" aria-label={`Delete ${login.username}`} title="Delete" onClick={() => askDelete(login)} className="rounded-lg p-2 text-fg-muted transition-colors hover:bg-[var(--tt-danger-soft)] hover:text-[var(--tt-danger)]">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Dialog
                open={open}
                onClose={close}
                title={editing ? "Edit site login" : "New site login"}
                maxWidthClassName="max-w-md"
                footer={
                    <>
                        <button type="button" className={secondaryBtn} onClick={close}>Cancel</button>
                        <button type="submit" form="site-login-form" className={primaryBtn} disabled={saving}>{saving ? "Saving..." : editing ? "Save" : "Create"}</button>
                    </>
                }
            >
                <form id="site-login-form" onSubmit={submit} className="space-y-4" noValidate>
                    <Field label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. site_a_kiosk" error={errors.username} autoComplete="off" />
                    <Field
                        label="Password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        hint={editing ? "Leave empty to keep the current password" : undefined}
                        error={errors.password}
                        autoComplete="new-password"
                    />
                    <div>
                        <label htmlFor="site-login-site" className={field.label}>Site (optional)</label>
                        <select
                            id="site-login-site"
                            value={form.site_id}
                            onChange={(e) => setForm({ ...form, site_id: e.target.value })}
                            className="h-[52px] w-full rounded-[var(--tt-radius-control)] border border-line bg-surface px-4 text-[15px] text-fg hover:border-line-strong focus:border-[var(--tt-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--tt-ring)]"
                        >
                            <option value="">Not tied to a site</option>
                            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <Field label="Display name" value={form.collection_name} onChange={(e) => setForm({ ...form, collection_name: e.target.value })} placeholder="e.g. Main gate kiosk 1" />
                    <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-fg">Active</p>
                            <p className="text-xs text-fg-muted">Switch off to stop new sign-ins with this login.</p>
                        </div>
                        <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" />
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
        </div>
    );
}
