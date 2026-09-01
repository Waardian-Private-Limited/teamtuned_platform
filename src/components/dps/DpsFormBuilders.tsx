"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Search, UploadCloud, ChevronRight, Check, ArrowLeft, Save, Plus, Trash2, AlertCircle, Building, User, MessageSquare, X, Paperclip, Image, Lock, Sparkles, UserCheck, Info, Wrench, Layers, HardHat, Users, CalendarClock, ListChecks } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import {
    Section, ToolButton, Metric, EmptyRow,
    inputCls, numCls, headCls, fmt
} from './DpsUi';
import { DeploymentSection, fillFromAttendance } from './DpsDeploymentSection';
import { ScheduleTargets } from './DpsScheduleTargets';
import { EquipmentSection, MaterialsSection, IssuesSection } from './DpsTrackedSections';
import toast from 'react-hot-toast';

export interface DynamicAssignment {
    id: number;
    site_id: number;
    site_name: string;
    unit_id: number;
    unit_name: string;
    schedule_id: number;
    form_type: 'planning' | 'cbd';
    assigned_to: number;
    first_name?: string;
    last_name?: string;
    due_date: string;
    /** The day the report covers — the day before it was raised. */
    report_date?: string | null;
    status: 'pending' | 'submitted' | 'reviewed';
    dynamic_schema: any;
    submitted_data: any;
    created_at: string;
    updated_at: string;
    is_monthly?: boolean;
    scope?: string;
    /** Current assignee group for this site+form type, resolved live from site
     *  config — so a change there applies to already-generated forms. */
    assignees?: { employee_id: number; employee_name: string }[];
    reviewers?: { employee_id: number; employee_name: string }[];
    is_shared?: boolean;
    can_fill?: boolean;
    /** Last day a submitted report may still be corrected (the day it was due). */
    editable_until?: string | null;
    can_edit_submitted?: boolean;
    edit_count?: number;
    last_edited_at?: string | null;
    submitted_by?: number | null;
}

export const formatDate = (dateString: string) => {
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
};

export const EmployeeSearchInput = ({ value, onChange, readonly }: { value: any, onChange: (val: any) => void, readonly?: boolean }) => {
    const [searchTerm, setSearchTerm] = useState(value?.name || "");
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const debouncedSearch = useRef<any>(null);

    useEffect(() => {
        if (value?.name) setSearchTerm(value.name);
    }, [value]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (!term || term.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
        debouncedSearch.current = setTimeout(async () => {
            try {
                const res = await apiClient<any>(`/organization/employees?format=paginated&search=${encodeURIComponent(term)}&limit=10&status=active`, {
                    method: "GET",
                    withAuth: true
                });
                setResults(res?.data || []);
                setIsOpen(true);
            } catch { }
        }, 300);
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                readOnly={readonly}
                className="p-2 border border-blue-100 outline-none text-sm w-full bg-blue-50/50 focus:border-blue-400 font-bold text-gray-700"
            />
            {isOpen && !readonly && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 max-h-48 overflow-y-auto">
                    {results.map(r => (
                        <div
                            key={r.id}
                            className="p-3 text-sm cursor-pointer border-b last:border-0 border-gray-100 hover:bg-blue-50 transition-colors"
                            onClick={() => {
                                const name = `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email;
                                setSearchTerm(name);
                                onChange({ id: r.id, name });
                                setIsOpen(false);
                            }}
                        >
                            <div className="font-bold text-gray-800">{r.first_name} {r.last_name}</div>
                            {r.designation && <div className="text-xs text-gray-500 font-medium">{r.designation}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// -------------------------------------------------------------
// Form Builders for Execution (Planning) and CBD Types
// -------------------------------------------------------------

export function ExecutionFormBuilder({ data, setData, readonly }: { data: any, setData: any, readonly: boolean }) {
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        apiClient<any>('/organization/departments', { method: 'GET', withAuth: true })
            .then(res => setDepartments(Array.isArray(res) ? res : (res?.departments || [])))
            .catch(() => { });
    }, []);

    const UserSearchInput = ({ value, onChange, readonly }: { value: any, onChange: (val: any) => void, readonly: boolean }) => {
        const selectedUsers = Array.isArray(value) ? value : (value ? [value] : []);
        const [searchTerm, setSearchTerm] = useState("");
        const [isOpen, setIsOpen] = useState(false);
        const [results, setResults] = useState<any[]>([]);

        const debouncedSearch = useRef<any>(null);

        const handleSearch = (term: string) => {
            setSearchTerm(term);
            if (!term || term.length < 2) {
                setResults([]);
                setIsOpen(false);
                return;
            }
            if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
            debouncedSearch.current = setTimeout(async () => {
                try {
                    const res = await apiClient<any>(`/organization/employees?format=paginated&search=${encodeURIComponent(term)}&limit=10&status=active`, {
                        method: "GET",
                        withAuth: true
                    });
                    setResults(res?.data || []);
                    setIsOpen(true);
                } catch { }
            }, 300);
        };

        return (
            <div className="relative flex-1 min-w-[200px]">
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map((u: any) => (
                        <span key={u.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 border border-blue-100">
                            {u.name}
                            {!readonly && (
                                <button onClick={() => onChange(selectedUsers.filter((user: any) => user.id !== u.id))} className="text-blue-500 hover:text-blue-800 focus:outline-none">✕</button>
                            )}
                        </span>
                    ))}
                </div>
                {!readonly && (
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={e => handleSearch(e.target.value)}
                        onFocus={() => { if (searchTerm.length >= 2) setIsOpen(true); }}
                        className="w-full p-2 border border-gray-200 focus:outline-none focus:border-blue-500 text-sm"
                    />
                )}
                {isOpen && !readonly && results.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 max-h-48 overflow-y-auto">
                        {results.map(r => {
                            const isSelected = selectedUsers.some((u: any) => u.id === r.id);
                            return (
                                <div
                                    key={r.id}
                                    className={`p-2 text-sm cursor-pointer border-b last:border-0 border-gray-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onClick={() => {
                                        if (isSelected) {
                                            onChange(selectedUsers.filter((u: any) => u.id !== r.id));
                                        } else {
                                            onChange([...selectedUsers, { id: r.id, name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email }]);
                                        }
                                        setSearchTerm("");
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="font-bold flex items-center justify-between">
                                        <span>{`${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email}</span>
                                        {isSelected && <span className="text-blue-600">✓</span>}
                                    </div>
                                    <div className="text-xs text-gray-500">{r.designation || r.role || 'Employee'}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (!data) return null;

    const updateNested = (category: string, index: number, field: string, value: any) => {
        if (readonly) return;
        const copy = { ...data };
        copy[category][index][field] = value;
        setData(copy);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            {/* Concrete */}
            {data.concrete_planning && (
                <div className="bg-white p-6 border border-slate-200 space-y-5">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        Concrete Progress
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center bg-slate-50/80 p-5 border border-slate-200/60">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Planned (Cum)</span>
                            <span className="font-bold text-slate-800 text-lg">{data.concrete_planning.planned_total || 0} CUM</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-blue-500 uppercase tracking-widest">Validity Achieved</span>
                            <span className="font-bold text-blue-700 text-lg">{data.concrete_planning.validity_achieved || 0} CUM</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">Total Site Achieved</span>
                            <span className="font-bold text-indigo-700 text-lg">{data.concrete_planning.total_site_achieved || 0} CUM</span>
                        </div>
                        <div className="relative">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">Achieved Today <span className="text-red-500">*</span></span>
                            <input
                                type="number"
                                min="0"
                                readOnly={readonly}
                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                value={data.concrete_planning.achieved_total ?? ''}
                                onChange={(e) => {
                                    if (readonly) return;
                                    setData({ ...data, concrete_planning: { ...data.concrete_planning, achieved_total: Math.max(0, parseFloat(e.target.value) || 0) } });
                                }}
                                className="p-2.5 w-full bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all" placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Deployment */}
            <div className="bg-white p-6 border border-slate-200 space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Staff Deployment <span className="text-sm font-semibold text-slate-400 normal-case tracking-normal">(Actual vs Planned)</span></h2>
                <div className="space-y-2">
                    {data.staff?.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col gap-2 py-4 px-4 bg-slate-50/50 border border-slate-100">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm text-slate-800">{item.role || item.designation}</span>
                                {item.towerId && item.towerId !== 'Overall' && <span className="text-xs font-semibold px-2 py-1 bg-slate-200/50 text-slate-600">Loc: {item.towerId}</span>}
                            </div>
                            <div className={`grid ${readonly ? 'grid-cols-[1fr_100px_120px]' : 'grid-cols-[1fr_120px]'} gap-4 items-center mt-1`}>
                                <span className="text-sm text-slate-500 font-medium flex items-center gap-2">Planned: <span className="font-bold text-slate-700 bg-white px-3 py-1.5 border border-slate-200 block text-center min-w-[60px]">{item.planned}</span></span>
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        min="0"
                                        readOnly={readonly}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        placeholder="Actual" value={item.actual ?? ''}
                                        onChange={e => updateNested('staff', i, 'actual', Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`p-2 w-full bg-white border border-slate-300 outline-none text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold ${!readonly && 'pr-6'} transition-all`}
                                    />
                                    {!readonly && <span className="text-red-500 absolute font-bold top-1/2 -translate-y-1/2 right-2.5">*</span>}
                                </div>
                                {readonly && (
                                    <div className="flex flex-col gap-0.5 mt-[-4px]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Variance</span>
                                        <span className={`px-3 py-1.5 border font-bold text-center text-sm ${((item.actual || 0) - (item.planned || 0)) < 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                            {((item.actual || 0) - (item.planned || 0)) > 0 ? '+' : ''}{((item.actual || 0) - (item.planned || 0))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Labour Deployment */}
            <div className="bg-white p-6 border border-slate-200 space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Labour Deployment <span className="text-sm font-semibold text-slate-400 normal-case tracking-normal">(Actual vs Planned)</span></h2>
                <div className="space-y-2">
                    {data.labor?.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col gap-2 py-4 px-4 bg-slate-50/50 border border-slate-100">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm text-slate-800">{item.type || item.name}</span>
                                {item.towerId && item.towerId !== 'Overall' && <span className="text-xs font-semibold px-2 py-1 bg-slate-200/50 text-slate-600">Loc: {item.towerId}</span>}
                            </div>
                            <div className={`grid ${readonly ? 'grid-cols-[1fr_100px_120px]' : 'grid-cols-[1fr_120px]'} gap-4 items-center mt-1`}>
                                <span className="text-sm text-slate-500 font-medium flex items-center gap-2">Planned: <span className="font-bold text-slate-700 bg-white px-3 py-1.5 border border-slate-200 block text-center min-w-[60px]">{item.planned}</span></span>
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        min="0"
                                        readOnly={readonly}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        placeholder="Actual" value={item.actual ?? ''}
                                        onChange={e => updateNested('labor', i, 'actual', Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`p-2 w-full bg-white border border-slate-300 outline-none text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold ${!readonly && 'pr-6'} transition-all`}
                                    />
                                    {!readonly && <span className="text-red-500 absolute font-bold top-1/2 -translate-y-1/2 right-2.5">*</span>}
                                </div>
                                {readonly && (
                                    <div className="flex flex-col gap-0.5 mt-[-4px]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Variance</span>
                                        <span className={`px-3 py-1.5 border font-bold text-center text-sm ${((item.actual || 0) - (item.planned || 0)) < 0 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                            {((item.actual || 0) - (item.planned || 0)) > 0 ? '+' : ''}{((item.actual || 0) - (item.planned || 0))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Monthly Schedule Target Dates Achieved */}
            {data.monthly_schedule_today?.length > 0 && (
                <div className="bg-white p-6 border border-slate-200 space-y-5 transition-colors">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Monthly Schedule Target Dates</h2>
                    <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 font-bold text-xs text-slate-500 uppercase tracking-widest px-2">
                        <div>Tower Name</div>
                        <div>Floor / Subzone</div>
                        <div>Target Date</div>
                        <div>Achieved Date</div>
                    </div>
                    {data.monthly_schedule_today.map((item: any, i: number) => {
                        let displayName = item.tower_name || 'Site';
                        if (displayName.startsWith('TWR-')) {
                            const foundTower = data.safety_quality?.towers?.find((t: any) => t.id === displayName);
                            if (foundTower) displayName = foundTower.name;
                        }
                        return (
                            <div key={i} className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 items-center p-4 border ${item.achieved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200'} hover:border-blue-200 transition-colors`}>
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-sm text-slate-800">{displayName}</span>
                                    {item.achieved && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-100/50 w-fit px-2 py-0.5">Already Achieved</span>}
                                </div>
                                <span className="text-slate-600 text-sm font-semibold">{item.floor} {item.purpose && <span className="text-slate-400 font-medium ml-1">({item.purpose})</span>}</span>
                                <span className="text-blue-600 font-bold text-sm">{item.planned_target_date}</span>
                                <input
                                    type="date"
                                    value={item.achieved_date || ''}
                                    readOnly={readonly}
                                    onChange={e => {
                                        const copy = { ...data };
                                        copy.monthly_schedule_today[i].achieved_date = e.target.value;
                                        copy.monthly_schedule_today[i].achieved = !!e.target.value;
                                        setData(copy);
                                    }}
                                    className="p-2 bg-white border border-slate-300 outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Equipments Tracker Section */}
            {data.equipments?.length > 0 && (
                <div className="bg-white p-6 border border-slate-200 space-y-5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Equipments Status</h2>
                    </div>
                    <div className="grid grid-cols-[1.5fr_1fr_100px_100px] gap-4 font-bold text-xs text-slate-500 uppercase tracking-widest px-4">
                        <div>Equipment Type</div>
                        <div>Tower/Area</div>
                        <div className="text-center">Req</div>
                        <div className="text-center">Actual <span className="text-red-500">*</span></div>
                    </div>
                    <div className="space-y-2">
                        {data.equipments.map((eq: any, i: number) => (
                            <div key={i} className="grid grid-cols-[1.5fr_1fr_100px_100px] gap-4 items-center bg-slate-50/50 p-4 border border-slate-100">
                                <div className="font-bold text-sm text-slate-900">{eq.type}</div>
                                <div className="text-xs font-semibold px-2 py-1 bg-slate-200/50 text-slate-600 w-fit">Overall</div>
                                <div className="text-center font-bold text-blue-600 bg-white px-2 py-1.5 border border-slate-200">{eq.planned || 0}</div>
                                <input
                                    type="number"
                                    min="0"
                                    readOnly={readonly}
                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                    value={eq.actual ?? ''}
                                    placeholder="0"
                                    onChange={e => updateNested('equipments', i, 'actual', Math.max(0, parseInt(e.target.value) || 0))}
                                    className="p-2 w-full bg-white border border-slate-300 outline-none text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-center font-bold transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Material Procurement Tracking */}
            {data.priority_materials && (
                <div className="bg-white p-6 border border-slate-200 space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Priority Material Tracking</h2>
                        {!readonly && (
                            <button onClick={() => {
                                const arr = [...(data.priority_materials || [])];
                                arr.push({ name: '', intent_no_date: '', quantity: '', requiredDate: '', status: 'Pending' });
                                setData({ ...data, priority_materials: arr });
                            }} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 font-bold flex items-center gap-1 transition-colors text-sm">+ Add Material</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {data.priority_materials.map((mat: any, i: number) => (
                            <div key={i} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-50/50 p-4 border border-slate-100">
                                <input type="text" placeholder="Material Name" value={mat.name || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'name', e.target.value)} className="p-2 border border-slate-300 outline-none text-sm font-bold bg-white w-full md:w-auto flex-1 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                                <input type="text" placeholder="Intent No & Date" value={mat.intent_no_date || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'intent_no_date', e.target.value)} className="p-2 border border-slate-300 outline-none text-sm bg-white w-full md:w-auto flex-[0.8] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                                <input type="text" placeholder="Units / Qty" value={mat.quantity || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'quantity', e.target.value)} className="p-2 border border-slate-300 outline-none text-sm bg-white w-full md:w-auto flex-[0.8] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                                <input type="date" value={mat.requiredDate || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'requiredDate', e.target.value)} className="p-2 border border-slate-300 outline-none text-sm bg-white w-full md:max-w-[150px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" />
                                {!readonly && (
                                    <button onClick={() => {
                                        const copy = { ...data };
                                        copy.priority_materials.splice(i, 1);
                                        setData(copy);
                                    }} className="text-red-500 bg-red-50 hover:bg-red-100 p-2 transition-colors self-end md:self-auto ml-auto md:ml-0"><span className="font-bold text-lg leading-none">&times;</span></button>
                                )}
                            </div>
                        ))}
                        {(!data.priority_materials || data.priority_materials.length === 0) && (
                            <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200">No materials added.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Other Issues */}
            {data.other_issues && (
                <div className="bg-white p-6 border border-slate-200 space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Other Issues Tracking</h2>
                        {!readonly && (
                            <button onClick={() => {
                                const arr = [...(data.other_issues || [])];
                                arr.push({ department: '', issue_type: '', description: '', responsible: [], daily_remark: '', status: 'Open' });
                                setData({ ...data, other_issues: arr });
                            }} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-1.5 font-bold flex items-center gap-1 transition-colors text-sm">+ Add Issue</button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {data.other_issues.map((issue: any, i: number) => (
                            <div key={i} className="flex flex-col gap-4 bg-slate-50/50 p-5 border border-slate-100">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <select disabled={readonly} value={issue.department || ''} onChange={e => updateNested('other_issues', i, 'department', e.target.value)} className="p-2 border border-slate-300 outline-none text-sm bg-white flex-1 min-w-[150px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium">
                                        <option value="">Select Dept</option>
                                        {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                    <select disabled={readonly} value={issue.issue_type || ''} onChange={e => updateNested('other_issues', i, 'issue_type', e.target.value)} className="p-2 border border-slate-300 outline-none text-sm bg-white flex-1 min-w-[150px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium">
                                        <option value="">Select Issue Type</option>
                                        {['Execution', 'Store', 'Purchase', 'Safety', 'Quality', 'HR', 'Steel Yard', 'Other'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <select disabled={readonly} value={issue.status || 'Open'} onChange={e => updateNested('other_issues', i, 'status', e.target.value)} className={`p-2 border outline-none text-xs font-bold w-[100px] text-center focus:ring-2 focus:ring-offset-1 ${issue.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 focus:ring-emerald-500' : 'bg-orange-100 text-orange-800 border-orange-200 focus:ring-orange-500'}`}>
                                        <option value="Open">OPEN</option>
                                        <option value="Closed">CLOSED</option>
                                    </select>
                                    <UserSearchInput readonly={readonly} value={issue.responsible} onChange={(val) => updateNested('other_issues', i, 'responsible', val)} />
                                    {!readonly && (
                                        <button onClick={() => {
                                            const copy = { ...data };
                                            copy.other_issues.splice(i, 1);
                                            setData(copy);
                                        }} className="text-red-500 bg-red-50 hover:bg-red-100 p-2 transition-colors ml-auto md:ml-0"><span className="font-bold text-lg leading-none">&times;</span></button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <input type="text" placeholder="Issue Description" value={issue.description || ''} readOnly={readonly} onChange={e => updateNested('other_issues', i, 'description', e.target.value)} className="p-2.5 border border-slate-300 outline-none text-sm bg-white flex-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold" />
                                    <input type="text" placeholder="Daily remark or update..." value={issue.daily_remark || ''} readOnly={readonly} onChange={e => updateNested('other_issues', i, 'daily_remark', e.target.value)} className="p-2.5 border border-slate-300 outline-none text-sm bg-white flex-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                                </div>
                            </div>
                        ))}
                        {(!data.other_issues || data.other_issues.length === 0) && (
                            <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200">No issues tracked.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Quality Action Items */}
            <div className="bg-white p-6 border border-slate-200 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Quality Action Items (NCs)</h2>
                </div>

                {data.safety_quality && (
                    <div className="grid grid-cols-1 gap-6">
                        {['client_nc', 'empire_nc'].map((ncType) => (
                            <div key={ncType} className="space-y-4 bg-slate-50/50 p-5 border border-slate-100">
                                <div className="font-bold text-slate-700 uppercase tracking-widest text-xs flex justify-between items-center bg-white p-3 border border-slate-200">
                                    <span>{ncType === 'client_nc' ? 'Client Quality NC' : 'Empire Quality NC'}</span>
                                    {!readonly && (
                                        <button onClick={() => {
                                            const arr = [...(data.safety_quality[ncType] || [])];
                                            arr.push({ towerId: '', issue: '', total_closed: '' });
                                            setData({ ...data, safety_quality: { ...data.safety_quality, [ncType]: arr } });
                                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-3 py-1 font-bold flex items-center gap-1 transition-colors">+ Add NC</button>
                                    )}
                                </div>
                                <div className="grid grid-cols-[1.5fr_2fr_100px_100px_auto] gap-3 font-bold text-xs text-slate-500 uppercase tracking-widest px-2 mb-1">
                                    <div>Location</div>
                                    <div>Observation</div>
                                    <div className="text-center">Total</div>
                                    <div className="text-center">Close</div>
                                    <div></div>
                                </div>
                                {(data.safety_quality[ncType] || []).map((item: any, i: number) => (
                                    <div key={i} className="grid grid-cols-[1.5fr_2fr_100px_100px_auto] gap-3 items-center">
                                        <select value={item.towerId || ''} disabled={readonly} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].towerId = e.target.value;
                                            setData(copy);
                                        }} className="p-2 outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white border border-slate-300 font-medium">
                                            <option value="">Select Location</option>
                                            {data.safety_quality.towers?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="text" value={item.issue || ''} readOnly={readonly} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].issue = e.target.value;
                                            setData(copy);
                                        }} placeholder="Observation details..." className="p-2 border border-slate-300 outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold" />
                                        <input type="number" min="0" value={item.total_count || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_count = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 outline-none text-sm bg-white focus:border-orange-500 text-center font-bold text-orange-600 focus:ring-2 focus:ring-orange-500/20" />
                                        <input type="number" min="0" value={item.total_closed || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_closed = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 outline-none text-sm bg-white focus:border-emerald-500 text-center font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20" />
                                        <select disabled={readonly} value={item.status || 'Open'} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].status = e.target.value;
                                            setData(copy);
                                        }} className={`p-1.5 border outline-none text-xs font-bold text-center ${item.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                                            <option value="Open">OPEN</option>
                                            <option value="Closed">CLOSED</option>
                                        </select>
                                        {!readonly && (
                                            <button onClick={() => {
                                                const copy = { ...data };
                                                copy.safety_quality[ncType].splice(i, 1);
                                                setData(copy);
                                            }} className="text-red-500 bg-red-50 hover:bg-red-100 p-1.5 transition-colors"><span className="font-bold text-lg leading-none block px-1">&times;</span></button>
                                        )}
                                    </div>
                                ))}
                                {(!data.safety_quality[ncType] || data.safety_quality[ncType].length === 0) && (
                                    <div className="text-slate-400 text-sm font-medium py-3 text-center border border-dashed border-slate-200 bg-white/50">No NC items logged.</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Safety Action Items */}
            <div className="bg-white p-6 border border-slate-200 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Safety Action Items</h2>
                </div>

                {data.safety_quality && (
                    <div className="grid grid-cols-1 gap-6">
                        {['client_safety', 'empire_safety'].map((ncType) => (
                            <div key={ncType} className="space-y-4 bg-slate-50/50 p-5 border border-slate-100">
                                <div className="font-bold text-slate-700 uppercase tracking-widest text-xs flex justify-between items-center bg-white p-3 border border-slate-200">
                                    <span>{ncType === 'client_safety' ? 'Client Safety' : 'Empire Safety'}</span>
                                    {!readonly && (
                                        <button onClick={() => {
                                            const arr = [...(data.safety_quality[ncType] || [])];
                                            arr.push({ towerId: '', issue: '', total_count: '', total_closed: '' });
                                            setData({ ...data, safety_quality: { ...data.safety_quality, [ncType]: arr } });
                                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-3 py-1 font-bold flex items-center gap-1 transition-colors">+ Add Item</button>
                                    )}
                                </div>
                                <div className="grid grid-cols-[1fr_1.5fr_80px_80px_80px_auto] gap-3 font-bold text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-1">
                                    <div>Location</div>
                                    <div>Observation</div>
                                    <div className="text-center">Total</div>
                                    <div className="text-center">Close</div>
                                    <div className="text-center">Status</div>
                                    <div></div>
                                </div>
                                {(data.safety_quality[ncType] || []).map((item: any, i: number) => (
                                    <div key={i} className="grid grid-cols-[1fr_1.5fr_80px_80px_80px_auto] gap-3 items-center">
                                        <select value={item.towerId || ''} disabled={readonly} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].towerId = e.target.value;
                                            setData(copy);
                                        }} className="p-2 outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white border border-slate-300 font-medium">
                                            <option value="">Select Location</option>
                                            {data.safety_quality.towers?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="text" value={item.issue || ''} readOnly={readonly} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].issue = e.target.value;
                                            setData(copy);
                                        }} placeholder="Observation details..." className="p-2 border border-slate-300 outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold" />
                                        <input type="number" min="0" value={item.total_count || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_count = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 outline-none text-sm bg-white focus:border-orange-500 text-center font-bold text-orange-600 focus:ring-2 focus:ring-orange-500/20" />
                                        <input type="number" min="0" value={item.total_closed || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_closed = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 outline-none text-sm bg-white focus:border-emerald-500 text-center font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20" />
                                        <select disabled={readonly} value={item.status || 'Open'} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].status = e.target.value;
                                            setData(copy);
                                        }} className={`p-1.5 border outline-none text-[10px] font-bold text-center ${item.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                                            <option value="Open">OPEN</option>
                                            <option value="Closed">CLOSED</option>
                                        </select>
                                        {!readonly && (
                                            <button onClick={() => {
                                                const copy = { ...data };
                                                copy.safety_quality[ncType].splice(i, 1);
                                                setData(copy);
                                            }} className="text-red-500 bg-red-50 hover:bg-red-100 p-1.5 transition-colors"><span className="font-bold text-lg leading-none block px-1">&times;</span></button>
                                        )}
                                    </div>
                                ))}
                                {(!data.safety_quality[ncType] || data.safety_quality[ncType].length === 0) && (
                                    <div className="text-slate-400 text-sm font-medium py-3 text-center border border-dashed border-slate-200 bg-white/50">No safety issues logged.</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function FileInput({ value, onChange, readonly }: { value: any[], onChange: (files: any[]) => void, readonly: boolean }) {
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploading(true);
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
            const response = await apiClient<any>('/files/org-upload/dpr_attachments', {
                method: 'POST',
                withAuth: true,
                body: formData
            });
            const uploadedFiles = (response.files || []).map((f: any) => ({
                file_name: f.originalname || f.file_name,
                file_url: f.location || f.file_url,
            }));
            onChange([...(value || []), ...uploadedFiles]);
        } catch (err) {
            console.error("File upload error:", err);
            alert("Failed to upload files");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full mt-2">
            {!readonly && (
                <label className="flex items-center justify-center border-2 border-dashed border-gray-300 p-2 cursor-pointer hover:border-blue-500 transition-colors w-full bg-white">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <UploadCloud size={16} /> {uploading ? "Uploading..." : "Attach File"}
                    </span>
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading || readonly} />
                </label>
            )}
            {(value || []).length > 0 && (
                <div className="flex flex-col gap-1">
                    {value.map((f: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-gray-50 p-2 border border-blue-100 text-blue-800">
                            <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px] font-bold block" title={f.file_name}>{f.file_name}</a>
                            {!readonly && (
                                <button onClick={() => onChange(value.filter((_: any, idx: number) => idx !== i))} className="text-red-500 ml-2 font-bold px-2 hover:bg-red-50">✕</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function VendorSearchInput({ siteId, value, onChange, readonly }: { siteId: number, value: any, onChange: (val: any) => void, readonly: boolean }) {
    const [searchTerm, setSearchTerm] = useState(value || "");
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const debouncedSearch = useRef<any>(null);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        onChange(term);
        if (!term || term.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
        debouncedSearch.current = setTimeout(async () => {
            try {
                const res = await apiClient<any>(`/labor/contractors?search=${encodeURIComponent(term)}&site_id=${siteId}`, {
                    method: "GET",
                    withAuth: true
                });
                setResults(res?.contractors || []);
                setIsOpen(true);
            } catch { }
        }, 300);
    };

    return (
        <div className="relative w-full">
            <input
                type="text"
                placeholder="Search vendor name..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                readOnly={readonly}
                className="p-2 border border-gray-200 outline-none text-sm w-full bg-white focus:border-blue-400 font-bold"
            />
            {isOpen && !readonly && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 max-h-48 overflow-y-auto">
                    {results.map(r => (
                        <div
                            key={r.id}
                            className="p-2 text-sm cursor-pointer border-b last:border-0 border-gray-100 hover:bg-gray-50"
                            onClick={() => {
                                setSearchTerm(r.name);
                                onChange(r.name);
                                setIsOpen(false);
                            }}
                        >
                            <div className="font-bold">{r.name}</div>
                            {r.contact_person && <div className="text-xs text-gray-500">{r.contact_person}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function CBDFormBuilder({ data, setData, readonly, siteId }: { data: any, setData: any, readonly: boolean, siteId: number }) {
    if (!data) return null;

    const updateNested = (category: string, index: number, field: string, value: any) => {
        if (readonly) return;
        const copy = { ...data };
        copy[category][index][field] = value;
        setData(copy);
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            {/* Billing Targets Overview */}
            <div className="bg-white p-6 border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-5">Billing Deadlines</h2>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 p-5 bg-purple-50/50 border border-purple-100">
                        <label className="text-xs font-bold text-purple-600 uppercase tracking-widest block mb-1">Client Bill Target & Achieved Date</label>
                        <div className="flex gap-4 items-center mt-3">
                            <div className="flex-1">
                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                <p className="font-bold text-sm bg-white p-2.5 border border-purple-100">{data.billing_targets?.client_target_date ? formatDate(data.billing_targets.client_target_date) : 'Not Set'}</p>
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                <input type="date" disabled={readonly} value={data.billing_targets?.client_achieved_date || ''}
                                    onChange={e => setData({ ...data, billing_targets: { ...data.billing_targets, client_achieved_date: e.target.value } })}
                                    className="w-full text-sm font-bold bg-white p-2.5 outline-none border border-purple-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-5 bg-orange-50/50 border border-orange-100">
                        <label className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-1">Contractor Bill Target & Achieved Date</label>
                        <div className="flex gap-4 items-center mt-3">
                            <div className="flex-1">
                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                <p className="font-bold text-sm bg-white p-2.5 border border-orange-100">{data.billing_targets?.contractor_target_date ? formatDate(data.billing_targets.contractor_target_date) : 'Not Set'}</p>
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                <input type="date" disabled={readonly} value={data.billing_targets?.contractor_achieved_date || ''}
                                    onChange={e => setData({ ...data, billing_targets: { ...data.billing_targets, contractor_achieved_date: e.target.value } })}
                                    className="w-full text-sm font-bold bg-white p-2.5 outline-none border border-orange-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Steel Reconciliation */}
            <div className="bg-white p-6 border border-slate-200 space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Steel Reconciliation</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Received Steel <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_received ?? ''} disabled={readonly} title="Total Received Steel"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_received: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Billed Steel <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_billed ?? ''} disabled={readonly} title="Total Billed Steel"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_billed: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">WIP Steel <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.wip_steel ?? ''} disabled={readonly} title="WIP Steel"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), wip_steel: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">JMR Total <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.jmr_total ?? ''} disabled={readonly} title="JMR Total"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), jmr_total: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Stock <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_stock ?? ''} disabled={readonly} title="Total Stock"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_stock: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Scrap <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_scrap ?? ''} disabled={readonly} title="Total Scrap"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_scrap: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">% Wastage <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.wastage_percent ?? ''} disabled={readonly} title="% Wastage"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), wastage_percent: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-red-200 outline-none text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50 text-red-700 transition-all" />
                    </div>
                </div>
            </div>

            {/* Daily Concrete Reconciliation */}
            <div className="bg-white p-6 border border-slate-200 space-y-5">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Daily Concrete Reconciliation</h2>
                </div>

                <div className="grid gap-4">
                    {data.concrete_reconciliation?.map((item: any, i: number) => (
                        <div key={i} className="bg-slate-50/50 p-5 border border-slate-100 space-y-3 relative">
                            <h3 className="font-bold text-sm text-slate-700 bg-white inline-block px-3 py-1.5 border border-slate-200">{item.region}</h3>
                            <div className="grid grid-cols-4 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Theoretical <span className="text-red-500">*</span></label>
                                    <input type="number" min="0" value={item.theoretical ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'theoretical', Math.max(0, parseFloat(e.target.value) || 0))} title="Theoretical Concrete" className="w-full p-2.5 border border-slate-300 font-bold bg-white outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Consumed <span className="text-red-500">*</span></label>
                                    <input type="number" min="0" value={item.consumed ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'consumed', Math.max(0, parseFloat(e.target.value) || 0))} title="Consumed Concrete" className="w-full p-2.5 border border-slate-300 font-bold bg-white outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Difference <span className="text-red-500">*</span></label>
                                    <input type="number" value={item.difference ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'difference', parseFloat(e.target.value) || 0)} title="Difference" className="w-full p-2.5 border border-slate-300 font-bold bg-white outline-none text-sm text-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">% Wastage <span className="text-red-500">*</span></label>
                                    <input type="number" value={item.wastage_percent ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'wastage_percent', parseFloat(e.target.value) || 0)} title="% Wastage" className="w-full p-2.5 border border-red-200 font-bold bg-red-50 text-red-700 outline-none text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!data.concrete_reconciliation || data.concrete_reconciliation.length === 0) && (
                        <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200">No concrete reconciliation regions found in site config.</div>
                    )}
                </div>
            </div>

            {/* Report Checklist with Files */}
            <div className="bg-white p-6 border border-slate-200 space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Report Checklist</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.report_checklist?.map((item: any, i: number) => (
                        <div key={i} className={`p-5 border transition-all duration-200 ${item.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50' : item.status === 'No' ? 'border-red-200 bg-red-50/50' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <span className="font-bold text-slate-700 text-sm flex-1 text-center sm:text-left">{item.description} <span className="text-red-500">*</span></span>
                                <div className="flex gap-2 bg-white border border-slate-200 p-1 shrink-0">
                                    <button disabled={readonly} onClick={() => updateNested('report_checklist', i, 'status', 'Yes')} className={`px-5 py-1.5 text-xs font-bold transition-all ${item.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                    <button disabled={readonly} onClick={() => updateNested('report_checklist', i, 'status', 'No')} className={`px-5 py-1.5 text-xs font-bold transition-all ${item.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                </div>
                            </div>
                            {item.status === 'No' && (
                                <div className="mt-5 pt-4 border-t border-red-100/50 transition-all">
                                    <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-widest">Reason / Remarks <span className="text-red-500">*</span></div>
                                    <input type="text" placeholder="Please provide a remark for 'No'..." value={item.remark || ''} disabled={readonly} title="Remarks"
                                        onChange={e => updateNested('report_checklist', i, 'remark', e.target.value)}
                                        className="w-full p-2.5 text-sm bg-white border border-red-200 outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 border border-slate-200 space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Documents For Client Bill</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.documents_client_bill?.map((doc: any, i: number) => (
                        <div key={i} className={`p-5 border transition-all duration-200 ${doc.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50' : doc.status === 'No' ? 'border-red-200 bg-red-50/50' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <span className="font-bold text-slate-700 text-sm flex-1 text-center sm:text-left">{doc.document_name} <span className="text-red-500">*</span></span>
                                <div className="flex gap-2 bg-white border border-slate-200 p-1 shrink-0">
                                    <button disabled={readonly} onClick={() => updateNested('documents_client_bill', i, 'status', 'Yes')} className={`px-4 py-1.5 text-[10px] uppercase font-bold transition-all ${doc.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                    <button disabled={readonly} onClick={() => updateNested('documents_client_bill', i, 'status', 'No')} className={`px-4 py-1.5 text-[10px] uppercase font-bold transition-all ${doc.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                </div>
                            </div>
                            {doc.status === 'No' && (
                                <div className="mt-5 pt-4 border-t border-red-100/50 transition-all">
                                    <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-widest">Reason / Remarks <span className="text-red-500">*</span></div>
                                    <input type="text" placeholder="Please provide a reason..." value={doc.remark || ''} disabled={readonly} title="Remarks"
                                        onChange={e => updateNested('documents_client_bill', i, 'remark', e.target.value)}
                                        className="w-full p-2.5 text-sm bg-white border border-red-200 outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Vendor Registration */}
            <div className="bg-white p-6 border border-slate-200 space-y-5">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Vendor Registration</h2>
                    {!readonly && (
                        <button onClick={() => {
                            const arr = [...(data.vendor_registrations || [])];
                            arr.push({ vendor_name: '', is_reg_form: false, reg_form_files: [], is_wo: false, wo_files: [], is_closing: false, closing_files: [] });
                            setData({ ...data, vendor_registrations: arr });
                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-4 py-1.5 font-bold flex items-center gap-1 transition-colors text-sm">+ Add Vendor</button>
                    )}
                </div>

                <div className="space-y-4">
                    {data.vendor_registrations?.map((vendor: any, i: number) => (
                        <div key={i} className="bg-slate-50/50 p-5 border border-slate-100 relative">
                            {!readonly && (
                                <button onClick={() => {
                                    const copy = { ...data };
                                    copy.vendor_registrations.splice(i, 1);
                                    setData(copy);
                                }} className="absolute py-1 px-3 bg-red-50/50 font-bold text-red-500 right-4 hover:text-red-700 text-xs transition-colors top-4 z-10 flex items-center gap-1"><span className="text-base leading-none">&times;</span> Remove</button>
                            )}

                            <div className="mb-4 pr-24">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Vendor Name <span className="text-red-500">*</span></label>
                                <VendorSearchInput
                                    siteId={siteId}
                                    value={vendor.vendor_name}
                                    onChange={(val) => updateNested('vendor_registrations', i, 'vendor_name', val)}
                                    readonly={readonly}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-200/50 pt-5 mt-5">
                                {/* Registration Form */}
                                <div className={`p-4 border transition-all flex flex-col h-full ${vendor.is_reg_form === 'Yes' ? 'border-emerald-200 bg-emerald-50/10' : vendor.is_reg_form === 'No' ? 'border-red-200 bg-red-50/10' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex flex-col gap-3 flex-1">
                                        <span className="font-bold text-sm text-slate-800">Registration Form</span>
                                        <div className="flex gap-2 bg-white border border-slate-200 p-1 w-fit">
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'Yes')} className={`px-4 py-1 text-[10px] font-bold transition-all ${vendor.is_reg_form === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'No')} className={`px-4 py-1 text-[10px] font-bold transition-all ${vendor.is_reg_form === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                        </div>
                                    </div>
                                    {vendor.is_reg_form === 'No' && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Why no registration form?" value={vendor.reg_form_reason || ''} title="Registration Reason"
                                                onChange={e => updateNested('vendor_registrations', i, 'reg_form_reason', e.target.value)}
                                                className="w-full p-2 text-xs bg-white border border-red-200 outline-none font-medium focus:ring-2 focus:ring-red-500/20" />
                                        </div>
                                    )}
                                </div>

                                {/* Work Order */}
                                <div className={`p-4 border transition-all flex flex-col h-full ${vendor.is_wo === 'Yes' ? 'border-emerald-200 bg-emerald-50/10' : vendor.is_wo === 'No' ? 'border-red-200 bg-red-50/10' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex flex-col gap-3 flex-1">
                                        <span className="font-bold text-sm text-slate-800">Work Order (WO)</span>
                                        <div className="flex gap-2 bg-white border border-slate-200 p-1 w-fit">
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'Yes')} className={`px-4 py-1 text-[10px] font-bold transition-all ${vendor.is_wo === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'No')} className={`px-4 py-1 text-[10px] font-bold transition-all ${vendor.is_wo === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                        </div>
                                    </div>
                                    {vendor.is_wo === 'No' && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Why no WO?" value={vendor.wo_reason || ''} title="WO Reason"
                                                onChange={e => updateNested('vendor_registrations', i, 'wo_reason', e.target.value)}
                                                className="w-full p-2 text-xs bg-white border border-red-200 outline-none font-medium focus:ring-2 focus:ring-red-500/20" />
                                        </div>
                                    )}
                                </div>

                                {/* Closing Bill */}
                                <div className={`p-4 border transition-all flex flex-col h-full ${vendor.is_closing === 'Yes' ? 'border-emerald-200 bg-emerald-50/10' : vendor.is_closing === 'No' ? 'border-red-200 bg-red-50/10' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex flex-col gap-3 flex-1">
                                        <span className="font-bold text-sm text-slate-800">Closing Bill</span>
                                        <div className="flex gap-2 bg-white border border-slate-200 p-1 w-fit">
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'Yes')} className={`px-4 py-1 text-[10px] font-bold transition-all ${vendor.is_closing === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'No')} className={`px-4 py-1 text-[10px] font-bold transition-all ${vendor.is_closing === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                        </div>
                                    </div>
                                    {vendor.is_closing === 'No' && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Why no closing bill?" value={vendor.closing_reason || ''} title="Closing Reason"
                                                onChange={e => updateNested('vendor_registrations', i, 'closing_reason', e.target.value)}
                                                className="w-full p-2 text-xs bg-white border border-red-200 outline-none font-medium focus:ring-2 focus:ring-red-500/20" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!data.vendor_registrations || data.vendor_registrations.length === 0) && (
                        <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200">No vendors added.</div>
                    )}
                </div>
            </div>
        </div >
    );
}

export function AssignmentCard({ task, onSelect, isOrgAdmin, onChangeAssignee }: { task: DynamicAssignment, onSelect: (task: DynamicAssignment) => void, isOrgAdmin?: boolean, onChangeAssignee?: (taskId: number, newAssigneeId: number) => void }) {
    const [isChangingAssignee, setIsChangingAssignee] = useState(false);
    const [selectedNewUser, setSelectedNewUser] = useState<any>(null);

    return (
        <div className="bg-white border border-black p-4 hover:bg-slate-50 transition-all group flex flex-col justify-between h-full relative">
            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <div className="w-8 h-8 bg-black flex items-center justify-center text-white shrink-0">
                        <CheckCircle2 size={14} />
                    </div>
                    <span className="bg-white text-black px-2.5 py-1 text-[8px] font-black uppercase tracking-widest border border-black">
                        {task.form_type}
                    </span>
                </div>

                <div className="space-y-1">
                    <h3 className="font-black text-black text-[11px] uppercase tracking-tight line-clamp-2">
                        {task.site_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                        <MapPin size={10} />
                        <span className="truncate">{task.unit_name}</span>
                    </div>
                </div>

                <div className="pt-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Target Date</p>
                    <p className="text-[11px] font-black text-black">{formatDate(task.report_date || task.due_date)}</p>
                </div>

                {/* One form serves the whole assignee group, so name who shares it. */}
                {(task.assignees?.length ?? 0) > 0 && (
                    <div className="pt-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                            {task.is_shared ? `Any of ${task.assignees!.length} can fill` : 'Assigned to'}
                        </p>
                        <p className="text-[9px] font-bold text-gray-600 leading-snug line-clamp-2">
                            {task.assignees!.map(a => a.employee_name).join(', ')}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-black/10 space-y-3">
                <button
                    onClick={() => onSelect(task)}
                    className="w-full py-2 bg-black hover:bg-zinc-800 text-white text-[9px] font-black transition-all uppercase tracking-widest border border-black"
                >
                    {task.can_fill === false ? 'View DPR' : 'Fill DPR'}
                </button>

                {isOrgAdmin && (
                    <div className="flex justify-between items-center bg-gray-50 p-2 border border-black/10">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-5 h-5 bg-black flex items-center justify-center text-[8px] font-black text-white shrink-0">
                                {(task.first_name?.[0] || 'U').toUpperCase()}
                            </div>
                            <span className="text-[9px] font-black text-black uppercase tracking-tighter truncate">
                                {task.first_name}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsChangingAssignee(!isChangingAssignee)}
                            className="text-[8px] font-black uppercase tracking-widest text-blue-600 hover:underline shrink-0"
                        >
                            Change
                        </button>
                    </div>
                )}
            </div>

            {isChangingAssignee && (
                <div className="absolute inset-0 z-20 bg-white/95 p-5 flex flex-col justify-center animate-in fade-in duration-200 border border-black">
                    <div className="space-y-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-black text-center">Change Assignee</p>
                        <EmployeeSearchInput
                            value={selectedNewUser}
                            onChange={setSelectedNewUser}
                        />
                        <div className="flex justify-center gap-4 pt-2">
                            <button onClick={() => setIsChangingAssignee(false)} className="px-4 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-black transition-colors">Cancel</button>
                            <button
                                onClick={() => {
                                    if (selectedNewUser?.id && onChangeAssignee) {
                                        onChangeAssignee(task.id, selectedNewUser.id);
                                        setIsChangingAssignee(false);
                                    }
                                }}
                                disabled={!selectedNewUser?.id}
                                className="px-6 py-2 text-[9px] font-black text-white bg-black hover:bg-zinc-800 disabled:opacity-30 transition-all uppercase tracking-widest border border-black"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// -------------------------------------------------------------
interface DprMultiStepFormProps {
    task: DynamicAssignment;
    onClose: () => void;
    onSave: (updatedData?: any) => Promise<void>;
    onSubmit: (updatedData?: any) => Promise<void>;
    submitting: boolean;
    initialData: any;
    siteId: number;
    readOnly?: boolean;
}

/**
 * Summarises what the attendance ledger recorded for this form's date and
 * offers to fill the Actual column from it.
 */
export function DprMultiStepForm({ task, onClose, onSave, onSubmit, submitting, initialData, siteId, readOnly }: DprMultiStepFormProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<any>(initialData || {
        scope: '',
        planning_date: new Date().toISOString().split('T')[0],
        safety_quality: {
            towers: task.dynamic_schema?.safety_quality?.towers || [],
            tower_observations: (task.dynamic_schema?.safety_quality?.towers || []).map((t: any) => ({
                towerId: t.id, towerName: t.name, department: '',
                internal_safety: 0, client_safety: 0, safety_nc: 0,
                internal_quality: 0, client_quality: 0, quality_nc: 0, second_close: 0
            })),
            detailed_issues: []
        },
        other_issues: []
    });


    // MoM-style Tagging state
    const [showTagPopover, setShowTagPopover] = useState(false);
    const [tagQuery, setTagQuery] = useState('');
    const [tagType, setTagType] = useState<'@' | '#' | '^'>('@');
    const [tagResults, setTagResults] = useState<any[]>([]);
    const [departmentsList, setDepartmentsList] = useState<any[]>([]);
    const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Discussion Logic
    const [showDiscussionId, setShowDiscussionId] = useState<number | null>(null);
    const [discussionMessages, setDiscussionMessages] = useState<any[]>([]);
    const [loadingDiscussion, setLoadingDiscussion] = useState(false);

    const fetchDiscussion = async (pointId: number) => {
        setLoadingDiscussion(true);
        setShowDiscussionId(pointId);
        try {
            const res = await apiClient.get<any>(`/organization/mom/point/discussion/${pointId}`, undefined, { withAuth: true });
            setDiscussionMessages(res?.messages || []);
        } catch (err) {
            console.error('Failed to fetch discussion', err);
        } finally {
            setLoadingDiscussion(false);
        }
    };

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await apiClient.get('/organization/departments', undefined, { withAuth: true });
                setDepartmentsList(res.data || res || []);
            } catch (err) { console.error('Failed to fetch depts', err); }
        };
        fetchDepts();
    }, []);

    /* ── Attendance actuals ──────────────────────────────────────────────────
       The plan says how many people *should* be on site; attendance knows how
       many actually punched in. Pulling that into the form means the filler
       reports from record instead of memory, and any gap between what they type
       and what the ledger says becomes visible rather than silent.

       This never overwrites an entry on its own — filling is an explicit action,
       because a supervisor may legitimately know better than the turnstile. */
    const [attendance, setAttendance] = useState<any>(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    /**
     * The day this report covers.
     *
     * Forms are raised after midnight for the day just finished, so the report
     * date is the day before the due date. Attendance, the plan slice and the
     * target dates all key off this rather than off "today" — which would ask
     * the site to report a day that has not happened yet.
     */
    const reportDate = (task.report_date || task.due_date || formData.planning_date || '')
        .toString().split('T')[0];
    const attendanceDate = reportDate;
    /** How much is carried in and unresolved — the backlog, not today's work. */
    const openItems = task.dynamic_schema?.open_items_summary as
        { total: number; stale: number; oldest_days: number } | undefined;

    /** Reopened after submission, inside the same-day correction window. */
    const isCorrecting = !readOnly
        && (task.status === 'submitted' || task.status === 'reviewed');

    const reportingDateLabel = reportDate
        ? new Date(reportDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    useEffect(() => {
        if (task.form_type === 'cbd') return;
        if (!siteId || !attendanceDate || attendance) return;
        let cancelled = false;
        setAttendanceLoading(true);
        (async () => {
            try {
                const res = await apiClient.get<any>(
                    `/dps-schedule/${siteId}/attendance-actuals`,
                    { date: attendanceDate },
                    { withAuth: true }
                );
                if (!cancelled) setAttendance(res);
            } catch (err) {
                console.error('Failed to fetch attendance actuals', err);
            } finally {
                if (!cancelled) setAttendanceLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [task.form_type, siteId, attendanceDate, attendance]);

    /** Towers and areas a deployment row can optionally be split across. */
    const deploymentScopes: string[] = useMemo(
        () => task.dynamic_schema?.deployment_scopes || [],
        [task.dynamic_schema]
    );

    /** designation -> cumulative head-count on the reported day. */
    const staffCounts = useMemo(() => {
        const map = new Map<string, number>();
        (attendance?.staff?.by_designation || []).forEach((d: any) => {
            map.set(String(d.designation || '').trim().toLowerCase(), Number(d.present) || 0);
        });
        return map;
    }, [attendance]);

    /** labour category -> cumulative head-count on the reported day. */
    const labourCounts = useMemo(() => {
        const map = new Map<string, number>();
        (attendance?.labour?.by_category || []).forEach((c: any) => {
            map.set(String(c.category || '').trim().toLowerCase(), Number(c.present) || 0);
        });
        return map;
    }, [attendance]);

    // Auto-repopulate attendance actuals immediately on initial load without requiring a click
    const autoPopulatedRef = React.useRef(false);
    useEffect(() => {
        if (!attendance || readOnly || autoPopulatedRef.current) return;
        autoPopulatedRef.current = true;

        setFormData((prev: any) => {
            let changed = false;
            const nextStaff = (prev.staff || []).map((r: any) => {
                const roleKey = String(r.role || r.designation || r.name || '').trim().toLowerCase();
                const hit = staffCounts.get(roleKey);
                if (hit !== undefined && r.actual !== hit) {
                    changed = true;
                    return { ...r, actual: hit, actual_source: 'attendance' };
                }
                return r;
            });
            const nextLabor = (prev.labor || []).map((r: any) => {
                const typeKey = String(r.type || r.name || '').trim().toLowerCase();
                const hit = labourCounts.get(typeKey);
                if (hit !== undefined && r.actual !== hit) {
                    changed = true;
                    return { ...r, actual: hit, actual_source: 'attendance' };
                }
                return r;
            });
            if (!changed) return prev;
            return { ...prev, staff: nextStaff, labor: nextLabor };
        });
    }, [attendance, staffCounts, labourCounts, readOnly]);

    // Master equipment list — the daily form offers the same options the plan
    // was built from, and anything typed here is registered back so it stays
    // trackable on the next plan.
    const [masterEquipments, setMasterEquipments] = useState<string[]>([]);

    useEffect(() => {
        if (task.form_type === 'cbd' || step !== 5) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await apiClient.get<any>('/dps-schedule/master-config', undefined, { withAuth: true });
                if (cancelled) return;
                setMasterEquipments((res?.config?.equipments || []).map((e: any) => e.name).filter(Boolean));
            } catch (err) {
                console.error('Failed to fetch master equipment list', err);
            }
        })();
        return () => { cancelled = true; };
    }, [step, task.form_type]);

    /** Push equipment names the filler typed by hand into the master list. */
    const registerEquipmentToMaster = async (names: string[]) => {
        const known = new Set(masterEquipments.map(n => n.toLowerCase()));
        const novel = Array.from(new Set(
            names.map(n => String(n || '').trim()).filter(n => n && !known.has(n.toLowerCase()))
        ));
        if (novel.length === 0) return;
        try {
            await apiClient.post('/dps-schedule/master-config/append',
                { equipments: novel.map(name => ({ name })) },
                { withAuth: true }
            );
            setMasterEquipments(prev => [...prev, ...novel]);
        } catch (err) {
            console.error('Failed to register equipment to master list', err);
        }
    };

    // CBD Vendor Auto-population
    useEffect(() => {
        if (task.form_type === 'cbd' && step === 6 && (!formData.vendor_registrations || formData.vendor_registrations.length === 0)) {
            const fetchVendors = async () => {
                try {
                    const res = await apiClient<any>(`/labor/contractors?is_active=true&site_id=${siteId}`, {
                        method: "GET",
                        withAuth: true
                    });
                    if (res?.contractors && res.contractors.length > 0) {
                        const vendors = res.contractors.map((c: any) => ({
                            vendor_name: c.name,
                            is_reg_form: 'No',
                            reg_form_files: [],
                            is_wo: 'No',
                            wo_files: [],
                            is_closing: 'No',
                            closing_files: []
                        }));
                        setFormData((prev: any) => ({ ...prev, vendor_registrations: vendors }));
                    }
                } catch (err) {
                    console.error('Failed to fetch vendors', err);
                }
            };
            fetchVendors();
        }
    }, [step, task.form_type, siteId, formData.vendor_registrations]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setShowTagPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTagSearch = async (query: string, type: '@' | '#' | '^') => {
        setTagQuery(query);
        if (type === '#') {
            const filtered = query
                ? departmentsList.filter((d: any) => d.name?.toLowerCase().includes(query.toLowerCase()))
                : departmentsList;
            setTagResults(filtered);
        } else {
            try {
                const res = await apiClient.get(`/organization/employees?format=paginated&limit=10&search=${query}`, undefined, { withAuth: true });
                setTagResults((res as any).data || (res as any).items || []);
            } catch (err) { console.error('Failed to search tags', err); }
        }
    };

    const selectTag = (item: any, issueIndex: number) => {
        const type = tagType === '@' ? 'employee' : (tagType === '#' ? 'department' : 'reviewer');
        const name = item.name || `${item.first_name} ${item.last_name}`;
        const id = item.id || item.id_pk;

        const copy = { ...formData };
        const issue = copy.other_issues[issueIndex];

        if (!issue.assignments) issue.assignments = [];

        if (tagType === '^') {
            issue.reviewer_id = id;
            issue.reviewer_name = name;
        } else {
            if (!issue.assignments.find((a: any) => a.id === id && a.type === type)) {
                issue.assignments.push({ id, type, name });
            }
        }

        // Logic to update the textarea if it was a trigger
        const words = issue.description.split(/\s/);
        const lastWord = words[words.length - 1];
        if (lastWord.startsWith(tagType)) {
            words[words.length - 1] = `${tagType}${name} `;
            issue.description = words.join(' ');
        }

        setFormData(copy);
        setShowTagPopover(false);
        setTagQuery('');
    };

    const updateNested = (category: string, index: number, field: string, value: any) => {
        const copy = { ...formData };
        if (!copy[category]) copy[category] = [];
        copy[category][index] = { ...copy[category][index], [field]: value };
        setFormData(copy);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, issueIndex: number) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const copy = { ...formData };
            if (!copy.other_issues[issueIndex].new_attachments) copy.other_issues[issueIndex].new_attachments = [];
            copy.other_issues[issueIndex].new_attachments.push(...newFiles);
            setFormData(copy);
        }
    };

    const steps = task.form_type === 'cbd' ? [
        { id: 1, title: 'Billing Deadlines', label: '1. Billing' },
        { id: 2, title: 'Steel Reconciliation', label: '2. Steel Recon' },
        { id: 3, title: 'Concrete Reconciliation', label: '3. Concrete Recon' },
        { id: 4, title: 'Report Checklist', label: '4. Checklist' },
        { id: 5, title: 'Documents For Client Bill', label: '5. Documents' },
        { id: 6, title: 'Vendor Registration', label: '6. Vendors' }
    ] : [
        { id: 1, title: 'Concrete Progress', label: '1. Concrete Progress' },
        { id: 2, title: 'Staff Deployment', label: '2. Staff Deployment' },
        { id: 3, title: 'Labour Deployment', label: '3. Labour Deployment' },
        { id: 4, title: 'Schedule Targets', label: '4. Schedule Targets' },
        { id: 5, title: 'Equipment Tracking', label: '5. Equipment Tracking' },
        { id: 6, title: 'Material Tracking', label: '6. Material Tracking' },
        { id: 7, title: 'Safety/Quality Observation', label: '7. Safety/Quality Observation' },
        { id: 8, title: 'Action Items', label: '8. Action Items' }
    ];

    const currentStepData = steps.find(s => s.id === step);

    const handleNext = () => {
        if (step < steps.length) {
            setStep(step + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in fade-in duration-200">
            {/* Full Screen Header */}
            <header className="px-6 lg:px-10 py-4 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex flex-col min-w-0">
                    <h1 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight">
                        {task.form_type === 'cbd' ? 'CBD Report' : 'Daily Progress Report'}
                        <span className="text-slate-300 font-normal"> · </span>
                        <span className="text-slate-500 font-medium">{reportingDateLabel}</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest">
                            Step {step} of {steps.length}
                        </span>
                        <span className="text-slate-500 font-semibold text-xs">{currentStepData?.title}</span>
                        {/* A shared form can be filled by any assignee, so say so
                            up front — two people opening it at once would otherwise
                            not realise they are writing to the same record. */}
                        {task.is_shared && (
                            <span
                                title={task.assignees?.map(a => a.employee_name).join(', ')}
                                className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider"
                            >
                                <User size={9} />
                                Shared with {task.assignees!.length - 1} other{task.assignees!.length - 1 === 1 ? '' : 's'}
                            </span>
                        )}
                        {task.can_fill === false && (
                            <span className="flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                                <Lock size={9} />
                                View only
                            </span>
                        )}
                        {/* A correction is allowed, and is on the record. Say both:
                            the first so nobody thinks a mistake is permanent, the
                            second so nobody thinks an edit is invisible. */}
                        {isCorrecting && (
                            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                                Correcting a submitted report
                            </span>
                        )}
                        {(task.edit_count ?? 0) > 0 && (
                            <span
                                title={task.last_edited_at ? `Last edited ${new Date(task.last_edited_at).toLocaleString('en-GB')}` : undefined}
                                className="flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider"
                            >
                                Edited {task.edit_count}×
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!readOnly && (
                        <button
                            onClick={() => onSave(formData)}
                            disabled={submitting}
                            className="px-4 py-2 bg-white hover:border-slate-900 hover:text-slate-900 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors"
                        >
                            {submitting ? 'Saving…' : 'Save Draft'}
                        </button>
                    )}
                    <button onClick={onClose} title="Close" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </header>

            {/* Steps Navigation Bar */}
            <nav className="border-b border-slate-200 bg-white sticky top-[73px] z-[5] overflow-x-auto no-scrollbar">
                <div className="flex">
                    {steps.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setStep(s.id)}
                            className={`px-5 py-3 text-[11px] font-semibold transition-colors relative whitespace-nowrap border-r border-slate-100 last:border-r-0 ${step === s.id
                                ? 'text-slate-900 bg-slate-50'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/60'}`}
                        >
                            {s.label}
                            {step === s.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="max-w-6xl mx-auto space-y-4">
                    {/* Common Header Info for Step 1 */}
                    {/* Nothing closes itself once status is the site's to set, so the
                        backlog has to be visible without scrolling to step 5. */}
                    {step === 1 && task.form_type !== 'cbd' && (openItems?.total ?? 0) > 0 && (
                        <div className={`flex items-start gap-2 px-4 py-3 border ${openItems!.stale > 0
                            ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                            <AlertCircle size={15} className={openItems!.stale > 0 ? 'text-rose-600 flex-shrink-0 mt-0.5' : 'text-amber-600 flex-shrink-0 mt-0.5'} />
                            <p className={`text-xs leading-relaxed ${openItems!.stale > 0 ? 'text-rose-900' : 'text-amber-900'}`}>
                                <span className="font-semibold">{openItems!.total} item{openItems!.total === 1 ? '' : 's'} still open</span>
                                {' '}carried in from earlier reports — breakdowns, materials and issues.
                                {openItems!.stale > 0 && (
                                    <> <span className="font-semibold">{openItems!.stale}</span> {openItems!.stale === 1 ? 'has' : 'have'} been
                                    open a week or more{openItems!.oldest_days ? `, the oldest ${openItems!.oldest_days} days` : ''}.</>
                                )}
                                {' '}Mark anything resolved as you go.
                            </p>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-100">
                            <div className="bg-white px-5 py-3">
                                <p className={headCls}>Project</p>
                                <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{task.site_name}</p>
                            </div>
                            <div className="bg-white px-5 py-3">
                                <p className={headCls}>Department</p>
                                <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{task.unit_name || '—'}</p>
                            </div>
                            <div className="bg-white px-5 py-3">
                                <p className={headCls}>Reporting for</p>
                                <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-2">
                                    <Calendar size={13} className="text-slate-400" />
                                    {reportingDateLabel}
                                </p>
                                {/* Reports are filled the morning after the day they cover;
                                    saying so stops anyone entering today's numbers. */}
                                <p className="text-[10px] text-slate-400 mt-0.5">Yesterday's work, filled today</p>
                            </div>
                        </div>
                    )}

                    {/* Step Body */}
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* DPR FORMS */}
                        {task.form_type !== 'cbd' && step === 1 && (
                            formData.concrete_planning ? (() => {
                                const cp = formData.concrete_planning;
                                const isTowerWise = (cp.scope === 'Tower-wise') && (cp.towers || []).length > 0;
                                // Date-wise days with nothing scheduled are normal — concrete
                                // is not poured every day. The form still takes a figure,
                                // because an unplanned pour is exactly the thing worth catching.
                                const hasDuePlan = cp.has_due_plan !== false;

                                // Today's target is what the plan set for this form's own date.
                                // Older schedules only carried the cumulative figure, so fall back to it.
                                const todayPlanned = Number(cp.today_planned ?? cp.planned_total ?? 0);
                                const cumulativePlanned = Number(cp.cumulative_planned ?? cp.planned_total ?? 0);

                                const towerAchieved = (cp.towers || [])
                                    .reduce((sum: number, t: any) => sum + (parseFloat(t.achieved) || 0), 0);
                                
                                const enteredOverall = cp.achieved_total !== undefined && cp.achieved_total !== null && String(cp.achieved_total).trim() !== ''
                                    ? parseFloat(cp.achieved_total)
                                    : null;
                                const achieved = enteredOverall !== null
                                    ? (isTowerWise ? Math.max(enteredOverall, towerAchieved) : enteredOverall)
                                    : (isTowerWise ? towerAchieved : 0);
                                const extraOverall = isTowerWise && enteredOverall !== null && enteredOverall > towerAchieved
                                    ? enteredOverall - towerAchieved
                                    : 0;
                                const variance = achieved - todayPlanned;

                                const setCp = (patch: any) =>
                                    setFormData({ ...formData, concrete_planning: { ...cp, ...patch } });

                                const setTower = (idx: number, value: number) => {
                                    const towers = [...(cp.towers || [])];
                                    towers[idx] = { ...towers[idx], achieved: value };
                                    const newTowerTotal = towers.reduce((s: number, t: any) => s + (parseFloat(t.achieved) || 0), 0);
                                    
                                    const currentOverall = parseFloat(cp.achieved_total);
                                    const oldTowerTotal = towerAchieved;
                                    let newOverall = newTowerTotal;
                                    if (!isNaN(currentOverall) && currentOverall > oldTowerTotal) {
                                        const extra = currentOverall - oldTowerTotal;
                                        newOverall = newTowerTotal + extra;
                                    }
                                    setCp({ towers, achieved_total: newOverall });
                                };

                                const addCustomTower = () => {
                                    const name = window.prompt('Enter tower / area / location name (e.g. Podium, External, Tower C):');
                                    if (!name || !name.trim()) return;
                                    const trimmed = name.trim();
                                    const existing = (cp.towers || []).some((t: any) => (t.name || '').toLowerCase() === trimmed.toLowerCase());
                                    if (existing) {
                                        toast.error('This location is already added.');
                                        return;
                                    }
                                    const newTowers = [
                                        ...(cp.towers || []),
                                        { id: `custom-${Date.now()}`, name: trimmed, planned: 0, achieved: '', unplanned: true }
                                    ];
                                    setCp({ towers: newTowers, scope: 'Tower-wise' });
                                };

                                return (
                                    <div className="bg-white border border-slate-200 space-y-0">
                                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Concrete Progress</h2>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Report what was poured today against the planned pour.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-2 py-1 whitespace-nowrap">
                                                    {cp.type === 'Monthly' ? 'Cycle' : 'Day'} · {cp.scope === 'Tower-wise' ? 'Tower-wise' : 'Overall'}
                                                </span>
                                                {cp.period && (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white px-2 py-1 whitespace-nowrap">
                                                        {cp.period}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {!hasDuePlan && (
                                            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-start gap-2">
                                                <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-slate-600">
                                                    No pour was scheduled for this day. Enter <span className="font-semibold">0</span> if
                                                    none happened — or record what was poured, and it will show up as unplanned work.
                                                </p>
                                            </div>
                                        )}

                                        {/* Plan context: today, cumulative, and the gap carried in */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100 border-b border-slate-200">
                                            <div className="bg-white px-5 py-3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Planned today</p>
                                                <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">
                                                    {todayPlanned}<span className="text-[10px] text-slate-400 ml-1">m³</span>
                                                </p>
                                            </div>
                                            <div className="bg-white px-5 py-3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Achieved today</p>
                                                <p className="text-xl font-semibold text-blue-600 tabular-nums mt-1">
                                                    {achieved}<span className="text-[10px] text-slate-400 ml-1">m³</span>
                                                </p>
                                            </div>
                                            <div className="bg-white px-5 py-3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Today's variance</p>
                                                <p className={`text-xl font-semibold tabular-nums mt-1 ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {variance >= 0 ? '+' : ''}{Math.round(variance * 100) / 100}
                                                    <span className="text-[10px] text-slate-400 ml-1">m³</span>
                                                </p>
                                            </div>
                                            <div className="bg-white px-5 py-3">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Cumulative · overall
                                                </p>
                                                <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">
                                                    {cp.validity_achieved || 0}
                                                    <span className="text-sm text-slate-300 font-normal"> / {cumulativePlanned}</span>
                                                </p>
                                                {/* Say where the target came from. It is one number for the
                                                    whole site and the whole cycle — not this day's slice and
                                                    not this tower's share — which is easy to misread beside
                                                    the per-day figures next to it. */}
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {cp.cumulative_source === 'plan'
                                                        ? 'Poured so far vs the plan’s overall target'
                                                        : 'Poured so far vs the sum of this plan'}
                                                </p>
                                            </div>
                                        </div>

                                        {cumulativePlanned > 0 && (
                                            <div className="px-6 py-4 border-b border-slate-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Progress against plan to date
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                                        {Math.round(((cp.validity_achieved || 0) / cumulativePlanned) * 100)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-100 overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${(cp.validity_achieved || 0) >= cumulativePlanned ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min(100, ((cp.validity_achieved || 0) / cumulativePlanned) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200">
                                                        <th className="py-2.5 px-6">Location</th>
                                                        <th className="py-2.5 px-4 text-center w-20">Unit</th>
                                                        <th className="py-2.5 px-4 text-center w-32">Planned today</th>
                                                        <th className="py-2.5 px-4 text-center w-32">Actual poured</th>
                                                        <th className="py-2.5 px-4 text-center w-28">Variance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {isTowerWise ? (
                                                        cp.towers.map((t: any, i: number) => {
                                                            const tPlanned = Number(t.planned) || 0;
                                                            const tActual = parseFloat(t.achieved) || 0;
                                                            const tVar = tActual - tPlanned;
                                                            return (
                                                                <tr key={t.id || i} className="hover:bg-slate-50/60 transition-colors">
                                                                    <td className="py-3 px-6 font-medium text-slate-800 text-sm">
                                                                        {t.name}
                                                                        {t.unplanned && (
                                                                            <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 border border-slate-200 px-1.5 py-0.5">
                                                                                Not scheduled
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center text-slate-400 text-xs">m³</td>
                                                                    <td className="py-3 px-4 text-center font-semibold text-sm tabular-nums">
                                                                        {t.unplanned ? <span className="text-slate-300">—</span> : <span className="text-slate-900">{tPlanned}</span>}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="any"
                                                                            disabled={readOnly}
                                                                            value={t.achieved ?? ''}
                                                                            onChange={e => setTower(i, Math.max(0, parseFloat(e.target.value) || 0))}
                                                                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                                            className="w-24 px-2 py-1.5 bg-white border border-slate-200 text-sm font-semibold text-center tabular-nums outline-none focus:border-slate-900 transition-colors"
                                                                        />
                                                                    </td>
                                                                    <td className={`py-3 px-4 text-center font-semibold text-sm tabular-nums ${tVar >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {tVar >= 0 ? '+' : ''}{Math.round(tVar * 100) / 100}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : null}
                                                </tbody>
                                                {/* The site total acts as the total of the towers above.
                                                    The user can also add/enter a higher amount in overall for
                                                    extra or unallocated pours outside the scheduled towers. */}
                                                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                                    <tr>
                                                        <td colSpan={2} className="py-3 px-6">
                                                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                                                                Overall poured <span className="text-rose-500">*</span>
                                                            </span>
                                                            {isTowerWise && (
                                                                <p className="text-[10px] text-slate-400 font-normal normal-case mt-0.5">
                                                                    {extraOverall > 0
                                                                        ? `Towers total: ${towerAchieved} m³ (+${Math.round(extraOverall * 100) / 100} m³ additional pour)`
                                                                        : 'Total of towers above (can enter higher for additional site pour)'}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-semibold text-slate-900 text-sm tabular-nums">{todayPlanned}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input
                                                                type="number"
                                                                min={isTowerWise ? towerAchieved : 0}
                                                                step="any"
                                                                disabled={readOnly}
                                                                value={cp.achieved_total !== undefined && cp.achieved_total !== null ? cp.achieved_total : (isTowerWise ? (towerAchieved || '') : '')}
                                                                onChange={e => setCp({ achieved_total: e.target.value })}
                                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                                placeholder={isTowerWise ? String(towerAchieved || 0) : '0'}
                                                                className={`w-28 px-2 py-1.5 bg-white border text-sm font-bold text-center tabular-nums outline-none focus:border-slate-900 transition-colors ${
                                                                    (cp.achieved_total === undefined || cp.achieved_total === null || String(cp.achieved_total).trim() === '') && !isTowerWise
                                                                        ? 'border-rose-300 bg-rose-50/40'
                                                                        : 'border-slate-300 text-blue-600'
                                                                }`}
                                                            />
                                                        </td>
                                                        <td className={`py-3 px-4 text-center font-semibold text-sm tabular-nums ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {variance >= 0 ? '+' : ''}{Math.round(variance * 100) / 100}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        {!readOnly && (
                                            <div className="px-6 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={addCustomTower}
                                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
                                                >
                                                    <Plus size={13} />
                                                    {isTowerWise ? 'Add other tower / area pour' : 'Add tower / area breakdown'}
                                                </button>
                                                {isTowerWise && towerAchieved > 0 && (
                                                    <span className="text-[11px] text-slate-500">
                                                        Towers sum: <strong className="text-slate-800">{towerAchieved} m³</strong>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {hasDuePlan && (variance < 0 || cp.delay_reason) && !readOnly && (
                                            <div className="px-6 py-4 border-t border-slate-100 bg-amber-50/40">
                                                <label className="text-[9px] font-bold text-amber-700 uppercase tracking-widest block mb-2">
                                                    Shortfall reason
                                                </label>
                                                <input
                                                    type="text"
                                                    value={cp.delay_reason || ''}
                                                    onChange={e => setCp({ delay_reason: e.target.value })}
                                                    placeholder="Why did today fall short of plan?"
                                                    className="w-full px-3 py-2 bg-white border border-amber-200 text-sm outline-none focus:border-amber-500 transition-colors"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })() : (
                                <div className="bg-white border border-slate-200 py-16 text-center">
                                    <p className="text-sm font-semibold text-slate-400">No concrete details needed for this form type.</p>
                                </div>
                            )
                        )}
                        {task.form_type === 'cbd' && step === 1 && (
                            <div className="bg-white p-10 border border-slate-200 space-y-8">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Billing Deadlines</h2>
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="flex-1 p-6 bg-purple-50/50 border border-purple-100">
                                        <label className="text-xs font-bold text-purple-600 uppercase tracking-widest block mb-2">Client Bill Target & Achieved Date</label>
                                        <div className="flex gap-4 items-center mt-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                                <p className="font-bold text-sm bg-white p-3 border border-purple-100">{formData.billing_targets?.client_target_date ? formatDate(formData.billing_targets.client_target_date) : 'Not Set'}</p>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                                <input type="date" value={formData.billing_targets?.client_achieved_date || ''}
                                                    disabled={readOnly}
                                                    onChange={e => setFormData({ ...formData, billing_targets: { ...formData.billing_targets, client_achieved_date: e.target.value } })}
                                                    className="w-full text-sm font-bold bg-white p-3 outline-none border border-purple-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-6 bg-orange-50/50 border border-orange-100">
                                        <label className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-2">Contractor Bill Target & Achieved Date</label>
                                        <div className="flex gap-4 items-center mt-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                                <p className="font-bold text-sm bg-white p-3 border border-orange-100">{formData.billing_targets?.contractor_target_date ? formatDate(formData.billing_targets.contractor_target_date) : 'Not Set'}</p>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                                <input type="date" value={formData.billing_targets?.contractor_achieved_date || ''}
                                                    disabled={readOnly}
                                                    onChange={e => setFormData({ ...formData, billing_targets: { ...formData.billing_targets, contractor_achieved_date: e.target.value } })}
                                                    className="w-full text-sm font-bold bg-white p-3 outline-none border border-orange-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 2 && (
                            <div className="bg-white p-10 border border-slate-200 space-y-6">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Steel Reconciliation</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Received Steel <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_received ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_received: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-50/20 focus:border-blue-500 bg-slate-50 transition-all" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Billed Steel <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_billed ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_billed: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">WIP Steel <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.wip_steel ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), wip_steel: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">JMR Total <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.jmr_total ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), jmr_total: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Stock <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_stock ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_stock: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Scrap <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_scrap ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_scrap: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">% Wastage <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.wastage_percent ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), wastage_percent: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-red-200 outline-none text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50 text-red-700 transition-all" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 3 && (
                            <div className="bg-white p-6 border border-[#F3F4F6] space-y-3">
                                <h2 className="text-md font-black text-[#111827] tracking-tight uppercase">Daily Concrete Reconciliation</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-max">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-t border-[#F3F4F6]">
                                                <th className="py-4 px-4 border-b border-[#F3F4F6]">REGION / LEVEL</th>
                                                <th className="py-4 px-4 text-center border-b border-[#F3F4F6]">THEORETICAL (M³)</th>
                                                <th className="py-4 px-4 text-center border-b border-[#F3F4F6]">CONSUMED (M³)</th>
                                                <th className="py-4 px-4 text-center border-b border-[#F3F4F6]">DIFFERENCE</th>
                                                <th className="py-4 px-4 text-center border-b border-[#F3F4F6]">% WASTAGE</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F3F4F6]">
                                            {formData.concrete_reconciliation?.map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-[#F9FAFB]/50 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-[#374151] text-sm">{item.region}</td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input type="number" min="0" value={item.theoretical ?? ''}
                                                            disabled={readOnly}
                                                            onChange={e => {
                                                                const copy = [...formData.concrete_reconciliation];
                                                                copy[i].theoretical = Math.max(0, parseFloat(e.target.value) || 0);
                                                                setFormData({ ...formData, concrete_reconciliation: copy });
                                                            }} className="w-24 p-1.5 bg-white border border-[#D1D5DB] text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm" />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input type="number" min="0" value={item.consumed ?? ''}
                                                            disabled={readOnly}
                                                            onChange={e => {
                                                                const copy = [...formData.concrete_reconciliation];
                                                                copy[i].consumed = Math.max(0, parseFloat(e.target.value) || 0);
                                                                setFormData({ ...formData, concrete_reconciliation: copy });
                                                            }} className="w-24 p-1.5 bg-white border border-[#D1D5DB] text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm" />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input type="number" value={item.difference ?? ''}
                                                            disabled={readOnly}
                                                            onChange={e => {
                                                                const copy = [...formData.concrete_reconciliation];
                                                                copy[i].difference = parseFloat(e.target.value) || 0;
                                                                setFormData({ ...formData, concrete_reconciliation: copy });
                                                            }} className="w-24 p-1.5 bg-white border border-[#D1D5DB] text-orange-600 outline-none focus:border-orange-500 text-center font-bold text-sm" />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input type="number" value={item.wastage_percent ?? ''}
                                                            disabled={readOnly}
                                                            onChange={e => {
                                                                const copy = [...formData.concrete_reconciliation];
                                                                copy[i].wastage_percent = parseFloat(e.target.value) || 0;
                                                                setFormData({ ...formData, concrete_reconciliation: copy });
                                                            }} className="w-24 p-1.5 bg-red-50 border border-red-200 text-red-700 outline-none focus:border-red-500 text-center font-black text-sm" />
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!formData.concrete_reconciliation || formData.concrete_reconciliation.length === 0) && (
                                                <tr>
                                                    <td colSpan={5} className="text-slate-400 text-sm font-medium py-10 text-center border-t border-[#F3F4F6]">No concrete reconciliation regions found in site config.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {task.form_type !== 'cbd' && step === 2 && (
                            <DeploymentSection
                                id="dpr-staff"
                                title="Staff Deployment"
                                caption="One cumulative head-count per designation for the whole site."
                                icon={<Users size={16} />}
                                accent="blue"
                                nameKey="role"
                                namePlaceholder="e.g. Site Engineer"
                                rows={formData.staff || []}
                                setRows={rows => setFormData({ ...formData, staff: rows })}
                                scopes={deploymentScopes}
                                attendance={staffCounts}
                                attendanceDate={attendanceDate}
                                attendanceLoading={attendanceLoading}
                                onFillFromAttendance={() => {
                                    const next = fillFromAttendance(formData.staff || [], 'role', staffCounts, 'staff');
                                    if (next) setFormData({ ...formData, staff: next });
                                }}
                                readOnly={readOnly}
                                unitLabel="staff"
                            />
                        )}

                        {task.form_type !== 'cbd' && step === 3 && (
                            <DeploymentSection
                                id="dpr-labour"
                                title="Labour Deployment"
                                caption="One cumulative head-count per labour category for the whole site."
                                icon={<HardHat size={16} />}
                                accent="rose"
                                nameKey="type"
                                namePlaceholder="e.g. Mason"
                                rows={formData.labor || []}
                                setRows={rows => setFormData({ ...formData, labor: rows })}
                                scopes={deploymentScopes}
                                attendance={labourCounts}
                                attendanceDate={attendanceDate}
                                attendanceLoading={attendanceLoading}
                                onFillFromAttendance={() => {
                                    const next = fillFromAttendance(formData.labor || [], 'type', labourCounts, 'labour');
                                    if (next) setFormData({ ...formData, labor: next });
                                }}
                                readOnly={readOnly}
                                unitLabel="labour"
                            />
                        )}

                        {task.form_type === 'cbd' && step === 4 && (
                            <div className="bg-white p-8 border border-slate-200 space-y-5">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Report Checklist</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {formData.report_checklist?.map((item: any, i: number) => (
                                        <div key={i} className={`p-4 border transition-all duration-200 ${item.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50' : item.status === 'No' ? 'border-red-200 bg-red-50/50' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200'}`}>
                                            <div className="flex flex-col gap-3">
                                                <span className="font-bold text-slate-700 text-xs min-h-[32px] line-clamp-2">{item.description} <span className="text-red-500">*</span></span>
                                                <div className="flex gap-2 bg-white border border-slate-200 p-1 w-fit self-center sm:self-start">
                                                    <button onClick={() => updateNested('report_checklist', i, 'status', 'Yes')} className={`px-4 py-1 text-[10px] font-bold transition-all ${item.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                                    <button onClick={() => updateNested('report_checklist', i, 'status', 'No')} className={`px-4 py-1 text-[10px] font-bold transition-all ${item.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                                </div>
                                            </div>
                                            {item.status === 'Yes' && (
                                                <div className="mt-4 pt-3 border-t border-emerald-100/50 transition-all space-y-3">
                                                    <div>
                                                        <div className="mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attachments <span className="text-red-500">*</span></div>
                                                        <FileInput
                                                            readonly={false}
                                                            value={item.attachments || []}
                                                            onChange={(files) => updateNested('report_checklist', i, 'attachments', files)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Remarks</div>
                                                        <input type="text" placeholder="Remarks..." value={item.remark || ''} title="Remarks"
                                                            onChange={e => updateNested('report_checklist', i, 'remark', e.target.value)}
                                                            className="w-full p-2 text-xs bg-white border border-emerald-200 outline-none font-medium text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                                                    </div>
                                                </div>
                                            )}
                                            {item.status === 'No' && (
                                                <div className="mt-4 pt-3 border-t border-red-100/50 transition-all">
                                                    <div className="mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason / Remarks <span className="text-red-500">*</span></div>
                                                    <input type="text" placeholder="Reason for 'No'..." value={item.remark || ''} title="Remarks"
                                                        onChange={e => updateNested('report_checklist', i, 'remark', e.target.value)}
                                                        className="w-full p-2 text-xs bg-white border border-red-200 outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 5 && (
                            <div className="bg-white p-8 border border-slate-200 space-y-5">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Documents For Client Bill</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {formData.documents_client_bill?.map((doc: any, i: number) => (
                                        <div key={i} className={`p-4 border transition-all duration-200 ${doc.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50' : doc.status === 'No' ? 'border-red-200 bg-red-50/50' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200'}`}>
                                            <div className="flex flex-col gap-3">
                                                <span className="font-bold text-slate-700 text-xs min-h-[32px] line-clamp-2">{doc.document_name} <span className="text-red-500">*</span></span>
                                                <div className="flex gap-2 bg-white border border-slate-200 p-1 w-fit self-center sm:self-start">
                                                    <button onClick={() => updateNested('documents_client_bill', i, 'status', 'Yes')} className={`px-4 py-1 text-[10px] font-bold transition-all ${doc.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                                    <button onClick={() => updateNested('documents_client_bill', i, 'status', 'No')} className={`px-4 py-1 text-[10px] font-bold transition-all ${doc.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                                </div>
                                            </div>
                                            {doc.status === 'Yes' && (
                                                <div className="mt-4 pt-3 border-t border-emerald-100/50 transition-all">
                                                    <div className="mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attachments <span className="text-red-500">*</span></div>
                                                    <FileInput
                                                        readonly={false}
                                                        value={doc.attachments || []}
                                                        onChange={(files) => updateNested('documents_client_bill', i, 'attachments', files)}
                                                    />
                                                </div>
                                            )}
                                            {doc.status === 'No' && (
                                                <div className="mt-4 pt-3 border-t border-red-100/50 transition-all">
                                                    <div className="mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason / Remarks <span className="text-red-500">*</span></div>
                                                    <input type="text" placeholder="Reason for 'No'..." value={doc.remark || ''} title="Remarks"
                                                        onChange={e => updateNested('documents_client_bill', i, 'remark', e.target.value)}
                                                        className="w-full p-2 text-xs bg-white border border-red-200 outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 6 && (
                            <div className="bg-white p-10 border border-slate-200 space-y-6">
                                <div className="flex justify-between items-center mb-1">
                                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Vendor Registration</h2>
                                    {!readOnly && (
                                        <button onClick={() => {
                                            const arr = [...(formData.vendor_registrations || [])];
                                            arr.push({ vendor_name: '', is_reg_form: false, reg_form_files: [], is_wo: false, wo_files: [], is_closing: false, closing_files: [] });
                                            setFormData({ ...formData, vendor_registrations: arr });
                                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-4 py-1.5 font-bold flex items-center gap-1 transition-colors text-sm">+ Add Vendor</button>
                                    )}
                                </div>

                                <div className="bg-slate-50/50 border border-slate-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/50 border-b border-slate-200">
                                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendor Name</th>
                                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Reg. Form</th>
                                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Work Order</th>
                                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Closing Bill</th>
                                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {formData.vendor_registrations?.map((vendor: any, i: number) => (
                                                    <tr key={i} className="group hover:bg-white transition-colors">
                                                        <td className="py-3 px-4 align-top w-1/3">
                                                            <VendorSearchInput
                                                                siteId={siteId}
                                                                value={vendor.vendor_name}
                                                                onChange={(val) => updateNested('vendor_registrations', i, 'vendor_name', val)}
                                                                readonly={false}
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="flex gap-1 bg-white border border-slate-200 p-1 w-fit">
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'Yes')} className={`px-3 py-1 text-[10px] font-bold transition-all ${vendor.is_reg_form === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-400 hover:bg-slate-50'}`}>Yes</button>
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'No')} className={`px-3 py-1 text-[10px] font-bold transition-all ${vendor.is_reg_form === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-200' : 'text-slate-400 hover:bg-slate-50'}`}>No</button>
                                                                </div>
                                                                {vendor.is_reg_form === 'No' && (
                                                                    <input type="text" placeholder="Reason?" value={vendor.reg_form_reason || ''}
                                                                        onChange={e => updateNested('vendor_registrations', i, 'reg_form_reason', e.target.value)}
                                                                        className="w-full min-w-[100px] p-2 text-[10px] bg-white border border-red-100 outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-300 font-medium" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="flex gap-1 bg-white border border-slate-200 p-1 w-fit">
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'Yes')} className={`px-3 py-1 text-[10px] font-bold transition-all ${vendor.is_wo === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-400 hover:bg-slate-50'}`}>Yes</button>
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'No')} className={`px-3 py-1 text-[10px] font-bold transition-all ${vendor.is_wo === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-200' : 'text-slate-400 hover:bg-slate-50'}`}>No</button>
                                                                </div>
                                                                {vendor.is_wo === 'No' && (
                                                                    <input type="text" placeholder="Reason?" value={vendor.wo_reason || ''}
                                                                        onChange={e => updateNested('vendor_registrations', i, 'wo_reason', e.target.value)}
                                                                        className="w-full min-w-[100px] p-2 text-[10px] bg-white border border-red-100 outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-300 font-medium" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="flex gap-1 bg-white border border-slate-200 p-1 w-fit">
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'Yes')} className={`px-3 py-1 text-[10px] font-bold transition-all ${vendor.is_closing === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-400 hover:bg-slate-50'}`}>Yes</button>
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'No')} className={`px-3 py-1 text-[10px] font-bold transition-all ${vendor.is_closing === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-200' : 'text-slate-400 hover:bg-slate-50'}`}>No</button>
                                                                </div>
                                                                {vendor.is_closing === 'No' && (
                                                                    <input type="text" placeholder="Reason?" value={vendor.closing_reason || ''}
                                                                        onChange={e => updateNested('vendor_registrations', i, 'closing_reason', e.target.value)}
                                                                        className="w-full min-w-[100px] p-2 text-[10px] bg-white border border-red-100 outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-300 font-medium" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            {!readOnly && (
                                                                <button onClick={() => {
                                                                    const copy = { ...formData };
                                                                    copy.vendor_registrations.splice(i, 1);
                                                                    setFormData({ ...copy });
                                                                }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {(!formData.vendor_registrations || formData.vendor_registrations.length === 0) && (
                                        <div className="text-slate-400 text-sm font-medium py-10 text-center bg-white">No vendors added. Click "+ Add Vendor" to start.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {task.form_type !== 'cbd' && step === 4 && (
                            <ScheduleTargets
                                rows={formData.monthly_schedule_today || []}
                                setRows={rows => setFormData({ ...formData, monthly_schedule_today: rows })}
                                allTargets={task.dynamic_schema?.monthly_schedule_all || formData.monthly_schedule_today || []}
                                summary={task.dynamic_schema?.monthly_schedule_summary}
                                reportDate={reportDate}
                                readOnly={readOnly}
                            />
                        )}

                        {task.form_type !== 'cbd' && step === 5 && (
                            <EquipmentSection
                                rows={formData.equipments || []}
                                setRows={rows => setFormData({ ...formData, equipments: rows })}
                                readOnly={readOnly}
                            />
                        )}

                        {task.form_type !== 'cbd' && step === 6 && (
                            <MaterialsSection
                                rows={formData.priority_materials || []}
                                setRows={rows => setFormData({ ...formData, priority_materials: rows })}
                                readOnly={readOnly}
                            />
                        )}

                        {task.form_type !== 'cbd' && step === 7 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Safety Observations Table */}
                                <div className="bg-white p-6 border border-[#F3F4F6] space-y-4">
                                    <h2 className="text-md font-black text-[#111827] tracking-tight uppercase px-1">SAFETY OBSERVATIONS</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                                    <th className="py-2.5 px-4 sticky left-0 bg-[#F9FAFB] z-10 w-48">TOWER / LOCATION</th>
                                                    <th className="py-2.5 px-4 text-center">INTERNAL SAFETY OBSERVATION</th>
                                                    <th className="py-2.5 px-4 text-center">CLIENT SAFETY OBSERVATION</th>
                                                    <th className="py-2.5 px-4 text-center">NC</th>
                                                    <th className="py-2.5 px-4 text-center">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#F3F4F6]">
                                                {formData.safety_quality?.tower_observations?.map((obs: any, i: number) => (
                                                    <tr key={i} className="hover:bg-[#F9FAFB]/50 transition-colors group">
                                                        <td className="py-3 px-4 font-bold text-[#111827] text-xs sticky left-0 bg-white group-hover:bg-[#F9FAFB]/50 transition-colors z-10 border-r border-[#F3F4F6]">
                                                            {obs.towerName || obs.tower_name || 'Site'}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.internal_safety ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].internal_safety = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.client_safety ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].client_safety = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.safety_nc ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].safety_nc = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] text-center text-xs font-bold text-orange-600 outline-none focus:border-orange-500" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-bold text-xs text-[#111827] bg-[#F9FAFB]/30">
                                                            {(Number(obs.internal_safety) || 0) + (Number(obs.client_safety) || 0) + (Number(obs.safety_nc) || 0)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Quality Observations Table */}
                                <div className="bg-white p-6 border border-[#F3F4F6] space-y-4">
                                    <h2 className="text-md font-black text-[#111827] tracking-tight uppercase px-1">QUALITY OBSERVATIONS</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                                    <th className="py-2.5 px-4 sticky left-0 bg-[#F9FAFB] z-10 w-48">TOWER / LOCATION</th>
                                                    <th className="py-2.5 px-4 text-center">INTERNAL QUALITY OBSERVATION</th>
                                                    <th className="py-2.5 px-4 text-center">CLIENT QUALITY OBSERVATION</th>
                                                    <th className="py-2.5 px-4 text-center">NC</th>
                                                    <th className="py-2.5 px-4 text-center">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#F3F4F6]">
                                                {formData.safety_quality?.tower_observations?.map((obs: any, i: number) => (
                                                    <tr key={i} className="hover:bg-[#F9FAFB]/50 transition-colors group">
                                                        <td className="py-3 px-4 font-bold text-[#111827] text-xs sticky left-0 bg-white group-hover:bg-[#F9FAFB]/50 transition-colors z-10 border-r border-[#F3F4F6]">
                                                            {obs.towerName || obs.tower_name || 'Site'}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.internal_quality ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].internal_quality = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.client_quality ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].client_quality = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.quality_nc ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].quality_nc = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] text-center text-xs font-bold text-red-600 outline-none focus:border-red-500" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-bold text-xs text-[#111827] bg-[#F9FAFB]/30">
                                                            {(Number(obs.internal_quality) || 0) + (Number(obs.client_quality) || 0) + (Number(obs.quality_nc) || 0)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <IssuesSection
                                    rows={formData.safety_quality?.detailed_issues || []}
                                    setRows={rows => setFormData({
                                        ...formData,
                                        safety_quality: { ...formData.safety_quality, detailed_issues: rows }
                                    })}
                                    readOnly={readOnly}
                                />
                            </div>
                        )}

                        {task.form_type !== 'cbd' && step === 8 && (
                            <div className="space-y-6 relative">
                                <div className="flex items-center justify-between px-1">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-black text-black tracking-tight uppercase">Action Items & Issues</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Review and update pending project issues</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newIssue = {
                                                id: Date.now(),
                                                // Explicit, so "is this the filler's own row?" does not
                                                // rest on a timestamp comparison alone.
                                                is_manual: true,
                                                description: '',
                                                status: 'open',
                                                department: 'Unassigned', // Legacy
                                                issue_type: 'Other', // Legacy
                                                daily_remark: '',
                                                assignments: [],
                                                new_attachments: [],
                                                reviewer_id: null,
                                                reviewer_name: null
                                            };
                                            setFormData({ ...formData, other_issues: [...(formData.other_issues || []), newIssue] });
                                        }}
                                        className="px-4 py-2 bg-[#136dec] hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all"
                                    >
                                        <Plus size={16} strokeWidth={3} /> Log New Issue
                                    </button>
                                </div>

                                <div className="space-y-4 pb-12">
                                    {(!formData.other_issues || formData.other_issues.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-slate-100 border-dashed">
                                            <div className="size-16 bg-slate-50 flex items-center justify-center rounded-full mb-4 border border-slate-100">
                                                <AlertCircle size={24} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-1">No Action Items</h3>
                                            <p className="text-[11px] font-medium text-slate-500 max-w-sm">No issues or action items have been logged for this report yet.</p>
                                        </div>
                                    ) : (
                                        formData.other_issues.map((issue: any, i: number) => {
                                            // A timestamp id is how a row added on this form has
                                            // always been recognised, but an item added on mobile
                                            // carries an explicit flag instead — honour both, or a
                                            // phone-raised action locks the moment it is opened here.
                                            const isNew = issue.is_manual === true || issue.id > 1700000000000;
                                            const hasEmployeeOrDept = (issue.assignments?.some((a: any) => a.type === 'employee' || a.type === 'department')) || (issue.responsible && issue.responsible.length > 0);
                                            const hasReviewer = !!issue.reviewer_id;

                                            return (
                                                <div key={i} className="bg-white border border-slate-200 transition-all group overflow-hidden relative">
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${issue.status === 'Open' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                                    <div className="p-5 flex flex-col gap-4">
                                                        {/* Card Header: Assignment Controls */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {!hasEmployeeOrDept && isNew && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => { setActiveIssueIndex(i); setTagType('#'); setTagQuery(''); setShowTagPopover(true); }}
                                                                            className="px-2 py-0.5 border border-orange-200 text-orange-600 bg-orange-50 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-orange-100 transition-colors"
                                                                        >
                                                                            <Building size={10} /> Assign Dept
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setActiveIssueIndex(i); setTagType('@'); setTagQuery(''); setShowTagPopover(true); }}
                                                                            className="px-2 py-0.5 border border-blue-200 text-blue-600 bg-blue-50 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                                        >
                                                                            <User size={10} /> Assign Employee
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {!hasReviewer && isNew && (
                                                                    <button
                                                                        onClick={() => { setActiveIssueIndex(i); setTagType('^'); setTagQuery(''); setShowTagPopover(true); }}
                                                                        className="px-2 py-0.5 border border-purple-200 text-purple-600 bg-purple-50 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-purple-100 transition-colors"
                                                                    >
                                                                        <User size={10} /> Set Reviewer
                                                                    </button>
                                                                )}
                                                                {!isNew && !issue.mom_point_id && (
                                                                    <div className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-slate-200">
                                                                        <Lock size={10} /> Locked Case
                                                                    </div>
                                                                )}
                                                                {issue.source === 'MOM' && (
                                                                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-200">
                                                                        <MessageSquare size={10} /> MOM ID: #{issue.mom_point_id}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`px-2 py-0.5 border font-black text-[9px] uppercase tracking-widest ${issue.status === 'Open' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                                    {issue.status?.toUpperCase()}
                                                                </div>
                                                                {isNew && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const copy = { ...formData };
                                                                            copy.other_issues.splice(i, 1);
                                                                            setFormData(copy);
                                                                        }}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Description Area */}
                                                        {isNew ? (
                                                            <textarea
                                                                value={issue.description || ''}
                                                                onChange={e => {
                                                                    const value = e.target.value;
                                                                    const copy = { ...formData };
                                                                    copy.other_issues[i].description = value;
                                                                    setFormData(copy);

                                                                    const cursorPos = e.target.selectionStart || 0;
                                                                    const textBeforeCursor = value.slice(0, cursorPos);
                                                                    const lastChar = value[cursorPos - 1];
                                                                    const words = textBeforeCursor.split(/\s/);
                                                                    const lastWord = words[words.length - 1];

                                                                    if (lastChar === '@' || lastChar === '#' || lastChar === '^') {
                                                                        setActiveIssueIndex(i);
                                                                        setTagType(lastChar as any);
                                                                        handleTagSearch('', lastChar as any);
                                                                        setShowTagPopover(true);
                                                                    } else if (showTagPopover && lastWord.startsWith(tagType)) {
                                                                        handleTagSearch(lastWord.slice(1), tagType);
                                                                    }
                                                                }}
                                                                placeholder="Describe the issue... (use buttons or type @name / #dept)"
                                                                className="w-full p-0 bg-transparent border-none text-[15px] font-bold text-black placeholder:text-slate-300 resize-none min-h-[60px] focus:ring-0 focus:outline-none"
                                                                rows={2}
                                                            />
                                                        ) : (
                                                            <p className={`text-[15px] font-bold leading-relaxed tracking-tight break-words ${issue.status === 'Closed' ? 'text-slate-400 line-through italic' : 'text-slate-900'}`}>
                                                                {issue.description}
                                                            </p>
                                                        )}

                                                        {/* Assignment List */}
                                                        {(issue.assignments?.length > 0 || issue.reviewer_id) && (
                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                {issue.reviewer_id && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold">
                                                                        <span className="opacity-60 uppercase tracking-tighter">Reviewer:</span>
                                                                        <span>{issue.reviewer_name}</span>
                                                                        <button onClick={() => {
                                                                            const copy = { ...formData };
                                                                            copy.other_issues[i].reviewer_id = null;
                                                                            copy.other_issues[i].reviewer_name = null;
                                                                            setFormData(copy);
                                                                        }} className="hover:text-purple-900"><X size={10} /></button>
                                                                    </div>
                                                                )}
                                                                {issue.assignments?.map((a: any, idx: number) => (
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 text-black text-[10px] font-bold`}>
                                                                        {a.type === 'department' ? <Building size={12} className="text-blue-600" /> : <User size={12} className="text-emerald-600" />}
                                                                        <span className="uppercase tracking-tight">{a.name}</span>
                                                                        {isNew && !readOnly && (
                                                                            <button onClick={() => {
                                                                                const copy = { ...formData };
                                                                                copy.other_issues[i].assignments.splice(idx, 1);
                                                                                setFormData(copy);
                                                                            }} className="hover:text-red-600"><X size={10} /></button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Attachment Section */}
                                                        {((issue.attachments?.length > 0) || (issue.new_attachments?.length > 0)) && (
                                                            <div className="flex flex-wrap gap-3 pb-2 pt-1">
                                                                {issue.attachments?.map((f: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 group">
                                                                        <Paperclip size={12} className="text-blue-500" />
                                                                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{f.file_name}</span>
                                                                        <button onClick={() => {
                                                                            const copy = { ...formData };
                                                                            copy.other_issues[i].attachments.splice(idx, 1);
                                                                            setFormData(copy);
                                                                        }} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                                                                    </div>
                                                                ))}
                                                                {issue.new_attachments?.map((f: File, idx: number) => (
                                                                    <div key={`new-${idx}`} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 group">
                                                                        {f.type.startsWith('image/') ? <Image size={12} className="text-emerald-500" /> : <Paperclip size={12} className="text-blue-500" />}
                                                                        <span className="text-[10px] font-bold text-slate-600 italic truncate max-w-[120px]">{f.name} (New)</span>
                                                                        <button onClick={() => {
                                                                            const copy = { ...formData };
                                                                            copy.other_issues[i].new_attachments.splice(idx, 1);
                                                                            setFormData(copy);
                                                                        }} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Footer: Daily Update & File Dropdown */}
                                                        <div className="pt-4 border-t border-slate-50 flex flex-col gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 relative">
                                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                                        <MessageSquare size={14} />
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        placeholder={isNew || issue.source === 'MOM' ? "Add daily update or remark..." : "Remark locked for historical items"}
                                                                        value={issue.daily_remark || issue.dailyRemark || ''}
                                                                        disabled={!isNew && issue.source !== 'MOM'}
                                                                        onChange={e => {
                                                                            const copy = { ...formData };
                                                                            copy.other_issues[i].daily_remark = e.target.value;
                                                                            copy.other_issues[i].dailyRemark = e.target.value;
                                                                            setFormData(copy);
                                                                        }}
                                                                        className={`w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 ${(!isNew && issue.source !== 'MOM') ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                                    />
                                                                </div>
                                                                {(isNew || issue.source === 'MOM') && (
                                                                    <div className="flex items-center gap-3">
                                                                        {issue.mom_point_id && (
                                                                            <button
                                                                                onClick={() => fetchDiscussion(issue.mom_point_id)}
                                                                                className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-2 py-1 transition-colors border border-blue-100"
                                                                            >
                                                                                <MessageSquare size={14} /> History
                                                                            </button>
                                                                        )}
                                                                        {!readOnly && isNew && (
                                                                            <button
                                                                                onClick={() => document.getElementById(`file-input-${i}`)?.click()}
                                                                                className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-2 py-1 transition-colors"
                                                                            >
                                                                                <Paperclip size={14} /> Attach
                                                                            </button>
                                                                        )}
                                                                        <input id={`file-input-${i}`} type="file" className="hidden" multiple onChange={e => handleFileChange(e, i)} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Tag Popover */}
                                                    {showTagPopover && activeIssueIndex === i && (
                                                        <div ref={popoverRef} className="absolute top-16 left-5 w-64 bg-white border border-slate-100 z-50 p-2 overflow-hidden overflow-y-auto max-h-64 custom-scrollbar">
                                                            <div className="p-2 border-b border-slate-50 mb-1">
                                                                <input
                                                                    type="text"
                                                                    value={tagQuery}
                                                                    onChange={(e) => handleTagSearch(e.target.value, tagType)}
                                                                    autoFocus
                                                                    placeholder={`Search ${tagType === '#' ? 'departments' : 'employees'}...`}
                                                                    className="w-full text-[11px] font-bold p-2 bg-slate-50 border border-slate-100 outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                            {tagResults.length > 0 ? tagResults.map((item: any) => (
                                                                <button key={item.id} onClick={() => selectTag(item, i)} className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors text-left group">
                                                                    <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                                        {tagType === '@' ? <User size={14} className="text-emerald-600" /> : tagType === '#' ? <Building size={14} className="text-blue-600" /> : <User size={14} className="text-purple-600" />}
                                                                    </div>
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="text-[11px] font-black uppercase tracking-tight truncate">{item.name || `${item.first_name} ${item.last_name}`}</span>
                                                                        <span className="text-[9px] text-slate-400 font-bold uppercase truncate">{item.designation || 'Participant'}</span>
                                                                    </div>
                                                                </button>
                                                            )) : (
                                                                <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase">No results found</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Discussion Modal */}
                        {showDiscussionId && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 px-4 md:px-0">
                                <div className="w-full md:w-[450px] h-[95vh] bg-white border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 md:mr-0 mr-[-16px]">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Discussion History</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MOM Point #{showDiscussionId}</p>
                                        </div>
                                        <button
                                            onClick={() => setShowDiscussionId(null)}
                                            className="p-2 hover:bg-white text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/20">
                                        {loadingDiscussion ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                                <div className="size-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching messages...</p>
                                            </div>
                                        ) : discussionMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                                                <div className="size-16 bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                                    <MessageSquare size={24} className="text-slate-200" />
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 mb-1">No Discussion Found</h4>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter max-w-[200px]">There are no messages recorded for this action item yet.</p>
                                            </div>
                                        ) : (
                                            discussionMessages.map((msg, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{msg.first_name} {msg.last_name}</span>
                                                        <span className="text-[9px] font-bold text-slate-400">{new Date(msg.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className="p-4 bg-white border border-slate-200 text-sm text-slate-700 leading-relaxed break-words font-medium">
                                                        {msg.message}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="p-6 border-t border-slate-100 bg-white">
                                        <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest leading-relaxed">
                                            Submit your DPR to post new remarks to this discussion.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Full Screen Footer */}
            <footer className="px-6 lg:px-10 py-3 border-t border-slate-200 bg-white flex items-center justify-between sticky bottom-0 z-10">
                <button
                    onClick={handleBack}
                    className={`px-5 py-2 bg-white hover:border-slate-900 hover:text-slate-900 text-slate-600 font-semibold transition-colors flex items-center gap-2 border border-slate-200 text-xs ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div className="flex items-center gap-3">
                    {step < steps.length ? (
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center gap-2 group text-xs"
                        >
                            Continue
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        !readOnly && (
                            <button
                                onClick={() => onSubmit(formData)}
                                disabled={submitting}
                                className="px-8 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 text-xs"
                            >
                                {submitting ? 'Saving…' : isCorrecting ? 'Save Correction' : 'Submit Report'}
                                <Check size={16} />
                            </button>
                        )
                    )}
                </div>
            </footer>
        </div>
    );
}
