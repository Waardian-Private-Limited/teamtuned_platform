"use client";

import React from "react";
import { Settings, Clock, Save, RefreshCw, Edit } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function LaborSettingsManager() {
    const { role, permissions } = useAuth();
    const [settings, setSettings] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        day_start_time: "06:00:00",
        day_end_time: "18:00:00",
        face_match_threshold: 85,
        standard_working_hours: 8,
    });
    const [isEditing, setIsEditing] = React.useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await apiClient<{ success: boolean; settings: any }>(
                "/labor/settings",
                { method: "GET" }
            );
            if (data.settings) {
                setSettings(data.settings);
                setForm({
                    day_start_time: data.settings.day_start_time || "06:00:00",
                    day_end_time: data.settings.day_end_time || "18:00:00",
                    face_match_threshold: data.settings.face_match_threshold || 85,
                    standard_working_hours: Number(data.settings.standard_working_hours) || 8,
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient("/labor/settings", {
                method: "PUT",
                body: form,
            });
            await fetchSettings();
            setIsEditing(false);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (settings) {
            setForm({
                day_start_time: settings.day_start_time || "06:00:00",
                day_end_time: settings.day_end_time || "18:00:00",
                face_match_threshold: settings.face_match_threshold || 85,
                standard_working_hours: Number(settings.standard_working_hours) || 8,
            });
        }
        setIsEditing(false);
    };

    React.useEffect(() => {
        fetchSettings();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Labor Settings</h1>
                    <p className="text-gray-600 mt-1">Configure day/night thresholds and system settings</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Labor Settings</h1>
                    <p className="text-gray-600 mt-1">Configure day/night thresholds and system settings</p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Edit className="w-4 h-4" />
                        <span>Edit Settings</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Day/Night Shift Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Day Shift Start Time
                                </label>
                                <input
                                    type="time"
                                    disabled={!isEditing}
                                    value={form.day_start_time}
                                    onChange={(e) => setForm({ ...form, day_start_time: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? "bg-gray-50 text-gray-500" : "border-gray-300"
                                        }`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Day Shift End Time
                                </label>
                                <input
                                    type="time"
                                    disabled={!isEditing}
                                    value={form.day_end_time}
                                    onChange={(e) => setForm({ ...form, day_end_time: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? "bg-gray-50 text-gray-500" : "border-gray-300"
                                        }`}
                                />
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            Hours outside this range will be considered night shift
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Face Recognition Settings</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Face Match Threshold (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!isEditing}
                                value={form.face_match_threshold}
                                onChange={(e) => setForm({ ...form, face_match_threshold: Number(e.target.value) })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? "bg-gray-50 text-gray-500" : "border-gray-300"
                                    }`}
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                Minimum similarity score required for face recognition (default: 85%)
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculation Settings</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Standard Working Hours (Per Day)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                step="0.5"
                                disabled={!isEditing}
                                value={form.standard_working_hours}
                                onChange={(e) => setForm({ ...form, standard_working_hours: Number(e.target.value) })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? "bg-gray-50 text-gray-500" : "border-gray-300"
                                    }`}
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                Base hours for attendance calculation (default: 8 hours)
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
