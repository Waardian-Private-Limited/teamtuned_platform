"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  CheckCircle,
  AlertCircle,
  Lock,
  QrCode,
  Camera,
  MapPin,
  Save,
  Edit,
  Trash2,
  X,
  RefreshCw
} from "lucide-react";

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
    description: "Employees scan a QR, verify face, and must be inside geofence.",
    icon: [QrCode, Camera, MapPin],
    features: ["QR Code Scan", "Face Recognition", "Geofencing"]
  },
  {
    key: "qr_geofencing",
    label: "QR + Geofencing",
    description: "Employees scan a QR and must be inside geofence.",
    icon: [QrCode, MapPin],
    features: ["QR Code Scan", "Geofencing"]
  },
  {
    key: "face_geofencing",
    label: "Face Recognition + Geofencing",
    description: "Employees verify face and must be inside geofence (no QR).",
    icon: [Camera, MapPin],
    features: ["Face Recognition", "Geofencing"]
  },
  {
    key: "qr_or_face_geofencing",
    label: "QR or Face Recognition + Geofencing",
    description: "Employees can either scan QR or verify face while inside geofence.",
    icon: [QrCode, Camera, MapPin],
    features: ["QR Code OR Face Recognition", "Geofencing"]
  },
];

export default function AttendanceConfig() {
  const { role, permissions, organization, employee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [selected, setSelected] = useState<string>(OPTIONS[0].key);
  const [notes, setNotes] = useState<string>("");
  const [editMode, setEditMode] = useState<boolean>(false);

  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  const isOrgAdmin = (role || "") === "OrgAdmin";
  const canView = isOrgAdmin || hasPerm("ATTENDCONFIG_VIEW");
  const canAdd = isOrgAdmin || hasPerm("ATTENDCONFIG_ADD");
  const canEdit = isOrgAdmin || hasPerm("ATTENDCONFIG_EDIT");
  const canDelete = isOrgAdmin || hasPerm("ATTENDCONFIG_DELETE");



  useEffect(() => {
    // Fetch session to determine role and employee permissions
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          // setRole(session.role || null);
          // setPermissions(session.employee?.permissions || []);
        }
      } catch (_) { }
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
    if (!selected) {
      setError("Please select an attendance method");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

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
      setSuccess(isUpdate ? "Configuration updated successfully" : "Configuration saved successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Are you sure you want to delete this configuration? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setSuccess(null);

      await apiClient("/attendance/config", { method: "DELETE", withAuth: true });
      setConfig({ registered: false, config: null });
      setSelected(OPTIONS[0].key);
      setNotes("");
      setEditMode(true);
      setSuccess("Configuration deleted successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to delete configuration");
    } finally {
      setDeleting(false);
    }
  };

  const getMethodLabel = (key: string) => {
    const found = OPTIONS.find((o) => o.key === key);
    return found?.label || key;
  };

  const getMethodDescription = (key: string) => {
    const found = OPTIONS.find((o) => o.key === key);
    return found?.description || "";
  };

  const getMethodFeatures = (key: string) => {
    const found = OPTIONS.find((o) => o.key === key);
    return found?.features || [];
  };

  const getMethodIcons = (key: string) => {
    const found = OPTIONS.find((o) => o.key === key);
    return found?.icon || [];
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Attendance Configuration</h1>
              <p className="text-sm text-gray-600 mt-0.5">Configure attendance methods for your organization</p>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (!canView) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Attendance Configuration</h1>
              <p className="text-sm text-gray-600 mt-0.5">Configure attendance methods for your organization</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view attendance configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendance Configuration</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Configure how employees check in/out for attendance
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!editMode && config?.registered && (canEdit || canDelete) && (
              <>
                {canEdit && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={onDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                )}
              </>
            )}
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

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* View Mode */}
      {!editMode && config?.registered && config.config && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Current Configuration</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Active attendance method for your organization</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.config.status === 'active' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-700 bg-gray-50 border border-gray-200'} capitalize`}>
                {config.config.status || 'active'}
              </span>
            </div>
          </div>

          {/* Selected Method Card */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Selected Method</h3>
            <div className="border-2 border-blue-500 rounded-xl p-5 bg-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {getMethodIcons(selected).map((Icon, index) => (
                        <Icon key={index} className="w-5 h-5 text-blue-600" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{getMethodLabel(selected)}</h4>
                    <p className="text-sm text-gray-600 mt-1">{getMethodDescription(selected)}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {getMethodFeatures(selected).map((feature, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
              {config.config.notes && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{config.config.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Other Available Methods */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Available Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OPTIONS.filter(opt => opt.key !== selected).map((option) => (
                <div key={option.key} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <div className="flex items-center space-x-1">
                        {option.icon.map((Icon, index) => (
                          <Icon key={index} className="w-4 h-4 text-gray-600" />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{option.label}</h4>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {option.features.map((feature, index) => (
                          <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Metadata */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Configuration Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-gray-900">
                  {config.config.created_at ? new Date(config.config.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {config.config.updated_at ? new Date(config.config.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {editMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {config?.registered ? 'Update Configuration' : 'Configure Attendance'}
                </h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Select how employees should check in/out</p>
            </div>
            {config?.registered && (
              <button
                onClick={() => {
                  setEditMode(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Method Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select Attendance Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelected(option.key)}
                  className={`text-left p-4 border rounded-xl transition-all ${selected === option.key
                    ? 'border-2 border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${selected === option.key ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <div className="flex items-center space-x-1">
                        {option.icon.map((Icon, index) => (
                          <Icon key={index} className={`w-4 h-4 ${selected === option.key ? 'text-blue-600' : 'text-gray-600'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-semibold ${selected === option.key ? 'text-gray-900' : 'text-gray-800'}`}>
                          {option.label}
                        </h4>
                        {selected === option.key && (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {option.features.map((feature, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${selected === option.key
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Add any notes or instructions for your team..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              These notes will be visible to administrators and managers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {config?.registered && (
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setError(null);
                    setSuccess(null);
                    // Reset form to current config
                    if (config.config?.method_code) {
                      setSelected(config.config.method_code);
                      setNotes(config.config.notes || "");
                    }
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {config?.registered && (canAdd || canEdit) && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${!saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              )}
              {!config?.registered && canAdd && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${!saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Configuration State */}
      {!editMode && !config?.registered && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Configuration Set</h3>
          <p className="text-gray-500 mb-4">
            Attendance configuration is not set up yet. Configure how employees should check in/out.
          </p>
          {canAdd && (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <Settings className="w-4 h-4" />
              <span>Configure Attendance</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}