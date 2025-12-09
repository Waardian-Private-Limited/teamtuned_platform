"use client";
import React from "react";
import Image from "next/image";
import { apiClient } from "@/lib/apiClient";
import {
  Edit2,
  Save,
  X,
  Building2,
  MapPin,
  Globe,
  Mail,
  Phone,
  Hash,
  FileText
} from "lucide-react";

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
      <div className="p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-2xl" />
            <div className="space-y-3 flex-1">
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <X size={20} />
          {error}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">No organization data found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-5 z-10">
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-xs"
            >
              <Edit2 size={14} />
              Edit Profile
            </button>
          )}
          {canEdit && isEditing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-all font-medium text-xs"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all font-medium text-xs disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-0">
          <div className="relative group">
            <div className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-2 overflow-hidden">
              {(form?.logo_url || org?.logo_url) ? (
                <Image src={form?.logo_url || org.logo_url || ""} alt="Logo" width={80} height={80} className="object-contain w-full h-full" />
              ) : (
                <Building2 size={32} className="text-gray-300" />
              )}
            </div>

            {canEdit && isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                <Edit2 size={16} className="text-white" />
              </div>
            )}
            <input
              type="file"
              id="logo-upload"
              className="hidden"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // Upload logic
                const formData = new FormData();
                formData.append('files', file);

                try {
                  // Show uploading state if desired, or just toast
                  const res = await apiClient<{ success: boolean; files: { url: string }[] }>('/files/org-upload/logo', {
                    method: 'POST',
                    body: formData,
                  });

                  if (res?.success && res.files?.[0]) {
                    const newUrl = res.files[0].url;
                    setForm(prev => prev ? ({ ...prev, logo_url: newUrl }) : null);
                    showNotice("Logo uploaded. Click Save to persist changes.");
                  }
                } catch (err: any) {
                  showNotice("Upload failed: " + (err.message || "Unknown error"));
                }
              }}
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{form?.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                <Hash size={12} className="text-gray-400" />
                <span>ID: {org.id}</span>
              </div>
              {form?.type && (
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  <FileText size={12} className="text-gray-400" />
                  <span>{form.type}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 flex items-center gap-2">
          <Save size={16} />
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* General Information */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Building2 size={16} className="text-blue-600" />
              General Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <EditableField
                label="Organization Name"
                value={form?.name}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), name: v }))}
                editable={isEditing}
                icon={<Building2 size={14} />}
              />
              <EditableField
                label="Email Address"
                value={form?.email}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), email: v }))}
                editable={isEditing}
                icon={<Mail size={14} />}
              />
              <EditableField
                label="Contact Number"
                value={form?.contact}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), contact: v }))}
                editable={isEditing}
                icon={<Phone size={14} />}
              />
              <EditableField
                label="Organization Type"
                value={form?.type}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), type: v }))}
                editable={isEditing}
                icon={<Globe size={14} />}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <MapPin size={16} className="text-blue-600" />
              Location Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="md:col-span-2">
                <EditableField
                  label="Address Line"
                  value={form?.address}
                  onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), address: v }))}
                  editable={isEditing}
                  fullWidth
                />
              </div>
              <EditableField
                label="City"
                value={form?.city}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), city: v }))}
                editable={isEditing}
              />
              <EditableField
                label="State / Province"
                value={form?.state}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), state: v }))}
                editable={isEditing}
              />
              <EditableField
                label="Country"
                value={form?.country}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), country: v }))}
                editable={isEditing}
              />
              <EditableField
                label="Pincode / Zip Code"
                value={form?.pincode}
                onChange={(v) => setForm((f) => ({ ...(f as OrgProfile), pincode: v }))}
                editable={isEditing}
              />
            </div>
          </div>
        </div>

        {/* Sidebar / Meta Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">System Details</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="text-[10px] font-medium text-gray-500 uppercase block mb-0.5">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${org.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {org.status || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  editable,
  icon,
  fullWidth = false
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  editable: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? "w-full" : ""}`}>
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        {label}
      </label>
      {editable ? (
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <div className="px-0 py-1 text-sm font-medium text-gray-900 border-b border-transparent">
          {value || <span className="text-gray-400 italic text-xs">Not set</span>}
        </div>
      )}
    </div>
  );
}