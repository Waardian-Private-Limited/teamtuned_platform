"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Search, UploadCloud, ChevronRight, Check, ArrowLeft, Save, Plus, Trash2, AlertCircle, Building, User, MessageSquare, X, Paperclip, Image, Lock } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

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
    status: 'pending' | 'submitted' | 'reviewed';
    dynamic_schema: any;
    submitted_data: any;
    created_at: string;
    updated_at: string;
    is_monthly?: boolean;
    scope?: string;
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
                className="p-2 border border-blue-100 rounded-lg outline-none text-sm w-full bg-blue-50/50 focus:border-blue-400 font-bold text-gray-700"
            />
            {isOpen && !readonly && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
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
                        <span key={u.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">
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
                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                )}
                {isOpen && !readonly && results.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        Concrete Progress
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center bg-slate-50/80 p-5 rounded-xl border border-slate-200/60">
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
                                className="p-2.5 w-full bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all" placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Deployment */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Staff Deployment <span className="text-sm font-semibold text-slate-400 normal-case tracking-normal">(Actual vs Planned)</span></h2>
                <div className="space-y-2">
                    {data.staff?.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col gap-2 py-4 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm text-slate-800">{item.role || item.designation}</span>
                                {item.towerId && item.towerId !== 'Overall' && <span className="text-xs font-semibold px-2 py-1 bg-slate-200/50 text-slate-600 rounded-md">Loc: {item.towerId}</span>}
                            </div>
                            <div className={`grid ${readonly ? 'grid-cols-[1fr_100px_120px]' : 'grid-cols-[1fr_120px]'} gap-4 items-center mt-1`}>
                                <span className="text-sm text-slate-500 font-medium flex items-center gap-2">Planned: <span className="font-bold text-slate-700 bg-white px-3 py-1.5 rounded-md border border-slate-200 block text-center min-w-[60px]">{item.planned}</span></span>
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        min="0"
                                        readOnly={readonly}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        placeholder="Actual" value={item.actual ?? ''}
                                        onChange={e => updateNested('staff', i, 'actual', Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`p-2 w-full bg-white border border-slate-300 rounded-lg outline-none text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold ${!readonly && 'pr-6'} transition-all`}
                                    />
                                    {!readonly && <span className="text-red-500 absolute font-bold top-1/2 -translate-y-1/2 right-2.5">*</span>}
                                </div>
                                {readonly && (
                                    <div className="flex flex-col gap-0.5 mt-[-4px]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Variance</span>
                                        <span className={`px-3 py-1.5 rounded-md border font-bold text-center text-sm ${((item.actual || 0) - (item.planned || 0)) < 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Labour Deployment <span className="text-sm font-semibold text-slate-400 normal-case tracking-normal">(Actual vs Planned)</span></h2>
                <div className="space-y-2">
                    {data.labor?.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col gap-2 py-4 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm text-slate-800">{item.type || item.name}</span>
                                {item.towerId && item.towerId !== 'Overall' && <span className="text-xs font-semibold px-2 py-1 bg-slate-200/50 text-slate-600 rounded-md">Loc: {item.towerId}</span>}
                            </div>
                            <div className={`grid ${readonly ? 'grid-cols-[1fr_100px_120px]' : 'grid-cols-[1fr_120px]'} gap-4 items-center mt-1`}>
                                <span className="text-sm text-slate-500 font-medium flex items-center gap-2">Planned: <span className="font-bold text-slate-700 bg-white px-3 py-1.5 rounded-md border border-slate-200 block text-center min-w-[60px]">{item.planned}</span></span>
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        min="0"
                                        readOnly={readonly}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        placeholder="Actual" value={item.actual ?? ''}
                                        onChange={e => updateNested('labor', i, 'actual', Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`p-2 w-full bg-white border border-slate-300 rounded-lg outline-none text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold ${!readonly && 'pr-6'} transition-all`}
                                    />
                                    {!readonly && <span className="text-red-500 absolute font-bold top-1/2 -translate-y-1/2 right-2.5">*</span>}
                                </div>
                                {readonly && (
                                    <div className="flex flex-col gap-0.5 mt-[-4px]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Variance</span>
                                        <span className={`px-3 py-1.5 rounded-md border font-bold text-center text-sm ${((item.actual || 0) - (item.planned || 0)) < 0 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 hover:shadow-md transition-shadow">
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
                            <div key={i} className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-4 items-center p-4 rounded-xl border ${item.achieved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200'} hover:border-blue-200 transition-colors`}>
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-sm text-slate-800">{displayName}</span>
                                    {item.achieved && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-100/50 w-fit px-2 py-0.5 rounded-md">Already Achieved</span>}
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
                                    className="p-2 bg-white border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Equipments Tracker Section */}
            {data.equipments?.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
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
                            <div key={i} className="grid grid-cols-[1.5fr_1fr_100px_100px] gap-4 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <div className="font-bold text-sm text-slate-900">{eq.type}</div>
                                <div className="text-xs font-semibold px-2 py-1 bg-slate-200/50 text-slate-600 rounded-md w-fit">Overall</div>
                                <div className="text-center font-bold text-blue-600 bg-white px-2 py-1.5 rounded-lg border border-slate-200">{eq.planned || 0}</div>
                                <input
                                    type="number"
                                    min="0"
                                    readOnly={readonly}
                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                    value={eq.actual ?? ''}
                                    placeholder="0"
                                    onChange={e => updateNested('equipments', i, 'actual', Math.max(0, parseInt(e.target.value) || 0))}
                                    className="p-2 w-full bg-white border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-center font-bold transition-all"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Material Procurement Tracking */}
            {data.priority_materials && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Priority Material Tracking</h2>
                        {!readonly && (
                            <button onClick={() => {
                                const arr = [...(data.priority_materials || [])];
                                arr.push({ name: '', intent_no_date: '', quantity: '', requiredDate: '', status: 'Pending' });
                                setData({ ...data, priority_materials: arr });
                            }} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 font-bold flex items-center gap-1 rounded-lg transition-colors text-sm shadow-sm">+ Add Material</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {data.priority_materials.map((mat: any, i: number) => (
                            <div key={i} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <input type="text" placeholder="Material Name" value={mat.name || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'name', e.target.value)} className="p-2 border border-slate-300 rounded-lg outline-none text-sm font-bold bg-white w-full md:w-auto flex-1 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                                <input type="text" placeholder="Intent No & Date" value={mat.intent_no_date || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'intent_no_date', e.target.value)} className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white w-full md:w-auto flex-[0.8] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                                <input type="text" placeholder="Units / Qty" value={mat.quantity || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'quantity', e.target.value)} className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white w-full md:w-auto flex-[0.8] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                                <input type="date" value={mat.requiredDate || ''} readOnly={readonly} onChange={e => updateNested('priority_materials', i, 'requiredDate', e.target.value)} className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white w-full md:max-w-[150px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" />
                                {!readonly && (
                                    <button onClick={() => {
                                        const copy = { ...data };
                                        copy.priority_materials.splice(i, 1);
                                        setData(copy);
                                    }} className="text-red-500 bg-red-50 hover:bg-red-100 rounded-lg p-2 transition-colors self-end md:self-auto ml-auto md:ml-0"><span className="font-bold text-lg leading-none">&times;</span></button>
                                )}
                            </div>
                        ))}
                        {(!data.priority_materials || data.priority_materials.length === 0) && (
                            <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">No materials added.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Other Issues */}
            {data.other_issues && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">Other Issues Tracking</h2>
                        {!readonly && (
                            <button onClick={() => {
                                const arr = [...(data.other_issues || [])];
                                arr.push({ department: '', issue_type: '', description: '', responsible: [], daily_remark: '', status: 'Open' });
                                setData({ ...data, other_issues: arr });
                            }} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-1.5 font-bold flex items-center gap-1 rounded-lg transition-colors text-sm shadow-sm">+ Add Issue</button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {data.other_issues.map((issue: any, i: number) => (
                            <div key={i} className="flex flex-col gap-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <select disabled={readonly} value={issue.department || ''} onChange={e => updateNested('other_issues', i, 'department', e.target.value)} className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white flex-1 min-w-[150px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium">
                                        <option value="">Select Dept</option>
                                        {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                    <select disabled={readonly} value={issue.issue_type || ''} onChange={e => updateNested('other_issues', i, 'issue_type', e.target.value)} className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white flex-1 min-w-[150px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium">
                                        <option value="">Select Issue Type</option>
                                        {['Execution', 'Store', 'Purchase', 'Safety', 'Quality', 'HR', 'Steel Yard', 'Other'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <select disabled={readonly} value={issue.status || 'Open'} onChange={e => updateNested('other_issues', i, 'status', e.target.value)} className={`p-2 border rounded-lg outline-none text-xs font-bold w-[100px] text-center focus:ring-2 focus:ring-offset-1 ${issue.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 focus:ring-emerald-500' : 'bg-orange-100 text-orange-800 border-orange-200 focus:ring-orange-500'}`}>
                                        <option value="Open">OPEN</option>
                                        <option value="Closed">CLOSED</option>
                                    </select>
                                    <UserSearchInput readonly={readonly} value={issue.responsible} onChange={(val) => updateNested('other_issues', i, 'responsible', val)} />
                                    {!readonly && (
                                        <button onClick={() => {
                                            const copy = { ...data };
                                            copy.other_issues.splice(i, 1);
                                            setData(copy);
                                        }} className="text-red-500 bg-red-50 hover:bg-red-100 rounded-lg p-2 transition-colors ml-auto md:ml-0"><span className="font-bold text-lg leading-none">&times;</span></button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <input type="text" placeholder="Issue Description" value={issue.description || ''} readOnly={readonly} onChange={e => updateNested('other_issues', i, 'description', e.target.value)} className="p-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white flex-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold" />
                                    <input type="text" placeholder="Daily remark or update..." value={issue.daily_remark || ''} readOnly={readonly} onChange={e => updateNested('other_issues', i, 'daily_remark', e.target.value)} className="p-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white flex-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                                </div>
                            </div>
                        ))}
                        {(!data.other_issues || data.other_issues.length === 0) && (
                            <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">No issues tracked.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Quality Action Items */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Quality Action Items (NCs)</h2>
                </div>

                {data.safety_quality && (
                    <div className="grid grid-cols-1 gap-6">
                        {['client_nc', 'empire_nc'].map((ncType) => (
                            <div key={ncType} className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                <div className="font-bold text-slate-700 uppercase tracking-widest text-xs flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <span>{ncType === 'client_nc' ? 'Client Quality NC' : 'Empire Quality NC'}</span>
                                    {!readonly && (
                                        <button onClick={() => {
                                            const arr = [...(data.safety_quality[ncType] || [])];
                                            arr.push({ towerId: '', issue: '', total_closed: '' });
                                            setData({ ...data, safety_quality: { ...data.safety_quality, [ncType]: arr } });
                                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-3 py-1 font-bold flex items-center gap-1 rounded transition-colors">+ Add NC</button>
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
                                        }} className="p-2 outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white border border-slate-300 rounded-lg font-medium">
                                            <option value="">Select Location</option>
                                            {data.safety_quality.towers?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="text" value={item.issue || ''} readOnly={readonly} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].issue = e.target.value;
                                            setData(copy);
                                        }} placeholder="Observation details..." className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold" />
                                        <input type="number" min="0" value={item.total_count || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_count = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:border-orange-500 text-center font-bold text-orange-600 focus:ring-2 focus:ring-orange-500/20" />
                                        <input type="number" min="0" value={item.total_closed || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_closed = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:border-emerald-500 text-center font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20" />
                                        <select disabled={readonly} value={item.status || 'Open'} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].status = e.target.value;
                                            setData(copy);
                                        }} className={`p-1.5 border rounded-lg outline-none text-xs font-bold text-center ${item.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                                            <option value="Open">OPEN</option>
                                            <option value="Closed">CLOSED</option>
                                        </select>
                                        {!readonly && (
                                            <button onClick={() => {
                                                const copy = { ...data };
                                                copy.safety_quality[ncType].splice(i, 1);
                                                setData(copy);
                                            }} className="text-red-500 bg-red-50 hover:bg-red-100 rounded-lg p-1.5 transition-colors"><span className="font-bold text-lg leading-none block px-1">&times;</span></button>
                                        )}
                                    </div>
                                ))}
                                {(!data.safety_quality[ncType] || data.safety_quality[ncType].length === 0) && (
                                    <div className="text-slate-400 text-sm font-medium py-3 text-center border border-dashed border-slate-200 rounded-xl bg-white/50">No NC items logged.</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Safety Action Items */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Safety Action Items</h2>
                </div>

                {data.safety_quality && (
                    <div className="grid grid-cols-1 gap-6">
                        {['client_safety', 'empire_safety'].map((ncType) => (
                            <div key={ncType} className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                <div className="font-bold text-slate-700 uppercase tracking-widest text-xs flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <span>{ncType === 'client_safety' ? 'Client Safety' : 'Empire Safety'}</span>
                                    {!readonly && (
                                        <button onClick={() => {
                                            const arr = [...(data.safety_quality[ncType] || [])];
                                            arr.push({ towerId: '', issue: '', total_count: '', total_closed: '' });
                                            setData({ ...data, safety_quality: { ...data.safety_quality, [ncType]: arr } });
                                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-3 py-1 font-bold flex items-center gap-1 rounded transition-colors">+ Add Item</button>
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
                                        }} className="p-2 outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white border border-slate-300 rounded-lg font-medium">
                                            <option value="">Select Location</option>
                                            {data.safety_quality.towers?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="text" value={item.issue || ''} readOnly={readonly} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].issue = e.target.value;
                                            setData(copy);
                                        }} placeholder="Observation details..." className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold" />
                                        <input type="number" min="0" value={item.total_count || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_count = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:border-orange-500 text-center font-bold text-orange-600 focus:ring-2 focus:ring-orange-500/20" />
                                        <input type="number" min="0" value={item.total_closed || ''} readOnly={readonly} onWheel={(e) => e.currentTarget.blur()} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].total_closed = Math.max(0, parseInt(e.target.value) || 0);
                                            setData(copy);
                                        }} placeholder="0" className="p-2 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:border-emerald-500 text-center font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20" />
                                        <select disabled={readonly} value={item.status || 'Open'} onChange={e => {
                                            const copy = { ...data };
                                            copy.safety_quality[ncType][i].status = e.target.value;
                                            setData(copy);
                                        }} className={`p-1.5 border rounded-lg outline-none text-[10px] font-bold text-center ${item.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                                            <option value="Open">OPEN</option>
                                            <option value="Closed">CLOSED</option>
                                        </select>
                                        {!readonly && (
                                            <button onClick={() => {
                                                const copy = { ...data };
                                                copy.safety_quality[ncType].splice(i, 1);
                                                setData(copy);
                                            }} className="text-red-500 bg-red-50 hover:bg-red-100 rounded-lg p-1.5 transition-colors"><span className="font-bold text-lg leading-none block px-1">&times;</span></button>
                                        )}
                                    </div>
                                ))}
                                {(!data.safety_quality[ncType] || data.safety_quality[ncType].length === 0) && (
                                    <div className="text-slate-400 text-sm font-medium py-3 text-center border border-dashed border-slate-200 rounded-xl bg-white/50">No safety issues logged.</div>
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
                <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-2 cursor-pointer hover:border-blue-500 transition-colors w-full bg-white">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <UploadCloud size={16} /> {uploading ? "Uploading..." : "Attach File"}
                    </span>
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading || readonly} />
                </label>
            )}
            {(value || []).length > 0 && (
                <div className="flex flex-col gap-1">
                    {value.map((f: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-gray-50 p-2 border border-blue-100 rounded text-blue-800">
                            <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px] font-bold block" title={f.file_name}>{f.file_name}</a>
                            {!readonly && (
                                <button onClick={() => onChange(value.filter((_: any, idx: number) => idx !== i))} className="text-red-500 ml-2 font-bold px-2 hover:bg-red-50 rounded">✕</button>
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
                className="p-2 border border-gray-200 rounded-lg outline-none text-sm w-full bg-white focus:border-blue-400 font-bold"
            />
            {isOpen && !readonly && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-5">Billing Deadlines</h2>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 p-5 bg-purple-50/50 rounded-xl border border-purple-100 shadow-sm">
                        <label className="text-xs font-bold text-purple-600 uppercase tracking-widest block mb-1">Client Bill Target & Achieved Date</label>
                        <div className="flex gap-4 items-center mt-3">
                            <div className="flex-1">
                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                <p className="font-bold text-sm bg-white p-2.5 rounded-lg border border-purple-100 shadow-sm">{data.billing_targets?.client_target_date ? formatDate(data.billing_targets.client_target_date) : 'Not Set'}</p>
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                <input type="date" disabled={readonly} value={data.billing_targets?.client_achieved_date || ''}
                                    onChange={e => setData({ ...data, billing_targets: { ...data.billing_targets, client_achieved_date: e.target.value } })}
                                    className="w-full text-sm font-bold bg-white p-2.5 rounded-lg outline-none border border-purple-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-5 bg-orange-50/50 rounded-xl border border-orange-100 shadow-sm">
                        <label className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-1">Contractor Bill Target & Achieved Date</label>
                        <div className="flex gap-4 items-center mt-3">
                            <div className="flex-1">
                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                <p className="font-bold text-sm bg-white p-2.5 rounded-lg border border-orange-100 shadow-sm">{data.billing_targets?.contractor_target_date ? formatDate(data.billing_targets.contractor_target_date) : 'Not Set'}</p>
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                <input type="date" disabled={readonly} value={data.billing_targets?.contractor_achieved_date || ''}
                                    onChange={e => setData({ ...data, billing_targets: { ...data.billing_targets, contractor_achieved_date: e.target.value } })}
                                    className="w-full text-sm font-bold bg-white p-2.5 rounded-lg outline-none border border-orange-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Steel Reconciliation */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Steel Reconciliation</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Received Steel <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_received ?? ''} disabled={readonly} title="Total Received Steel"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_received: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Billed Steel <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_billed ?? ''} disabled={readonly} title="Total Billed Steel"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_billed: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">WIP Steel <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.wip_steel ?? ''} disabled={readonly} title="WIP Steel"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), wip_steel: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">JMR Total <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.jmr_total ?? ''} disabled={readonly} title="JMR Total"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), jmr_total: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Stock <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_stock ?? ''} disabled={readonly} title="Total Stock"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_stock: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Total Scrap <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.total_scrap ?? ''} disabled={readonly} title="Total Scrap"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), total_scrap: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">% Wastage <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={data.steel_reconciliation?.wastage_percent ?? ''} disabled={readonly} title="% Wastage"
                            onChange={e => setData({ ...data, steel_reconciliation: { ...(data.steel_reconciliation || {}), wastage_percent: Math.max(0, parseFloat(e.target.value) || 0) } })}
                            className="w-full p-2.5 border border-red-200 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50 text-red-700 transition-all shadow-sm" />
                    </div>
                </div>
            </div>

            {/* Daily Concrete Reconciliation */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Daily Concrete Reconciliation</h2>
                </div>

                <div className="grid gap-4">
                    {data.concrete_reconciliation?.map((item: any, i: number) => (
                        <div key={i} className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-3 relative">
                            <h3 className="font-bold text-sm text-slate-700 bg-white inline-block px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">{item.region}</h3>
                            <div className="grid grid-cols-4 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Theoretical <span className="text-red-500">*</span></label>
                                    <input type="number" min="0" value={item.theoretical ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'theoretical', Math.max(0, parseFloat(e.target.value) || 0))} title="Theoretical Concrete" className="w-full p-2.5 border border-slate-300 font-bold bg-white rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Consumed <span className="text-red-500">*</span></label>
                                    <input type="number" min="0" value={item.consumed ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'consumed', Math.max(0, parseFloat(e.target.value) || 0))} title="Consumed Concrete" className="w-full p-2.5 border border-slate-300 font-bold bg-white rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Difference <span className="text-red-500">*</span></label>
                                    <input type="number" value={item.difference ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'difference', parseFloat(e.target.value) || 0)} title="Difference" className="w-full p-2.5 border border-slate-300 font-bold bg-white rounded-lg outline-none text-sm text-orange-600 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">% Wastage <span className="text-red-500">*</span></label>
                                    <input type="number" value={item.wastage_percent ?? ''} disabled={readonly} onChange={e => updateNested('concrete_reconciliation', i, 'wastage_percent', parseFloat(e.target.value) || 0)} title="% Wastage" className="w-full p-2.5 border border-red-200 font-bold bg-red-50 text-red-700 rounded-lg outline-none text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!data.concrete_reconciliation || data.concrete_reconciliation.length === 0) && (
                        <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">No concrete reconciliation regions found in site config.</div>
                    )}
                </div>
            </div>

            {/* Report Checklist with Files */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Report Checklist</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.report_checklist?.map((item: any, i: number) => (
                        <div key={i} className={`p-5 rounded-xl border transition-all duration-200 ${item.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50 shadow-sm' : item.status === 'No' ? 'border-red-200 bg-red-50/50 shadow-sm' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <span className="font-bold text-slate-700 text-sm flex-1 text-center sm:text-left">{item.description} <span className="text-red-500">*</span></span>
                                <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm shrink-0">
                                    <button disabled={readonly} onClick={() => updateNested('report_checklist', i, 'status', 'Yes')} className={`px-5 py-1.5 text-xs font-bold rounded-md transition-all ${item.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                    <button disabled={readonly} onClick={() => updateNested('report_checklist', i, 'status', 'No')} className={`px-5 py-1.5 text-xs font-bold rounded-md transition-all ${item.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                </div>
                            </div>
                            {item.status === 'No' && (
                                <div className="mt-5 pt-4 border-t border-red-100/50 transition-all">
                                    <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-widest">Reason / Remarks <span className="text-red-500">*</span></div>
                                    <input type="text" placeholder="Please provide a remark for 'No'..." value={item.remark || ''} disabled={readonly} title="Remarks"
                                        onChange={e => updateNested('report_checklist', i, 'remark', e.target.value)}
                                        className="w-full p-2.5 text-sm bg-white border border-red-200 rounded-lg outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Documents For Client Bill</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.documents_client_bill?.map((doc: any, i: number) => (
                        <div key={i} className={`p-5 rounded-xl border transition-all duration-200 ${doc.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50 shadow-sm' : doc.status === 'No' ? 'border-red-200 bg-red-50/50 shadow-sm' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <span className="font-bold text-slate-700 text-sm flex-1 text-center sm:text-left">{doc.document_name} <span className="text-red-500">*</span></span>
                                <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm shrink-0">
                                    <button disabled={readonly} onClick={() => updateNested('documents_client_bill', i, 'status', 'Yes')} className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${doc.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                    <button disabled={readonly} onClick={() => updateNested('documents_client_bill', i, 'status', 'No')} className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${doc.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                </div>
                            </div>
                            {doc.status === 'No' && (
                                <div className="mt-5 pt-4 border-t border-red-100/50 transition-all">
                                    <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-widest">Reason / Remarks <span className="text-red-500">*</span></div>
                                    <input type="text" placeholder="Please provide a reason..." value={doc.remark || ''} disabled={readonly} title="Remarks"
                                        onChange={e => updateNested('documents_client_bill', i, 'remark', e.target.value)}
                                        className="w-full p-2.5 text-sm bg-white border border-red-200 rounded-lg outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Vendor Registration */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Vendor Registration</h2>
                    {!readonly && (
                        <button onClick={() => {
                            const arr = [...(data.vendor_registrations || [])];
                            arr.push({ vendor_name: '', is_reg_form: false, reg_form_files: [], is_wo: false, wo_files: [], is_closing: false, closing_files: [] });
                            setData({ ...data, vendor_registrations: arr });
                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-4 py-1.5 font-bold flex items-center gap-1 rounded-lg transition-colors text-sm shadow-sm">+ Add Vendor</button>
                    )}
                </div>

                <div className="space-y-4">
                    {data.vendor_registrations?.map((vendor: any, i: number) => (
                        <div key={i} className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 relative shadow-sm">
                            {!readonly && (
                                <button onClick={() => {
                                    const copy = { ...data };
                                    copy.vendor_registrations.splice(i, 1);
                                    setData(copy);
                                }} className="absolute py-1 px-3 bg-red-50/50 font-bold rounded-lg text-red-500 right-4 hover:text-red-700 text-xs transition-colors top-4 z-10 flex items-center gap-1"><span className="text-base leading-none">&times;</span> Remove</button>
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
                                <div className={`p-4 rounded-xl border transition-all flex flex-col h-full shadow-sm ${vendor.is_reg_form === 'Yes' ? 'border-emerald-200 bg-emerald-50/10' : vendor.is_reg_form === 'No' ? 'border-red-200 bg-red-50/10' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex flex-col gap-3 flex-1">
                                        <span className="font-bold text-sm text-slate-800">Registration Form</span>
                                        <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit">
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'Yes')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_reg_form === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'No')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_reg_form === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                        </div>
                                    </div>
                                    {vendor.is_reg_form === 'No' && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Why no registration form?" value={vendor.reg_form_reason || ''} title="Registration Reason"
                                                onChange={e => updateNested('vendor_registrations', i, 'reg_form_reason', e.target.value)}
                                                className="w-full p-2 text-xs bg-white border border-red-200 rounded-lg outline-none font-medium focus:ring-2 focus:ring-red-500/20 shadow-sm" />
                                        </div>
                                    )}
                                </div>

                                {/* Work Order */}
                                <div className={`p-4 rounded-xl border transition-all flex flex-col h-full shadow-sm ${vendor.is_wo === 'Yes' ? 'border-emerald-200 bg-emerald-50/10' : vendor.is_wo === 'No' ? 'border-red-200 bg-red-50/10' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex flex-col gap-3 flex-1">
                                        <span className="font-bold text-sm text-slate-800">Work Order (WO)</span>
                                        <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit">
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'Yes')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_wo === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'No')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_wo === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                        </div>
                                    </div>
                                    {vendor.is_wo === 'No' && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Why no WO?" value={vendor.wo_reason || ''} title="WO Reason"
                                                onChange={e => updateNested('vendor_registrations', i, 'wo_reason', e.target.value)}
                                                className="w-full p-2 text-xs bg-white border border-red-200 rounded-lg outline-none font-medium focus:ring-2 focus:ring-red-500/20 shadow-sm" />
                                        </div>
                                    )}
                                </div>

                                {/* Closing Bill */}
                                <div className={`p-4 rounded-xl border transition-all flex flex-col h-full shadow-sm ${vendor.is_closing === 'Yes' ? 'border-emerald-200 bg-emerald-50/10' : vendor.is_closing === 'No' ? 'border-red-200 bg-red-50/10' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex flex-col gap-3 flex-1">
                                        <span className="font-bold text-sm text-slate-800">Closing Bill</span>
                                        <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit">
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'Yes')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_closing === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                            <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'No')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_closing === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                        </div>
                                    </div>
                                    {vendor.is_closing === 'No' && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Why no closing bill?" value={vendor.closing_reason || ''} title="Closing Reason"
                                                onChange={e => updateNested('vendor_registrations', i, 'closing_reason', e.target.value)}
                                                className="w-full p-2 text-xs bg-white border border-red-200 rounded-lg outline-none font-medium focus:ring-2 focus:ring-red-500/20 shadow-sm" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!data.vendor_registrations || data.vendor_registrations.length === 0) && (
                        <div className="text-slate-400 text-sm font-medium py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">No vendors added.</div>
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
        <div className="bg-white rounded-none border border-black p-4 shadow-none hover:bg-slate-50 transition-all group flex flex-col justify-between h-full relative">
            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <div className="w-8 h-8 bg-black rounded-none flex items-center justify-center text-white shrink-0">
                        <CheckCircle2 size={14} />
                    </div>
                    <span className="bg-white text-black px-2.5 py-1 rounded-none text-[8px] font-black uppercase tracking-widest border border-black">
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
                    <p className="text-[11px] font-black text-black">{formatDate(task.due_date)}</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-black/10 space-y-3">
                <button
                    onClick={() => onSelect(task)}
                    className="w-full py-2 bg-black hover:bg-zinc-800 text-white text-[9px] font-black rounded-none transition-all uppercase tracking-widest border border-black"
                >
                    Fill DPR
                </button>

                {isOrgAdmin && (
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-none border border-black/10">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-5 h-5 rounded-none bg-black flex items-center justify-center text-[8px] font-black text-white shrink-0">
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
                <div className="absolute inset-0 z-20 bg-white/95 rounded-none p-5 flex flex-col justify-center animate-in fade-in duration-200 border border-black">
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
                                className="px-6 py-2 text-[9px] font-black text-white bg-black hover:bg-zinc-800 disabled:opacity-30 rounded-none transition-all uppercase tracking-widest border border-black"
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
    const [showAllTargets, setShowAllTargets] = useState(false);

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
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in duration-300">
            {/* Full Screen Header */}
            <header className="px-12 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-[#111827] tracking-tight leading-tight">
                        {task.form_type === 'cbd' ? 'CBD Report' : 'Daily Progress Report'}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="bg-[#111827] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-tight">
                            Step {step} of {steps.length}
                        </span>
                        <span className="text-[#6B7280] font-bold text-xs">{currentStepData?.title}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!readOnly && (
                        <button
                            onClick={() => onSave(formData)}
                            disabled={submitting}
                            className="px-6 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] text-sm font-bold rounded-lg transition-all border border-[#E5E7EB]"
                        >
                            {/* No icon in image, keeping it clean */}
                            {submitting ? 'Saving...' : 'Save Draft'}
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <span className="text-2xl font-black">&times;</span>
                    </button>
                </div>
            </header>

            {/* Steps Navigation Bar */}
            <nav className="px-12 border-b border-gray-100 bg-white sticky top-[100px] z-[5] overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-8 md:gap-16">
                    {steps.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setStep(s.id)}
                            className={`py-6 text-xs font-bold transition-all relative whitespace-nowrap px-1 ${step === s.id ? 'text-[#2563EB]' : 'text-[#6B7280] hover:text-[#4B5563]'}`}
                        >
                            {s.label}
                            {step === s.id && <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#2563EB] rounded-t-full" />}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-white p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Common Header Info for Step 1 */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-10 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_30px_-8px_rgba(0,0,0,0.05)]">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest pl-1">Project Name</label>
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="e.g. Skyline Residency Phase II"
                                    value={task.site_name}
                                    className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm font-bold text-[#111827] outline-none focus:bg-white transition-all shadow-sm"
                                />
                            </div>
                            <div className="space-y-4 relative">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest pl-1">Reporting Date</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatDate(task.due_date)}
                                        className="w-full p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm font-bold text-[#111827] outline-none pr-12 focus:bg-white transition-all shadow-sm"
                                    />
                                    <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Body */}
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* DPR FORMS */}
                        {task.form_type !== 'cbd' && step === 1 && (
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-md font-black text-[#111827] tracking-tight uppercase">Concrete Progress Details</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                                <th className="py-2.5 px-4">COMPONENT / LOCATION</th>
                                                <th className="py-2.5 px-4 text-center">UNIT</th>
                                                <th className="py-2.5 px-4 text-center">TARGET QTY (CUM)</th>
                                                <th className="py-2.5 px-4 text-center">ACTUAL QTY</th>
                                                {task.due_date && !task.is_monthly && task.scope !== 'site' && task.scope !== 'Overall' && formData.concrete_planning?.scope !== 'Overall' && <th className="py-2.5 px-4 text-center">VARIANCE</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F3F4F6]">
                                            {formData.concrete_planning ? (
                                                <tr className="hover:bg-[#F9FAFB]/50 transition-colors">
                                                    <td className="py-4 px-4 font-medium text-[#374151] text-sm">Site Execution</td>
                                                    <td className="py-4 px-4 text-center text-[#4B5563] font-medium text-sm">m³</td>
                                                    <td className="py-4 px-4 text-center font-bold text-[#111827] text-sm">{formData.concrete_planning.planned_total || 0}</td>
                                                    <td className="py-4 px-4 text-center">
                                                        <input
                                                            type="number"
                                                            value={formData.concrete_planning.achieved_total ?? ''}
                                                            onChange={e => setFormData({ ...formData, concrete_planning: { ...formData.concrete_planning, achieved_total: e.target.value } })}
                                                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                            className="w-20 p-1.5 bg-white border border-[#D1D5DB] rounded text-[#111827] text-sm outline-none focus:border-[#2563EB] text-center font-bold"
                                                        />
                                                    </td>
                                                    {task.due_date && !task.is_monthly && task.scope !== 'site' && task.scope !== 'Overall' && formData.concrete_planning?.scope !== 'Overall' && (
                                                        <td className="py-4 px-4 text-center font-bold text-sm text-[#EF4444]">
                                                            {Math.abs((parseFloat(formData.concrete_planning.achieved_total) || 0) - (formData.concrete_planning.planned_total || 0))}
                                                        </td>
                                                    )}
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-[#111827] font-bold">No concrete details needed for this form type.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {formData.concrete_planning && (
                                            <tfoot className="bg-[#F9FAFB]/50">
                                                <tr className="border-t border-[#F3F4F6]">
                                                    <td colSpan={2} className="py-5 px-4"></td>
                                                    <td className="py-5 px-4 text-right pr-12 font-bold text-[#111827] text-sm">
                                                        Total Target (CUM): <span className="text-[#111827]">{formData.concrete_planning.planned_total || 0} m³</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-left pl-8 font-bold text-[#2563EB] text-xs" colSpan={(task.due_date && !task.is_monthly && task.scope !== 'site' && task.scope !== 'Overall' && formData.concrete_planning?.scope !== 'Overall') ? 2 : 1}>
                                                        Total Actual: <span className="text-[#2563EB]">{formData.concrete_planning.achieved_total || 0} m³</span>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        )}
                        {task.form_type === 'cbd' && step === 1 && (
                            <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Billing Deadlines</h2>
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="flex-1 p-6 bg-purple-50/50 rounded-xl border border-purple-100 shadow-sm">
                                        <label className="text-xs font-bold text-purple-600 uppercase tracking-widest block mb-2">Client Bill Target & Achieved Date</label>
                                        <div className="flex gap-4 items-center mt-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                                <p className="font-bold text-sm bg-white p-3 rounded-lg border border-purple-100 shadow-sm">{formData.billing_targets?.client_target_date ? formatDate(formData.billing_targets.client_target_date) : 'Not Set'}</p>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                                <input type="date" value={formData.billing_targets?.client_achieved_date || ''}
                                                    disabled={readOnly}
                                                    onChange={e => setFormData({ ...formData, billing_targets: { ...formData.billing_targets, client_achieved_date: e.target.value } })}
                                                    className="w-full text-sm font-bold bg-white p-3 rounded-lg outline-none border border-purple-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-6 bg-orange-50/50 rounded-xl border border-orange-100 shadow-sm">
                                        <label className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-2">Contractor Bill Target & Achieved Date</label>
                                        <div className="flex gap-4 items-center mt-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Target</span>
                                                <p className="font-bold text-sm bg-white p-3 rounded-lg border border-orange-100 shadow-sm">{formData.billing_targets?.contractor_target_date ? formatDate(formData.billing_targets.contractor_target_date) : 'Not Set'}</p>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-1">Achieved</span>
                                                <input type="date" value={formData.billing_targets?.contractor_achieved_date || ''}
                                                    disabled={readOnly}
                                                    onChange={e => setFormData({ ...formData, billing_targets: { ...formData.billing_targets, contractor_achieved_date: e.target.value } })}
                                                    className="w-full text-sm font-bold bg-white p-3 rounded-lg outline-none border border-orange-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 2 && (
                            <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Steel Reconciliation</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Received Steel <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_received ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_received: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-50/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Billed Steel <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_billed ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_billed: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">WIP Steel <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.wip_steel ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), wip_steel: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">JMR Total <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.jmr_total ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), jmr_total: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Stock <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_stock ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_stock: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Scrap <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.total_scrap ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), total_scrap: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-slate-300 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all shadow-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">% Wastage <span className="text-red-500">*</span></label>
                                        <input type="number" min="0" value={formData.steel_reconciliation?.wastage_percent ?? ''}
                                            disabled={readOnly}
                                            onChange={e => setFormData({ ...formData, steel_reconciliation: { ...(formData.steel_reconciliation || {}), wastage_percent: Math.max(0, parseFloat(e.target.value) || 0) } })}
                                            className="w-full p-3 border border-red-200 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50 text-red-700 transition-all shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 3 && (
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
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
                                                            }} className="w-24 p-1.5 bg-white border border-[#D1D5DB] rounded text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm shadow-sm" />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input type="number" min="0" value={item.consumed ?? ''}
                                                            disabled={readOnly}
                                                            onChange={e => {
                                                                const copy = [...formData.concrete_reconciliation];
                                                                copy[i].consumed = Math.max(0, parseFloat(e.target.value) || 0);
                                                                setFormData({ ...formData, concrete_reconciliation: copy });
                                                            }} className="w-24 p-1.5 bg-white border border-[#D1D5DB] rounded text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm shadow-sm" />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input type="number" value={item.difference ?? ''}
                                                            disabled={readOnly}
                                                            onChange={e => {
                                                                const copy = [...formData.concrete_reconciliation];
                                                                copy[i].difference = parseFloat(e.target.value) || 0;
                                                                setFormData({ ...formData, concrete_reconciliation: copy });
                                                            }} className="w-24 p-1.5 bg-white border border-[#D1D5DB] rounded text-orange-600 outline-none focus:border-orange-500 text-center font-bold text-sm shadow-sm" />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input type="number" value={item.wastage_percent ?? ''}
                                                            disabled={readOnly}
                                                            onChange={e => {
                                                                const copy = [...formData.concrete_reconciliation];
                                                                copy[i].wastage_percent = parseFloat(e.target.value) || 0;
                                                                setFormData({ ...formData, concrete_reconciliation: copy });
                                                            }} className="w-24 p-1.5 bg-red-50 border border-red-200 rounded text-red-700 outline-none focus:border-red-500 text-center font-black text-sm shadow-sm" />
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
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <h2 className="text-md font-black text-[#111827] tracking-tight uppercase">Staff Deployment</h2>
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newRow = {
                                                    id: Date.now(),
                                                    role: '',
                                                    planned: 0,
                                                    actual: 0,
                                                    required_wo: 0,
                                                    towerId: 'Overall',
                                                    is_manual: true
                                                };
                                                setFormData({ ...formData, staff: [...(formData.staff || []), newRow] });
                                            }}
                                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                                        >
                                            <Plus size={14} />
                                            Add Row
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                                <th className="py-2 px-4">DESIGNATION</th>
                                                <th className="py-2 px-4 text-center">PLANNED</th>
                                                <th className="py-2 px-4 text-center text-blue-600">QTY (ACTUAL)</th>
                                                {!task.is_monthly && <th className="py-2 px-4 text-center text-[#EF4444]">VARIANCE (PLANNED VS ACTUAL)</th>}
                                                <th className="py-2 px-4 text-center">REQUIRED (WO)</th>
                                                {!task.is_monthly && <th className="py-2 px-4 text-center text-[#EF4444]">VARIANCE (REQUIRED VS PLANNED)</th>}
                                                <th className="py-2 px-4 text-center w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F3F4F6]">
                                            {formData.staff?.map((s: any, i: number) => (
                                                <tr key={i} className="hover:bg-[#F9FAFB]/50 transition-colors">
                                                    <td className="py-2 px-4 font-medium text-[#374151] text-sm">
                                                        {s.is_manual ? (
                                                            <input
                                                                type="text"
                                                                value={s.role || ''}
                                                                onChange={e => {
                                                                    const copy = [...formData.staff];
                                                                    copy[i].role = e.target.value;
                                                                    setFormData({ ...formData, staff: copy });
                                                                }}
                                                                placeholder="Enter Designation"
                                                                className="w-full p-1.5 bg-white border border-[#D1D5DB] rounded text-[#111827] text-xs outline-none focus:border-[#2563EB]"
                                                            />
                                                        ) : (
                                                            s.role || s.designation
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-4 text-center text-[#111827] font-bold text-sm">{s.planned || 0}</td>
                                                    <td className="py-2 px-4 text-center">
                                                        <input
                                                            type="number"
                                                            value={s.actual ?? ''}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const copy = [...formData.staff];
                                                                copy[i].actual = val;
                                                                setFormData({ ...formData, staff: copy });
                                                            }}
                                                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                            className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm"
                                                        />
                                                    </td>
                                                    {!task.is_monthly && (
                                                        <td className="py-2 px-4 text-center font-bold text-sm text-[#EF4444]">
                                                            {Math.abs((s.actual || 0) - (s.planned || 0))}
                                                        </td>
                                                    )}
                                                    <td className="py-2 px-4 text-center">
                                                        <input
                                                            type="number"
                                                            value={s.required_wo ?? ''}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const copy = [...formData.staff];
                                                                copy[i].required_wo = val;
                                                                setFormData({ ...formData, staff: copy });
                                                            }}
                                                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                            className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm"
                                                        />
                                                    </td>
                                                    {!task.is_monthly && (
                                                        <td className="py-2 px-4 text-center font-bold text-sm text-[#EF4444]">
                                                            {Math.abs((s.required_wo || 0) - (s.planned || 0))}
                                                        </td>
                                                    )}
                                                    <td className="py-2 px-4 text-center">
                                                        {s.is_manual && !readOnly && (
                                                            <button
                                                                onClick={() => {
                                                                    const copy = formData.staff.filter((_: any, idx: number) => idx !== i);
                                                                    setFormData({ ...formData, staff: copy });
                                                                }}
                                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-[#F9FAFB]/50 font-bold text-sm">
                                            <tr className="border-t border-[#F3F4F6]">
                                                <td className="py-3 px-4 text-[#111827]">Total Staff</td>
                                                <td className="py-3 px-4 text-center text-[#111827]">
                                                    {formData.staff?.reduce((acc: number, s: any) => acc + (parseInt(s.planned) || 0), 0)}
                                                </td>
                                                <td className="py-3 px-4 text-center text-[#2563EB]">
                                                    {formData.staff?.reduce((acc: number, s: any) => acc + (parseInt(s.actual) || 0), 0)}
                                                </td>
                                                {!task.is_monthly && (
                                                    <td className="py-3 px-4 text-center text-[#EF4444]">
                                                        {Math.abs(formData.staff?.reduce((acc: number, s: any) => acc + ((s.actual || 0) - (s.planned || 0)), 0))}
                                                    </td>
                                                )}
                                                <td className="py-3 px-4 text-center text-[#111827]">
                                                    {formData.staff?.reduce((acc: number, s: any) => acc + (parseInt(s.required_wo) || 0), 0)}
                                                </td>
                                                {!task.is_monthly && (
                                                    <td className="py-3 px-4 text-center text-[#EF4444]">
                                                        {Math.abs(formData.staff?.reduce((acc: number, s: any) => acc + ((s.required_wo || 0) - (s.planned || 0)), 0))}
                                                    </td>
                                                )}
                                                <td className="py-3 px-4"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {task.form_type !== 'cbd' && step === 3 && (
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
                                <h2 className="text-md font-black text-[#111827] tracking-tight uppercase">Labour Deployment</h2>
                                <div className="overflow-x-auto">
                                    {(() => {
                                        const uniqueTowers = Array.from(new Set(
                                            (formData.labor || [])
                                                .filter((l: any) => (parseInt(l.planned) || 0) > 0 || (l.actual !== undefined && l.actual !== null && l.actual !== '' && parseInt(l.actual) > 0))
                                                .map((l: any) => l.towerId || 'Overall')
                                        )) as any[];
                                        const uniqueTypes = Array.from(new Set(
                                            (formData.labor || [])
                                                .filter((l: any) => uniqueTowers.includes(l.towerId || 'Overall'))
                                                .filter((l: any) => (parseInt(l.planned) || 0) > 0 || (l.actual !== undefined && l.actual !== null && l.actual !== '' && parseInt(l.actual) > 0))
                                                .map((l: any) => l.type || l.name)
                                        )).filter(Boolean) as any[];

                                        return (
                                            <table className="w-full text-left border-collapse min-w-max">
                                                <thead>
                                                    <tr className="text-[10px] font-bold text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-t border-[#F3F4F6]">
                                                        <th rowSpan={2} className="py-4 px-4 border-b border-r border-[#F3F4F6]">CATEGORY</th>
                                                        {uniqueTowers.map((tower: any) => (
                                                            <th key={tower} colSpan={3} className="py-2 px-4 text-center border-b border-r border-[#F3F4F6] bg-[#F9FAFB]">
                                                                Tower: {tower}
                                                            </th>
                                                        ))}
                                                        <th rowSpan={2} className="py-4 px-4 text-center border-b border-[#F3F4F6] bg-[#F9FAFB]">Total</th>
                                                    </tr>
                                                    <tr className="text-[9px] font-black text-[#6B7280] uppercase tracking-tighter bg-[#F9FAFB] border-b border-[#F3F4F6]">
                                                        {uniqueTowers.map((tower: any) => (
                                                            <React.Fragment key={`${tower}-sub`}>
                                                                <th className="py-2 px-2 text-center border-r border-[#F3F4F6]">P</th>
                                                                <th className="py-2 px-2 text-center border-r border-[#F3F4F6]">A</th>
                                                                <th className="py-2 px-2 text-center border-r border-[#F3F4F6]">V</th>
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#F3F4F6]">
                                                    {uniqueTypes.map((type: any) => {
                                                        let typeTotalPlanned = 0;
                                                        let typeTotalActual = 0;
                                                        return (
                                                            <tr key={type} className="hover:bg-[#F9FAFB]/50 transition-colors">
                                                                <td className="py-3 px-4 font-medium text-[#374151] text-sm border-r border-[#F3F4F6] sticky left-0 bg-white z-10 shadow-sm">{type}</td>
                                                                {uniqueTowers.map((tower: any) => {
                                                                    const itemIndex = formData.labor?.findIndex((l: any) => (l.type === type || l.name === type) && (l.towerId || 'Overall') === tower);
                                                                    const item = itemIndex !== -1 ? formData.labor[itemIndex] : null;

                                                                    const planned = parseInt(item?.planned) || 0;
                                                                    const actual = item?.actual ?? '';
                                                                    const actualNum = parseInt(actual) || 0;
                                                                    const variance = (item?.actual !== undefined && item?.actual !== null && item?.actual !== '') ? (actualNum - planned) : 0;

                                                                    typeTotalPlanned += planned;
                                                                    typeTotalActual += actualNum;

                                                                    return (
                                                                        <React.Fragment key={`${type}-${tower}`}>
                                                                            <td className="py-2 px-2 text-center text-[#111827] font-bold text-sm border-r border-[#F3F4F6] bg-gray-50/30">{planned || '-'}</td>
                                                                            <td className="py-2 px-2 text-center border-r border-[#F3F4F6]">
                                                                                {item ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        value={actual}
                                                                                        onChange={e => {
                                                                                            const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                                                                            const copy = [...formData.labor];
                                                                                            copy[itemIndex].actual = val;
                                                                                            setFormData({ ...formData, labor: copy });
                                                                                        }}
                                                                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                                                        className="w-14 p-1 bg-white border border-[#D1D5DB] rounded text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm"
                                                                                    />
                                                                                ) : <span className="text-gray-200">-</span>}
                                                                            </td>
                                                                            <td className={`py-2 px-2 text-center font-black text-[11px] border-r border-[#F3F4F6] ${(item?.actual !== undefined && item?.actual !== null && item?.actual !== '') ? (variance < 0 ? 'text-[#EF4444]' : 'text-[#10B981]') : 'text-gray-300'}`}>
                                                                                {(item?.actual !== undefined && item?.actual !== null && item?.actual !== '') ? (variance > 0 ? `+${variance}` : variance) : '-'}
                                                                            </td>
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                                <td className="py-3 px-4 text-center font-black text-sm text-[#111827] bg-[#F9FAFB]">
                                                                    {typeTotalActual} <span className="text-[10px] text-gray-400 font-bold ml-1">/ {typeTotalPlanned}</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="bg-[#F9FAFB] font-black text-xs">
                                                    <tr className="border-t border-[#F3F4F6]">
                                                        <td className="py-4 px-4 text-[#111827]">Total Manpower</td>
                                                        {uniqueTowers.map(tower => {
                                                            const towerPlanned = formData.labor?.filter((l: any) => (l.towerId || 'Overall') === tower).reduce((acc: number, l: any) => acc + (parseInt(l.planned) || 0), 0);
                                                            const towerActual = formData.labor?.filter((l: any) => (l.towerId || 'Overall') === tower).reduce((acc: number, l: any) => acc + (parseInt(l.actual) || 0), 0);
                                                            return (
                                                                <React.Fragment key={`${tower}-total`}>
                                                                    <td className="py-4 px-2 text-center border-r border-[#F3F4F6]">{towerPlanned}</td>
                                                                    <td className="py-4 px-2 text-center border-r border-[#F3F4F6] text-[#2563EB]">{towerActual}</td>
                                                                    <td className="py-4 px-2 text-center border-r border-[#F3F4F6] text-[#EF4444]">{towerActual - towerPlanned}</td>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                        <td className="py-4 px-4 text-center text-[#111827] bg-[#F3F4F6]">
                                                            {formData.labor?.reduce((acc: number, l: any) => acc + (parseInt(l.actual) || 0), 0)}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                        {task.form_type === 'cbd' && step === 4 && (
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Report Checklist</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {formData.report_checklist?.map((item: any, i: number) => (
                                        <div key={i} className={`p-4 rounded-xl border transition-all duration-200 ${item.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50 shadow-sm' : item.status === 'No' ? 'border-red-200 bg-red-50/50 shadow-sm' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                                            <div className="flex flex-col gap-3">
                                                <span className="font-bold text-slate-700 text-xs min-h-[32px] line-clamp-2">{item.description} <span className="text-red-500">*</span></span>
                                                <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit self-center sm:self-start">
                                                    <button onClick={() => updateNested('report_checklist', i, 'status', 'Yes')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${item.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                                    <button onClick={() => updateNested('report_checklist', i, 'status', 'No')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${item.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
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
                                                            className="w-full p-2 text-xs bg-white border border-emerald-200 rounded-lg outline-none font-medium text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" />
                                                    </div>
                                                </div>
                                            )}
                                            {item.status === 'No' && (
                                                <div className="mt-4 pt-3 border-t border-red-100/50 transition-all">
                                                    <div className="mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason / Remarks <span className="text-red-500">*</span></div>
                                                    <input type="text" placeholder="Reason for 'No'..." value={item.remark || ''} title="Remarks"
                                                        onChange={e => updateNested('report_checklist', i, 'remark', e.target.value)}
                                                        className="w-full p-2 text-xs bg-white border border-red-200 rounded-lg outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 5 && (
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Documents For Client Bill</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {formData.documents_client_bill?.map((doc: any, i: number) => (
                                        <div key={i} className={`p-4 rounded-xl border transition-all duration-200 ${doc.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50 shadow-sm' : doc.status === 'No' ? 'border-red-200 bg-red-50/50 shadow-sm' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                                            <div className="flex flex-col gap-3">
                                                <span className="font-bold text-slate-700 text-xs min-h-[32px] line-clamp-2">{doc.document_name} <span className="text-red-500">*</span></span>
                                                <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit self-center sm:self-start">
                                                    <button onClick={() => updateNested('documents_client_bill', i, 'status', 'Yes')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${doc.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                                    <button onClick={() => updateNested('documents_client_bill', i, 'status', 'No')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${doc.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
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
                                                        className="w-full p-2 text-xs bg-white border border-red-200 rounded-lg outline-none font-medium text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {task.form_type === 'cbd' && step === 6 && (
                            <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                <div className="flex justify-between items-center mb-1">
                                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Vendor Registration</h2>
                                    {!readOnly && (
                                        <button onClick={() => {
                                            const arr = [...(formData.vendor_registrations || [])];
                                            arr.push({ vendor_name: '', is_reg_form: false, reg_form_files: [], is_wo: false, wo_files: [], is_closing: false, closing_files: [] });
                                            setFormData({ ...formData, vendor_registrations: arr });
                                        }} className="text-blue-600 hover:text-blue-800 bg-blue-50/50 px-4 py-1.5 font-bold flex items-center gap-1 rounded-lg transition-colors text-sm shadow-sm">+ Add Vendor</button>
                                    )}
                                </div>

                                <div className="bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                                                                <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit">
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'Yes')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_reg_form === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-400 hover:bg-slate-50'}`}>Yes</button>
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_reg_form', 'No')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_reg_form === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-200' : 'text-slate-400 hover:bg-slate-50'}`}>No</button>
                                                                </div>
                                                                {vendor.is_reg_form === 'No' && (
                                                                    <input type="text" placeholder="Reason?" value={vendor.reg_form_reason || ''}
                                                                        onChange={e => updateNested('vendor_registrations', i, 'reg_form_reason', e.target.value)}
                                                                        className="w-full min-w-[100px] p-2 text-[10px] bg-white border border-red-100 rounded-lg outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-300 font-medium" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit">
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'Yes')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_wo === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-400 hover:bg-slate-50'}`}>Yes</button>
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_wo', 'No')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_wo === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-200' : 'text-slate-400 hover:bg-slate-50'}`}>No</button>
                                                                </div>
                                                                {vendor.is_wo === 'No' && (
                                                                    <input type="text" placeholder="Reason?" value={vendor.wo_reason || ''}
                                                                        onChange={e => updateNested('vendor_registrations', i, 'wo_reason', e.target.value)}
                                                                        className="w-full min-w-[100px] p-2 text-[10px] bg-white border border-red-100 rounded-lg outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-300 font-medium" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 shadow-sm w-fit">
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'Yes')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_closing === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-400 hover:bg-slate-50'}`}>Yes</button>
                                                                    <button onClick={() => updateNested('vendor_registrations', i, 'is_closing', 'No')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${vendor.is_closing === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-200' : 'text-slate-400 hover:bg-slate-50'}`}>No</button>
                                                                </div>
                                                                {vendor.is_closing === 'No' && (
                                                                    <input type="text" placeholder="Reason?" value={vendor.closing_reason || ''}
                                                                        onChange={e => updateNested('vendor_registrations', i, 'closing_reason', e.target.value)}
                                                                        className="w-full min-w-[100px] p-2 text-[10px] bg-white border border-red-100 rounded-lg outline-none focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-300 font-medium" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            {!readOnly && (
                                                                <button onClick={() => {
                                                                    const copy = { ...formData };
                                                                    copy.vendor_registrations.splice(i, 1);
                                                                    setFormData({ ...copy });
                                                                }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
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
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-md font-black text-gray-900 tracking-tight uppercase">Schedule Targets</h2>
                                    <button
                                        onClick={() => setShowAllTargets(!showAllTargets)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${showAllTargets ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                    >
                                        {showAllTargets ? 'Showing All Targets' : 'View All Targets'}
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {formData.monthly_schedule_today?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest border-b border-gray-100">
                                                        <th className="pb-4 pt-1 px-4">Tower / Subzone</th>
                                                        <th className="pb-4 pt-1 px-4 text-center">Planned Target</th>
                                                        <th className="pb-4 pt-1 px-4 text-center">{showAllTargets ? 'Achieved Date' : 'Achieved?'}</th>
                                                        <th className="pb-4 pt-1 px-4">Comments</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {(() => {
                                                        const getBaseDate = (d: any) => {
                                                            if (!d) return "";
                                                            if (typeof d === "string") return d.substring(0, 10);
                                                            if (d instanceof Date) return d.toISOString().substring(0, 10);
                                                            try {
                                                                const dObj = new Date(d);
                                                                if (!isNaN(dObj.getTime())) return dObj.toISOString().substring(0, 10);
                                                            } catch (e) { }
                                                            return "";
                                                        };

                                                        const targetList = formData.monthly_schedule_today || [];
                                                        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
                                                        const displayList = showAllTargets
                                                            ? targetList
                                                            : targetList.filter((item: any) => {
                                                                const targetDate = getBaseDate(item.planned_target_date);
                                                                // Show if planned for today, or overdue and not yet achieved,
                                                                // or if it was achieved today (so it doesn't vanish immediately)
                                                                return targetDate === todayStr ||
                                                                    (targetDate < todayStr && !item.achieved) ||
                                                                    (item.achieved && getBaseDate(item.achieved_date) === todayStr);
                                                            });

                                                        return displayList.map((item: any, i: number) => {
                                                            const targetDate = getBaseDate(item.planned_target_date);
                                                            return (
                                                                <React.Fragment key={i}>
                                                                    <tr className="group hover:bg-gray-50/30 transition-colors">
                                                                        <td className="py-5 px-4 text-[#111827]">
                                                                            <div className="font-black uppercase tracking-tighter text-[11px] leading-tight">{item.tower_id || item.tower_name || 'Site'}</div>
                                                                            <div className="text-sm font-bold">Floor {item.floor}</div>
                                                                            <div className="text-[10px] font-bold text-blue-600 mt-0.5">{item.purpose}</div>
                                                                        </td>
                                                                        <td className="py-5 px-4 text-center font-black text-blue-600 text-xs">{item.planned_target_date}</td>
                                                                        <td className="py-5 px-4 text-center">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={item.previously_achieved}
                                                                                    onClick={() => {
                                                                                        const copy = [...formData.monthly_schedule_today];
                                                                                        const index = formData.monthly_schedule_today.findIndex((x: any) => x === item);
                                                                                        if (index > -1) {
                                                                                            copy[index].achieved = true;
                                                                                            if (!copy[index].achieved_date) copy[index].achieved_date = todayStr;
                                                                                            copy[index].revised_date = '';
                                                                                            copy[index].missed_reason = '';
                                                                                            setFormData({ ...formData, monthly_schedule_today: copy });
                                                                                        }
                                                                                    }}
                                                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${item.achieved === true ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'} ${item.previously_achieved ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : ''}`}
                                                                                >
                                                                                    Yes
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={item.previously_achieved}
                                                                                    onClick={() => {
                                                                                        const copy = [...formData.monthly_schedule_today];
                                                                                        const index = formData.monthly_schedule_today.findIndex((x: any) => x === item);
                                                                                        if (index > -1) {
                                                                                            copy[index].achieved = false;
                                                                                            copy[index].achieved_date = '';
                                                                                            setFormData({ ...formData, monthly_schedule_today: copy });
                                                                                        }
                                                                                    }}
                                                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${item.achieved === false ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-red-200 text-red-600 hover:bg-red-50'} ${item.previously_achieved ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : ''}`}
                                                                                >
                                                                                    No
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-5 px-4">
                                                                            <input
                                                                                type="text"
                                                                                value={item.comments || ''}
                                                                                placeholder="Remarks..."
                                                                                onChange={e => {
                                                                                    const copy = [...formData.monthly_schedule_today];
                                                                                    const index = formData.monthly_schedule_today.findIndex((x: any) => x === item);
                                                                                    if (index > -1) {
                                                                                        copy[index].comments = e.target.value;
                                                                                        setFormData({ ...formData, monthly_schedule_today: copy });
                                                                                    }
                                                                                }}
                                                                                className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-blue-50"
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                    {item.achieved === true && (
                                                                        <tr className="bg-emerald-50/30">
                                                                            <td colSpan={4} className="px-5 py-4 border-b border-emerald-100">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                                                        Achieved Date: *
                                                                                    </span>
                                                                                    <input
                                                                                        type="date"
                                                                                        value={item.achieved_date || ''}
                                                                                        required
                                                                                        disabled={item.previously_achieved}
                                                                                        onChange={e => {
                                                                                            const copy = [...formData.monthly_schedule_today];
                                                                                            const index = formData.monthly_schedule_today.findIndex((x: any) => x === item);
                                                                                            if (index > -1) {
                                                                                                copy[index].achieved_date = e.target.value;
                                                                                                setFormData({ ...formData, monthly_schedule_today: copy });
                                                                                            }
                                                                                        }}
                                                                                        className={`p-1.5 text-[10px] border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 bg-white font-bold transition-all ${item.previously_achieved ? 'opacity-70 bg-emerald-50/50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    {item.achieved === false && (
                                                                        <tr className="bg-red-50/50">
                                                                            <td colSpan={4} className="px-5 py-4 border-b border-red-100">
                                                                                <div className="flex flex-wrap items-center gap-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${!item.revised_date ? 'text-red-600' : 'text-orange-600'}`}>
                                                                                            Next Target Date: *
                                                                                        </span>
                                                                                        <input
                                                                                            type="date"
                                                                                            value={item.revised_date || ''}
                                                                                            required
                                                                                            onChange={e => {
                                                                                                const copy = [...formData.monthly_schedule_today];
                                                                                                const index = formData.monthly_schedule_today.findIndex((x: any) => x === item);
                                                                                                if (index > -1) {
                                                                                                    copy[index].revised_date = e.target.value;
                                                                                                    setFormData({ ...formData, monthly_schedule_today: copy });
                                                                                                }
                                                                                            }}
                                                                                            className={`p-1.5 text-[10px] border rounded-lg outline-none focus:ring-2 bg-white font-bold transition-all ${!item.revised_date ? 'border-red-300 focus:ring-red-100 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : 'border-orange-200 focus:ring-orange-100'}`}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex-1 flex items-center gap-2">
                                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${!item.missed_reason ? 'text-red-600' : 'text-orange-600'}`}>
                                                                                            Reason for Delay: *
                                                                                        </span>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={item.missed_reason || ''}
                                                                                            required
                                                                                            placeholder="Provide mandatory reason for delay..."
                                                                                            onChange={e => {
                                                                                                const copy = [...formData.monthly_schedule_today];
                                                                                                const index = formData.monthly_schedule_today.findIndex((x: any) => x === item);
                                                                                                if (index > -1) {
                                                                                                    copy[index].missed_reason = e.target.value;
                                                                                                    setFormData({ ...formData, monthly_schedule_today: copy });
                                                                                                }
                                                                                            }}
                                                                                            className={`flex-1 p-1.5 text-[10px] border rounded-lg outline-none focus:ring-2 bg-white font-bold transition-all ${!item.missed_reason ? 'border-red-300 focus:ring-red-100 placeholder:text-red-300' : 'border-orange-200 focus:ring-orange-100 placeholder:text-orange-300'}`}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-[#111827] font-bold border-2 border-dashed border-gray-100 rounded-3xl">No schedule targets found for this location.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {task.form_type !== 'cbd' && step === 5 && (
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <h2 className="text-md font-black text-gray-900 tracking-tight">Equipment Tracking</h2>
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newRow = {
                                                    id: Date.now(),
                                                    type: '',
                                                    planned: 0,
                                                    actual: 0,
                                                    status: '',
                                                    remark: '',
                                                    is_manual: true
                                                };
                                                setFormData({ ...formData, equipments: [...(formData.equipments || []), newRow] });
                                            }}
                                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                                        >
                                            <Plus size={14} />
                                            Add Equipment
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                                <th className="py-3 px-4">EQUIPMENT TYPE</th>
                                                <th className="py-3 px-4 text-center">PLANNED</th>
                                                <th className="py-3 px-4 text-center">QTY (ACTUAL)</th>
                                                {!task.is_monthly && <th className="py-3 px-4 text-center text-[#EF4444]">VARIANCE</th>}
                                                <th className="py-3 px-4 text-center">STATUS</th>
                                                <th className="py-3 px-4 text-center">REMARK</th>
                                                <th className="py-3 px-4 text-center w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {formData.equipments?.map((eq: any, i: number) => {
                                                const isShortage = (parseInt(eq.planned) || 0) > (parseInt(eq.actual) || 0);
                                                return (
                                                    <React.Fragment key={i}>
                                                        <tr className="hover:bg-gray-50/30 transition-colors">
                                                            <td className="py-3 px-4 font-bold text-gray-900 text-sm">
                                                                {eq.is_manual ? (
                                                                    <input
                                                                        type="text"
                                                                        value={eq.type || ''}
                                                                        onChange={e => {
                                                                            const copy = [...formData.equipments];
                                                                            copy[i].type = e.target.value;
                                                                            setFormData({ ...formData, equipments: copy });
                                                                        }}
                                                                        placeholder="Enter Equipment Type"
                                                                        className="w-full p-1.5 bg-white border border-gray-200 rounded text-gray-900 font-bold text-xs outline-none focus:border-blue-500"
                                                                    />
                                                                ) : (
                                                                    eq.type
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-[#111827] font-bold text-sm">{eq.planned || 0}</td>
                                                            <td className="py-3 px-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    value={eq.actual ?? ''}
                                                                    onChange={e => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        const copy = [...formData.equipments];
                                                                        copy[i].actual = val;
                                                                        setFormData({ ...formData, equipments: copy });
                                                                    }}
                                                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                                    className="w-16 p-1.5 bg-white border border-gray-200 rounded text-blue-600 outline-none focus:border-blue-500 text-center font-black text-sm"
                                                                />
                                                            </td>
                                                            {!task.is_monthly && (
                                                                <td className="py-3 px-4 text-center font-black text-sm text-[#EF4444]">
                                                                    {Math.abs((eq.actual || 0) - (eq.planned || 0))}
                                                                </td>
                                                            )}
                                                            <td className="py-3 px-4 text-center">
                                                                {isShortage && (
                                                                    <select
                                                                        value={eq.status || ''}
                                                                        onChange={e => {
                                                                            const copy = [...formData.equipments];
                                                                            copy[i].status = e.target.value;
                                                                            setFormData({ ...formData, equipments: copy });
                                                                        }}
                                                                        className="w-full p-1 text-[10px] border border-orange-200 rounded outline-none focus:border-orange-400 bg-white font-bold"
                                                                    >
                                                                        <option value="">Select</option>
                                                                        <option value="Breakdown">Breakdown</option>
                                                                        <option value="Not Available">Not Available</option>
                                                                        <option value="Other">Other</option>
                                                                    </select>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                {isShortage && (
                                                                    <input
                                                                        type="text"
                                                                        value={eq.remark || ''}
                                                                        placeholder="Optional..."
                                                                        onChange={e => {
                                                                            const copy = [...formData.equipments];
                                                                            copy[i].remark = e.target.value;
                                                                            setFormData({ ...formData, equipments: copy });
                                                                        }}
                                                                        className="w-full p-1 text-[10px] border border-orange-200 rounded outline-none focus:border-orange-400 placeholder:text-orange-300 bg-white"
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-red-400 hover:text-red-600 transition-colors">
                                                                {eq.is_manual && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const copy = formData.equipments.filter((_: any, idx: number) => idx !== i);
                                                                            setFormData({ ...formData, equipments: copy });
                                                                        }}
                                                                        className="transition-colors"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-50/50 font-black text-sm">
                                            <tr className="border-t border-gray-100">
                                                <td className="py-4 px-4 text-gray-900">Total Equipments</td>
                                                <td className="py-4 px-4 text-center text-[#111827]">
                                                    {formData.equipments?.reduce((acc: number, eq: any) => acc + (parseInt(eq.planned) || 0), 0)}
                                                </td>
                                                <td className="py-4 px-4 text-center text-blue-600">
                                                    {formData.equipments?.reduce((acc: number, eq: any) => acc + (parseInt(eq.actual) || 0), 0)}
                                                </td>
                                                {!task.is_monthly && (
                                                    <td className="py-4 px-4 text-center text-[#EF4444]">
                                                        {Math.abs(formData.equipments?.reduce((acc: number, eq: any) => acc + ((eq.actual || 0) - (eq.planned || 0)), 0))}
                                                    </td>
                                                )}
                                                <td className="py-4 px-4"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {task.form_type !== 'cbd' && step === 6 && (
                            <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-md font-black text-[#111827] tracking-tight uppercase">Material Tracking</h2>
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const newMaterial = { id: Date.now(), name: '', quantity: '', requiredDate: '' };
                                                setFormData({ ...formData, priority_materials: [...(formData.priority_materials || []), newMaterial] });
                                            }}
                                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                                        >
                                            <Plus size={14} />
                                            Add Material
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                                <th className="py-3 px-4">MATERIAL</th>
                                                <th className="py-3 px-4 text-center">QUANTITY</th>
                                                <th className="py-3 px-4 text-center">REQ DATE</th>
                                                <th className="py-3 px-4 text-center w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {formData.priority_materials?.map((m: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <input
                                                            type="text"
                                                            value={m.name || ''}
                                                            onChange={e => {
                                                                const copy = [...formData.priority_materials];
                                                                copy[i].name = e.target.value;
                                                                setFormData({ ...formData, priority_materials: copy });
                                                            }}
                                                            placeholder="Material Name"
                                                            className="w-full p-1.5 bg-white border border-gray-200 rounded text-gray-900 font-bold text-xs outline-none focus:border-blue-500"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <input
                                                            type="text"
                                                            value={m.quantity || ''}
                                                            onChange={e => {
                                                                const copy = [...formData.priority_materials];
                                                                copy[i].quantity = e.target.value;
                                                                setFormData({ ...formData, priority_materials: copy });
                                                            }}
                                                            placeholder="Qty"
                                                            className="w-20 mx-auto p-1.5 bg-white border border-gray-200 rounded text-blue-600 outline-none focus:border-blue-500 text-center font-black text-sm"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <input
                                                            type="date"
                                                            value={m.requiredDate || ''}
                                                            onChange={e => {
                                                                const copy = [...formData.priority_materials];
                                                                copy[i].requiredDate = e.target.value;
                                                                setFormData({ ...formData, priority_materials: copy });
                                                            }}
                                                            className="p-1.5 bg-white border border-gray-200 rounded text-gray-900 font-bold text-xs outline-none focus:border-blue-500 mx-auto"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {!readOnly && (
                                                            <button
                                                                onClick={() => {
                                                                    const copy = formData.priority_materials.filter((_: any, idx: number) => idx !== i);
                                                                    setFormData({ ...formData, priority_materials: copy });
                                                                }}
                                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {(!formData.priority_materials || formData.priority_materials.length === 0) && (
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={4} className="py-10 text-center text-[#111827] font-bold text-sm">No materials tracked yet.</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        )}

                        {task.form_type !== 'cbd' && step === 7 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Safety Observations Table */}
                                <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
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
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.client_safety ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].client_safety = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.safety_nc ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].safety_nc = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-center text-xs font-bold text-orange-600 outline-none focus:border-orange-500" placeholder="0" />
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
                                <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
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
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.client_quality ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].client_quality = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-center text-xs font-bold text-[#111827] outline-none focus:border-[#2563EB]" placeholder="0" />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <input type="number" min="0" value={obs.quality_nc ?? ''} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onChange={e => {
                                                                const copy = { ...formData };
                                                                copy.safety_quality.tower_observations[i].quality_nc = Math.max(0, parseInt(e.target.value) || 0);
                                                                setFormData(copy);
                                                            }} className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded text-center text-xs font-bold text-red-600 outline-none focus:border-red-500" placeholder="0" />
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

                                {/* Detailed Issues Section */}
                                <div className="bg-white p-6 rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h2 className="text-md font-black text-[#111827] tracking-tight uppercase">Detailed Issues</h2>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const newIssue = { id: Date.now(), towerId: '', issue: '', status: 'Open' };
                                                    const copy = { ...formData };
                                                    if (!copy.safety_quality.detailed_issues) copy.safety_quality.detailed_issues = [];
                                                    copy.safety_quality.detailed_issues.push(newIssue);
                                                    setFormData(copy);
                                                }}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                                            >
                                                <Plus size={14} /> Add Issue
                                            </button>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                            <thead>
                                                <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                                    <th className="py-2.5 px-4 w-1/4">LOCATION (TOWER)</th>
                                                    <th className="py-2.5 px-4 w-1/2">ISSUE DESCRIPTION</th>
                                                    <th className="py-2.5 px-4 text-center w-32">STATUS</th>
                                                    <th className="py-2.5 px-4 text-center w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#F3F4F6]">
                                                {formData.safety_quality?.detailed_issues?.map((issue: any, i: number) => (
                                                    <tr key={i} className="hover:bg-[#F9FAFB]/50 transition-colors">
                                                        <td className="py-4 px-4">
                                                            <select
                                                                value={issue.towerId || ''}
                                                                onChange={e => {
                                                                    const copy = { ...formData };
                                                                    copy.safety_quality.detailed_issues[i].towerId = e.target.value;
                                                                    setFormData(copy);
                                                                }}
                                                                className="w-full p-2 bg-white border border-[#D1D5DB] rounded text-[#111827] text-xs outline-none focus:border-[#2563EB] font-bold"
                                                            >
                                                                <option value="">Select Tower/Area</option>
                                                                {formData.safety_quality.towers?.map((t: any) => (
                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                ))}
                                                                <option value="Overall">Overall Site</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <input
                                                                type="text"
                                                                value={issue.issue || ''}
                                                                onChange={e => {
                                                                    const copy = { ...formData };
                                                                    copy.safety_quality.detailed_issues[i].issue = e.target.value;
                                                                    setFormData(copy);
                                                                }}
                                                                placeholder="Describe the issue..."
                                                                className="w-full p-2 bg-white border border-[#D1D5DB] rounded text-[#111827] text-xs outline-none focus:border-[#2563EB] font-bold"
                                                            />
                                                        </td>
                                                        <td className="py-4 px-4 text-center">
                                                            <select
                                                                value={issue.status || 'Open'}
                                                                onChange={e => {
                                                                    const copy = { ...formData };
                                                                    copy.safety_quality.detailed_issues[i].status = e.target.value;
                                                                    setFormData(copy);
                                                                }}
                                                                className={`p-1.5 border rounded-lg outline-none text-[10px] font-black w-24 text-center transition-colors ${issue.status === 'Closed' ? 'bg-[#D1FAE5] text-[#059669] border-[#A7F3D0]' : 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]'}`}
                                                            >
                                                                <option value="Open">OPEN</option>
                                                                <option value="Closed">CLOSED</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-4 px-4 text-center">
                                                            {!readOnly && (
                                                                <button
                                                                    onClick={() => {
                                                                        const copy = { ...formData };
                                                                        copy.safety_quality.detailed_issues.splice(i, 1);
                                                                        setFormData(copy);
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {(!formData.safety_quality?.detailed_issues || formData.safety_quality.detailed_issues.length === 0) && (
                                            <div className="py-12 text-center text-[#9CA3AF] font-bold text-sm italic">No detailed issues logged for today.</div>
                                        )}
                                    </div>
                                </div>
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
                                                description: '',
                                                status: 'Open',
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
                                        className="px-4 py-2 bg-[#136dec] hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-100 rounded-lg active:scale-95 transition-all"
                                    >
                                        <Plus size={16} strokeWidth={3} /> Log New Issue
                                    </button>
                                </div>

                                <div className="space-y-4 pb-12">
                                    {(!formData.other_issues || formData.other_issues.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl border border-slate-100 border-dashed">
                                            <div className="size-16 bg-slate-50 flex items-center justify-center rounded-full mb-4 border border-slate-100 shadow-sm">
                                                <AlertCircle size={24} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-1">No Action Items</h3>
                                            <p className="text-[11px] font-medium text-slate-500 max-w-sm">No issues or action items have been logged for this report yet.</p>
                                        </div>
                                    ) : (
                                        formData.other_issues.map((issue: any, i: number) => {
                                            const isNew = issue.id > 1700000000000;
                                            const hasEmployeeOrDept = (issue.assignments?.some((a: any) => a.type === 'employee' || a.type === 'department')) || (issue.responsible && issue.responsible.length > 0);
                                            const hasReviewer = !!issue.reviewer_id;

                                            return (
                                                <div key={i} className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 hover:shadow-md transition-all group overflow-hidden relative">
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${issue.status === 'Open' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                                    <div className="p-5 flex flex-col gap-4">
                                                        {/* Card Header: Assignment Controls */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {!hasEmployeeOrDept && isNew && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => { setActiveIssueIndex(i); setTagType('#'); setTagQuery(''); setShowTagPopover(true); }}
                                                                            className="px-2 py-0.5 border border-orange-200 text-orange-600 bg-orange-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-orange-100 transition-colors"
                                                                        >
                                                                            <Building size={10} /> Assign Dept
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setActiveIssueIndex(i); setTagType('@'); setTagQuery(''); setShowTagPopover(true); }}
                                                                            className="px-2 py-0.5 border border-blue-200 text-blue-600 bg-blue-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                                        >
                                                                            <User size={10} /> Assign Employee
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {!hasReviewer && isNew && (
                                                                    <button
                                                                        onClick={() => { setActiveIssueIndex(i); setTagType('^'); setTagQuery(''); setShowTagPopover(true); }}
                                                                        className="px-2 py-0.5 border border-purple-200 text-purple-600 bg-purple-50 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-purple-100 transition-colors"
                                                                    >
                                                                        <User size={10} /> Set Reviewer
                                                                    </button>
                                                                )}
                                                                {!isNew && !issue.mom_point_id && (
                                                                    <div className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-slate-200">
                                                                        <Lock size={10} /> Locked Case
                                                                    </div>
                                                                )}
                                                                {issue.source === 'MOM' && (
                                                                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-blue-200">
                                                                        <MessageSquare size={10} /> MOM ID: #{issue.mom_point_id}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`px-2 py-0.5 rounded-md border font-black text-[9px] uppercase tracking-widest ${issue.status === 'Open' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                                    {issue.status?.toUpperCase()}
                                                                </div>
                                                                {isNew && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const copy = { ...formData };
                                                                            copy.other_issues.splice(i, 1);
                                                                            setFormData(copy);
                                                                        }}
                                                                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
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
                                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 text-[10px] font-bold">
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
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-black text-[10px] font-bold`}>
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
                                                                    <div key={idx} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 group">
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
                                                                    <div key={`new-${idx}`} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 group">
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
                                                                        className={`w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 ${(!isNew && issue.source !== 'MOM') ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                                    />
                                                                </div>
                                                                {(isNew || issue.source === 'MOM') && (
                                                                    <div className="flex items-center gap-3">
                                                                        {issue.mom_point_id && (
                                                                            <button
                                                                                onClick={() => fetchDiscussion(issue.mom_point_id)}
                                                                                className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-2 py-1 rounded-md transition-colors border border-blue-100"
                                                                            >
                                                                                <MessageSquare size={14} /> History
                                                                            </button>
                                                                        )}
                                                                        {!readOnly && isNew && (
                                                                            <button
                                                                                onClick={() => document.getElementById(`file-input-${i}`)?.click()}
                                                                                className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
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
                                                        <div ref={popoverRef} className="absolute top-16 left-5 w-64 bg-white shadow-xl rounded-xl border border-slate-100 z-50 p-2 overflow-hidden overflow-y-auto max-h-64 custom-scrollbar">
                                                            <div className="p-2 border-b border-slate-50 mb-1">
                                                                <input
                                                                    type="text"
                                                                    value={tagQuery}
                                                                    onChange={(e) => handleTagSearch(e.target.value, tagType)}
                                                                    autoFocus
                                                                    placeholder={`Search ${tagType === '#' ? 'departments' : 'employees'}...`}
                                                                    className="w-full text-[11px] font-bold p-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                            {tagResults.length > 0 ? tagResults.map((item: any) => (
                                                                <button key={item.id} onClick={() => selectTag(item, i)} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group">
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
                                <div className="w-full md:w-[450px] h-[95vh] bg-white rounded-l-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500 md:mr-0 mr-[-16px]">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Discussion History</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MOM Point #{showDiscussionId}</p>
                                        </div>
                                        <button
                                            onClick={() => setShowDiscussionId(null)}
                                            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
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
                                                <div className="size-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4 border border-slate-100">
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
                                                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm text-slate-700 leading-relaxed break-words font-medium">
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
            <footer className="px-6 py-4 border-t border-gray-100 bg-[#F9FAFB] flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button
                    onClick={handleBack}
                    className={`px-6 py-2 bg-white hover:bg-gray-50 text-[#6B7280] font-bold rounded-lg transition-all flex items-center gap-2 border border-gray-200 text-xs ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ArrowLeft size={14} /> Back
                </button>

                <div className="flex items-center gap-3">
                    {step < steps.length ? (
                        <button
                            onClick={handleNext}
                            className="px-8 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-lg transition-all flex items-center gap-2 active:scale-95 group text-xs shadow-md shadow-blue-100"
                        >
                            Continue
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        !readOnly && (
                            <button
                                onClick={() => onSubmit(formData)}
                                disabled={submitting}
                                className="px-10 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-xs shadow-md shadow-green-100"
                            >
                                {submitting ? 'Submitting...' : 'Submit Final Report'}
                                <Check size={16} />
                            </button>
                        )
                    )}
                </div>
            </footer>
        </div>
    );
}
