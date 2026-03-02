"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, Users, FileText, Settings, Save, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface CreateMeetingFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const MEETING_TYPES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'client_meeting', label: 'Client Meeting' },
    { value: 'internal_review', label: 'Internal Review' },
    { value: 'safety_toolbox_talk', label: 'Safety / Toolbox Talk' },
];

const MEETING_MODES = [
    { value: 'in_person', label: 'In-Person' },
    { value: 'online', label: 'Online' },
    { value: 'hybrid', label: 'Hybrid' },
];

const VISIBILITY_OPTIONS = [
    { value: 'only_participants', label: 'Only participants' },
    { value: 'assigned_departments', label: 'Assigned departments' },
    { value: 'management_only', label: 'Management only' },
    { value: 'everyone_in_site', label: 'Everyone in site' },
];

const TITLE_TEMPLATES = [
    'Daily Site Review',
    'Weekly Site Review',
    'Safety Meeting',
    'Vendor Coordination',
    'Internal Review',
    'Monthly Progress Review',
    'Emergency Meeting',
];

export default function CreateMeetingForm({ isOpen, onClose, onSuccess }: CreateMeetingFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sites, setSites] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        title: '',
        meeting_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().slice(0, 5),
        end_time: '',
        site_ids: [] as number[], // Changed from site_id to site_ids array
        meeting_type: 'daily',
        meeting_mode: 'in_person',
        agenda: '',
        participants: {
            employees: [] as number[],
            departments: [] as number[],
            external: [] as string[],
        },
        require_acknowledgment: true,
        visibility: 'only_participants',
    });

    const [externalParticipant, setExternalParticipant] = useState('');

    // Filter employees based on selected departments and search term
    const filteredEmployees = employees.filter(emp => {
        // If departments are selected, only show employees from those departments
        if (formData.participants.departments.length > 0) {
            if (!formData.participants.departments.includes(emp.department_id)) {
                return false;
            }
        }

        // Apply search filter
        if (employeeSearchTerm) {
            const searchLower = employeeSearchTerm.toLowerCase();
            const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
            const designation = (emp.designation || '').toLowerCase();
            return fullName.includes(searchLower) || designation.includes(searchLower);
        }

        return true;
    });

    useEffect(() => {
        if (isOpen) {
            fetchSites();
            fetchEmployees();
            fetchDepartments();
        }
    }, [isOpen]);

    const fetchSites = async () => {
        try {
            const data = await apiClient<any>('/sites', { method: 'GET', withAuth: true });
            // Handle both array response and object with sites property
            if (Array.isArray(data)) {
                setSites(data);
            } else if (data && Array.isArray(data.sites)) {
                setSites(data.sites);
            } else {
                setSites([]);
            }
        } catch (err) {
            console.error('Failed to fetch sites:', err);
            setSites([]);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await apiClient<any>('/organization/employees', { method: 'GET', withAuth: true });
            // Handle both array response and object with employees property
            if (Array.isArray(data)) {
                setEmployees(data);
            } else if (data && Array.isArray(data.employees)) {
                setEmployees(data.employees);
            } else {
                setEmployees([]);
            }
        } catch (err) {
            console.error('Failed to fetch employees:', err);
            setEmployees([]);
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await apiClient<any>('/organization/departments', { method: 'GET', withAuth: true });
            // Handle both array response and object with departments property
            if (Array.isArray(data)) {
                setDepartments(data);
            } else if (data && Array.isArray(data.departments)) {
                setDepartments(data.departments);
            } else {
                setDepartments([]);
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err);
            setDepartments([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate at least one site is selected
        if (formData.site_ids.length === 0) {
            setError('Please select at least one site/project');
            return;
        }

        setLoading(true);

        try {
            await apiClient('/meetings', {
                method: 'POST',
                withAuth: true,
                body: formData,
            });

            onSuccess?.();
            onClose();
            resetForm();
        } catch (err: any) {
            console.error('Failed to create meeting:', err);
            setError(err?.message || 'Failed to create meeting');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            meeting_date: new Date().toISOString().split('T')[0],
            start_time: new Date().toTimeString().slice(0, 5),
            end_time: '',
            site_ids: [],
            meeting_type: 'daily',
            meeting_mode: 'in_person',
            agenda: '',
            participants: {
                employees: [],
                departments: [],
                external: [],
            },
            require_acknowledgment: true,
            visibility: 'only_participants',
        });
        setExternalParticipant('');
        setError(null);
    };

    const handleTitleSelect = (template: string) => {
        setFormData({ ...formData, title: template });
        setShowTitleSuggestions(false);
    };

    const addExternalParticipant = () => {
        if (externalParticipant.trim()) {
            setFormData({
                ...formData,
                participants: {
                    ...formData.participants,
                    external: [...formData.participants.external, externalParticipant.trim()],
                },
            });
            setExternalParticipant('');
        }
    };

    const removeExternalParticipant = (index: number) => {
        setFormData({
            ...formData,
            participants: {
                ...formData.participants,
                external: formData.participants.external.filter((_, i) => i !== index),
            },
        });
    };

    const toggleEmployee = (empId: number) => {
        const current = formData.participants.employees;
        setFormData({
            ...formData,
            participants: {
                ...formData.participants,
                employees: current.includes(empId)
                    ? current.filter(id => id !== empId)
                    : [...current, empId],
            },
        });
    };

    const toggleDepartment = (deptId: number) => {
        const current = formData.participants.departments;
        setFormData({
            ...formData,
            participants: {
                ...formData.participants,
                departments: current.includes(deptId)
                    ? current.filter(id => id !== deptId)
                    : [...current, deptId],
            },
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0  flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Create Meeting</h2>
                            <p className="text-sm text-gray-600">Schedule a new meeting</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* SECTION 1: BASIC MEETING INFO */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                <Calendar size={16} />
                                <span>Basic Meeting Info</span>
                            </div>

                            {/* Meeting Title */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meeting Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    onFocus={() => setShowTitleSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                    placeholder="Eg: Weekly Site Review – Tower A"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                                />
                                {showTitleSuggestions && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {TITLE_TEMPLATES.map((template) => (
                                            <button
                                                key={template}
                                                type="button"
                                                onClick={() => handleTitleSelect(template)}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                                            >
                                                {template}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Date and Time */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.meeting_date}
                                        onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Time <span className="text-gray-400 text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                                    />
                                </div>
                            </div>

                            {/* Site and Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Site / Project <span className="text-red-500">*</span>
                                    </label>
                                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={formData.site_ids.includes(0)}
                                                onChange={() => {
                                                    const newSiteIds = formData.site_ids.includes(0)
                                                        ? formData.site_ids.filter(id => id !== 0)
                                                        : [...formData.site_ids, 0];
                                                    setFormData({ ...formData, site_ids: newSiteIds });
                                                }}
                                                className="w-4 h-4 text-black focus:ring-black rounded"
                                            />
                                            <span className="text-sm text-gray-700">Office / Head Office</span>
                                        </label>
                                        {sites.map((site) => (
                                            <label key={site.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.site_ids.includes(site.id)}
                                                    onChange={() => {
                                                        const newSiteIds = formData.site_ids.includes(site.id)
                                                            ? formData.site_ids.filter(id => id !== site.id)
                                                            : [...formData.site_ids, site.id];
                                                        setFormData({ ...formData, site_ids: newSiteIds });
                                                    }}
                                                    className="w-4 h-4 text-black focus:ring-black rounded"
                                                />
                                                <span className="text-sm text-gray-700">{site.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {formData.site_ids.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">At least one site is required</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Meeting Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.meeting_type}
                                        onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                                    >
                                        {MEETING_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: PARTICIPANTS */}
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                <Users size={16} />
                                <span>Participants (Optional)</span>
                            </div>

                            {/* Info Note */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Participants can be added later and assigned to specific points in the meeting minutes.
                                </p>
                            </div>

                            {/* Meeting Mode */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meeting Mode
                                </label>
                                <div className="flex gap-3">
                                    {MEETING_MODES.map((mode) => (
                                        <label key={mode.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="meeting_mode"
                                                value={mode.value}
                                                checked={formData.meeting_mode === mode.value}
                                                onChange={(e) => setFormData({ ...formData, meeting_mode: e.target.value })}
                                                className="w-4 h-4 text-black focus:ring-black"
                                            />
                                            <span className="text-sm text-gray-700">{mode.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Departments - FIRST */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    1. Select Departments
                                </label>
                                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                                    {departments.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-2">No departments available</p>
                                    ) : (
                                        departments.map((dept) => (
                                            <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.participants.departments.includes(dept.id)}
                                                    onChange={() => toggleDepartment(dept.id)}
                                                    className="w-4 h-4 text-black focus:ring-black rounded"
                                                />
                                                <span className="text-sm text-gray-700">{dept.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Employees - SECOND (filtered by departments) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    2. Select Employees
                                    {formData.participants.departments.length > 0 && (
                                        <span className="text-xs text-gray-500 ml-2">
                                            (from selected departments)
                                        </span>
                                    )}
                                </label>

                                {/* Search Bar */}
                                <div className="relative mb-2">
                                    <input
                                        type="text"
                                        placeholder="Search employees by name or designation..."
                                        value={employeeSearchTerm}
                                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                                    />
                                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>

                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                                    {filteredEmployees.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            {formData.participants.departments.length === 0
                                                ? "Select departments first to see employees"
                                                : employeeSearchTerm
                                                    ? "No employees match your search"
                                                    : "No employees in selected departments"}
                                        </p>
                                    ) : (
                                        filteredEmployees.map((emp) => (
                                            <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.participants.employees.includes(emp.id)}
                                                    onChange={() => toggleEmployee(emp.id)}
                                                    className="w-4 h-4 text-black focus:ring-black rounded"
                                                />
                                                <span className="text-sm text-gray-700">
                                                    {emp.first_name} {emp.last_name} {emp.designation && `(${emp.designation})`}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                {filteredEmployees.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Showing {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>

                            {/* External Participants */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    3. External Participants
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={externalParticipant}
                                        onChange={(e) => setExternalParticipant(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExternalParticipant())}
                                        placeholder="Enter name and press Enter"
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={addExternalParticipant}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {formData.participants.external.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {formData.participants.external.map((name, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                                            >
                                                {name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeExternalParticipant(index)}
                                                    className="hover:text-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECTION 3: CONTEXT */}
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                <FileText size={16} />
                                <span>Context (Optional)</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Agenda / Context
                                </label>
                                <textarea
                                    value={formData.agenda}
                                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                                    placeholder="Discuss progress, delays, safety issues and next steps"
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
                                />
                            </div>
                        </div>

                        {/* SECTION 4: SETTINGS */}
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                                <Settings size={16} />
                                <span>Settings</span>
                            </div>

                            {/* Acknowledgment Required */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="block font-medium text-gray-900">Require Acknowledgment</span>
                                        <span className="text-sm text-gray-500">Participants must acknowledge each point</span>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.require_acknowledgment}
                                            onChange={(e) => setFormData({ ...formData, require_acknowledgment: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 focus:ring-4 focus:ring-black/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed font-medium shadow-sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Create Meeting
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
