"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";

type ConfigResponse = {
  registered: boolean;
  config: {
    id: number;
    method_code: string;
    notes?: string | null;
    status?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
};

const OPTIONS = [
  {
    key: "qr_face_geofencing",
    label: "QR + Face Recognition + Geofencing",
    description:
      "Employees scan a QR, verify face, and must be inside geofence.",
  },
  {
    key: "qr_geofencing",
    label: "QR + Geofencing",
    description: "Employees scan a QR and must be inside geofence.",
  },
  {
    key: "face_geofencing",
    label: "Face Recognition + Geofencing",
    description:
      "Employees verify face and must be inside geofence (no QR).",
  },
  {
    key: "qr_or_face_geofencing",
    label: "QR or Face Recognition + Geofencing",
    description:
      "Employees can either scan QR or verify face while inside geofence.",
  },
];

export default function AttendanceConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [selected, setSelected] = useState<string>(OPTIONS[0].key);
  const [notes, setNotes] = useState<string>("");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  useEffect(() => {
    // Fetch session to determine role and employee permissions
    (async () => {
      try {
        const session = await apiClient<{
          authenticated: boolean;
          role: string;
          employee?: { permissions?: string[] } | null;
        }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole(session.role || null);
          setPermissions(session.employee?.permissions || []);
        }
      } catch (_) {}
    })();

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient<ConfigResponse>("/attendance/config", {
          method: "GET",
          withAuth: true,
        });
        if (!mounted) return;
        setConfig(res);
        if (res?.registered && res.config?.method_code) {
          setSelected(res.config.method_code);
          setNotes(res.config.notes || "");
          setEditMode(false);
        } else {
          setEditMode(true);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load configuration");
        setEditMode(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const method = selected;
      const body = { method_code: method, notes };
      const isUpdate = Boolean(config?.registered);
      const res = await apiClient<ConfigResponse>("/attendance/config", {
        method: isUpdate ? "PUT" : "POST",
        body,
        withAuth: true,
      });
      setConfig(res);
      setEditMode(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiClient("/attendance/config", { method: "DELETE", withAuth: true });
      setConfig({ registered: false, config: null });
      setEditMode(true);
    } catch (e: any) {
      setError(e?.message || "Failed to delete configuration");
    } finally {
      setSaving(false);
    }
  };

  const methodLabel = useMemo(() => {
    const found = OPTIONS.find((o) => o.key === (config?.config?.method_code || selected));
    return found?.label || config?.config?.method_code || selected;
  }, [config, selected]);

  // Access: OrgAdmin OR Employee with ATTENDCONFIG_VIEW
  const isOrgAdmin = (role || "") === "OrgAdmin";
  const canView = isOrgAdmin || hasPerm("ATTENDCONFIG_VIEW");
  if (!canView) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-accent-gradient">Attendance Configuration</h1>
        <div className="mt-4 p-4 rounded-md border bg-gray-50 text-gray-700 text-sm">You don't have permission to view attendance configuration.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-accent-gradient">Attendance Configuration</h1>
      <p className="text-sm text-gray-600 mt-1">
        Pick your team&rsquo;s attendance method. Employees with permissions can update this.
      </p>

      {loading && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="h-3 w-1/2 bg-gray-200 rounded" />
            <div className="h-24 w-full bg-gray-200 rounded" />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !editMode && config?.registered && config.config && (
        <div className="mt-6 border rounded-md p-4 bg-white ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Current Method</p>
              <p className="text-base font-semibold text-black mt-0.5">{methodLabel}</p>
              {config.config.notes && (
                <p className="text-sm text-gray-600 mt-1">Note: {config.config.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(isOrgAdmin || hasPerm("ATTENDCONFIG_EDIT")) && (
                <button
                  type="button"
                  className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg:black"
                  onClick={() => setEditMode(true)}
                >
                  Change Method
                </button>
              )}
              {(isOrgAdmin || hasPerm("ATTENDCONFIG_DELETE")) && (
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border text-sm"
                  onClick={onDelete}
                >
                  Delete Configuration
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(!loading && editMode) && (
        <div className="mt-6 border rounded-md p-4 bg-white ring-1 ring-gray-100">
          <p className="text-sm font-medium text-gray-700">Select a method</p>
          <div className="mt-3 grid grid-cols-1 gap-3">
            {OPTIONS.map((opt) => (
              <label key={opt.key} className={`flex items-start gap-3 cursor-pointer rounded-md border p-3 hover:bg-gray-50 ${selected === opt.key ? 'ring-2 ring-indigo-200 bg-indigo-50' : ''}`}>
                <input
                  type="radio"
                  name="attendance-method"
                  value={opt.key}
                  checked={selected === opt.key}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-black">{opt.label}</div>
                  <div className="text-xs text-gray-600">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Optional note</label>
            <textarea
              className="mt-1 w-full border rounded-md p-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for your team (e.g., reason or policy reference)"
            />
          </div>

          <div className="mt-4 flex gap-3">
            {(isOrgAdmin || (config?.registered ? hasPerm("ATTENDCONFIG_EDIT") : hasPerm("ATTENDCONFIG_ADD"))) && (
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-black disabled:opacity-60"
              >
                {saving ? "Saving..." : (config?.registered ? "Save Changes" : "Save Configuration")}
              </button>
            )}
            {config?.registered && (
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-3 py-2 rounded-md border text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}