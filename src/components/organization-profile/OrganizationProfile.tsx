"use client";
import React from "react";
import Image from "next/image";
import { apiClient } from "@/lib/apiClient";

type OrgProfile = {
  id: number;
  name: string;
  email: string;
  contact: string;
  status?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  type?: string;
  logo_url?: string;
  database_name?: string;
};

export default function OrganizationProfile() {
  const [org, setOrg] = React.useState<OrgProfile | null>(null);
  const [form, setForm] = React.useState<OrgProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const hasPerm = (code: string) => {
    const list = (permissions || []).map((p) => (p || "").toUpperCase());
    return list.includes(code.toUpperCase());
  };
  const canEdit = (role || "") === "OrgAdmin" || hasPerm("ORGPROFILE_EDIT");

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<{ organization: OrgProfile }>("/organization/profile", { method: "GET" });
      setOrg(data.organization);
      setForm(data.organization);
    } catch (e: any) {
      setError(e?.message || "Failed to load organization profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const session = await apiClient<{
        authenticated: boolean;
        role?: string | null;
        employee?: { permissions?: string[] } | null;
      }>("/auth/session", { method: "GET" });
      if (session?.authenticated) {
        setRole(session.role || null);
        setPermissions(session.employee?.permissions || []);
      }
    } catch (e) {
      // ignore
    }
  };

  React.useEffect(() => {
    fetchSession();
    fetchProfile();
  }, []);

  const startEdit = () => {
    if (!canEdit) return;
    setForm(org);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setForm(org);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient<{ organization: OrgProfile }>("/organization/profile", {
        method: "PUT",
        body: form,
      });
      setOrg(updated.organization);
      setForm(updated.organization);
      showNotice("Profile updated successfully.");
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Failed to update organization profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">{error}</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded">No organization data found.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Organization Profile</h1>
        {canEdit && !isEditing && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Edit
          </button>
        )}
        {canEdit && isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {notice && (
        <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          {notice}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-black mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Organization Name" value={form?.name} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), name: v }))} editable={canEdit && isEditing} />
              <EditableField label="Email" value={form?.email} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), email: v }))} editable={canEdit && isEditing} />
              <EditableField label="Contact Number" value={form?.contact || ""} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), contact: v }))} editable={canEdit && isEditing} />
              <EditableField label="Type" value={form?.type || ""} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), type: v }))} editable={canEdit && isEditing} />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-black mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Address" value={form?.address || ""} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), address: v }))} editable={canEdit && isEditing} />
              <EditableField label="City" value={form?.city || ""} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), city: v }))} editable={canEdit && isEditing} />
              <EditableField label="State" value={form?.state || ""} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), state: v }))} editable={canEdit && isEditing} />
              <EditableField label="Country" value={form?.country || ""} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), country: v }))} editable={canEdit && isEditing} />
              <EditableField label="Pincode" value={form?.pincode || ""} onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), pincode: v }))} editable={canEdit && isEditing} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-black mb-4">Brand</h3>
            <div className="flex flex-col items-center text-center">
              {org?.logo_url ? (
                <div className="flex items-center justify-center w-32 h-32 rounded-lg ring-1 ring-gray-200 bg-gray-50 overflow-hidden">
                  <Image src={org.logo_url} alt="Organization Logo" width={128} height={128} className="object-contain" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-32 h-32 rounded-lg ring-1 ring-gray-200 bg-gray-50 text-gray-600">
                  No logo
                </div>
              )}
              <p className="mt-3 text-sm text-gray-600">Logo appears on documents and dashboards.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, editable }: { label: string; value?: string; onChange: (v: string) => void; editable: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-black">{label}</label>
      {editable ? (
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder={label}
        />
      ) : (
        <p className="mt-1 text-gray-700">{value || "-"}</p>
      )}
    </div>
  );
}