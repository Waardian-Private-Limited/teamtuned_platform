"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Search, UploadCloud, ChevronRight, Check } from 'lucide-react';
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
                const res = await apiClient<any>(`/labor-contractors?search=${encodeURIComponent(term)}&site_id=${siteId}`, {
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
                <div className="grid grid-cols-1 gap-4">
                    {data.report_checklist?.map((item: any, i: number) => (
                        <div key={i} className={`p-5 rounded-xl border transition-all duration-200 ${item.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50 shadow-sm' : item.status === 'No' ? 'border-red-200 bg-red-50/50 shadow-sm' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <span className="font-bold text-slate-700 text-sm flex-1 text-center sm:text-left">{item.description} <span className="text-red-500">*</span></span>
                                <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm shrink-0">
                                    <button disabled={readonly} onClick={() => updateNested('report_checklist', i, 'status', 'Yes')} className={`px-5 py-1.5 text-xs font-bold rounded-md transition-all ${item.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                    <button disabled={readonly} onClick={() => updateNested('report_checklist', i, 'status', 'No')} className={`px-5 py-1.5 text-xs font-bold rounded-md transition-all ${item.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                </div>
                            </div>
                            {item.status === 'Yes' && (
                                <div className="mt-5 pt-4 border-t border-emerald-100/50 transition-all">
                                    <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-widest">Attachments <span className="text-red-500">*</span></div>
                                    <FileInput
                                        readonly={readonly}
                                        value={item.attachments || []}
                                        onChange={(files) => updateNested('report_checklist', i, 'attachments', files)}
                                    />
                                    <div className="mt-4 mb-2 text-xs font-bold text-slate-700 uppercase tracking-widest">Remarks</div>
                                    <input type="text" placeholder="Remarks..." value={item.remark || ''} disabled={readonly} title="Remarks"
                                        onChange={e => updateNested('report_checklist', i, 'remark', e.target.value)}
                                        className="w-full p-2.5 text-sm bg-white border border-emerald-200 rounded-lg outline-none font-medium text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" />
                                </div>
                            )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.documents_client_bill?.map((doc: any, i: number) => (
                        <div key={i} className={`p-5 rounded-xl border transition-all duration-200 ${doc.status === 'Yes' ? 'border-emerald-200 bg-emerald-50/50 shadow-sm' : doc.status === 'No' ? 'border-red-200 bg-red-50/50 shadow-sm' : 'bg-slate-50/50 border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <span className="font-bold text-slate-700 text-sm flex-1 text-center sm:text-left">{doc.document_name} <span className="text-red-500">*</span></span>
                                <div className="flex gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm shrink-0">
                                    <button disabled={readonly} onClick={() => updateNested('documents_client_bill', i, 'status', 'Yes')} className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${doc.status === 'Yes' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'hover:bg-slate-100 text-slate-500'}`}>Yes</button>
                                    <button disabled={readonly} onClick={() => updateNested('documents_client_bill', i, 'status', 'No')} className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${doc.status === 'No' ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : 'hover:bg-slate-100 text-slate-500'}`}>No</button>
                                </div>
                            </div>
                            {doc.status === 'Yes' && (
                                <div className="mt-5 pt-4 border-t border-emerald-100/50 transition-all">
                                    <div className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-widest">Attachments <span className="text-red-500">*</span></div>
                                    <FileInput
                                        readonly={readonly}
                                        value={doc.attachments || []}
                                        onChange={(files) => updateNested('documents_client_bill', i, 'attachments', files)}
                                    />
                                </div>
                            )}
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
                                <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col h-full shadow-sm hover:border-blue-200 transition-colors">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                                        <input type="checkbox" checked={vendor.is_reg_form || false} title="Check to mark as Yes for Vendor Registration Form"
                                            onChange={e => updateNested('vendor_registrations', i, 'is_reg_form', e.target.checked)}
                                            disabled={readonly}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        Registration Form
                                    </label>
                                    <div className="mt-auto pt-3 border-t border-slate-50">
                                        {vendor.is_reg_form ? (
                                            <FileInput readonly={readonly} value={vendor.reg_form_files || []} onChange={files => updateNested('vendor_registrations', i, 'reg_form_files', files)} />
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No File Needed</span>
                                        )}
                                    </div>
                                </div>
                                {/* Work Order */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col h-full shadow-sm hover:border-blue-200 transition-colors">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                                        <input type="checkbox" checked={vendor.is_wo || false} title="Check to mark as Yes for Work Order"
                                            onChange={e => updateNested('vendor_registrations', i, 'is_wo', e.target.checked)}
                                            disabled={readonly}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        Work Order (WO)
                                    </label>
                                    <div className="mt-auto pt-3 border-t border-slate-50">
                                        {vendor.is_wo ? (
                                            <FileInput readonly={readonly} value={vendor.wo_files || []} onChange={files => updateNested('vendor_registrations', i, 'wo_files', files)} />
                                        ) : <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No File Needed</span>}
                                    </div>
                                </div>
                                {/* Closing Bill */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col h-full shadow-sm hover:border-blue-200 transition-colors">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                                        <input type="checkbox" checked={vendor.is_closing || false} title="Check to mark as Yes for Closing Bill"
                                            onChange={e => updateNested('vendor_registrations', i, 'is_closing', e.target.checked)}
                                            disabled={readonly}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        Closing Bill
                                    </label>
                                    <div className="mt-auto pt-3 border-t border-slate-50">
                                        {vendor.is_closing ? (
                                            <FileInput readonly={readonly} value={vendor.closing_files || []} onChange={files => updateNested('vendor_registrations', i, 'closing_files', files)} />
                                        ) : <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No File Needed</span>}
                                    </div>
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

export function AssignmentCard({ task, isHistory = false, onSelect, isOrgAdmin, onChangeAssignee }: { task: DynamicAssignment, isHistory?: boolean, onSelect: (task: DynamicAssignment) => void, isOrgAdmin?: boolean, onChangeAssignee?: (taskId: number, newAssigneeId: number) => void }) {
    const [isChangingAssignee, setIsChangingAssignee] = useState(false);
    const [selectedNewUser, setSelectedNewUser] = useState<any>(null);

    return (
        <div className={`
            bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all
            ${isHistory ? 'border-gray-100' : 'border-blue-100 ring-1 ring-blue-50'}
        `}>
            <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${task.form_type === 'planning' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                    {task.form_type === 'planning' ? 'Execution Plan' : 'CBD Report'}
                </span>
                <span className={`text-xs font-bold flex items-center gap-1 ${isHistory ? 'text-green-600' : 'text-orange-500'}`}>
                    {isHistory ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {isHistory ? 'Submitted' : 'Pending'}
                </span>
            </div>

            <div className="space-y-1 mb-6">
                <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
                    {task.site_name}
                </h3>
                <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                    <MapPin size={14} /> {task.unit_name}
                </p>
                {task.first_name && (
                    <div className="mt-3 bg-gray-50/80 rounded-xl p-3 border border-gray-100/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Assigned To</p>
                                <p className="text-sm font-bold text-gray-800">{task.first_name} {task.last_name || ''}</p>
                            </div>
                            {isOrgAdmin && !isHistory && !isChangingAssignee && (
                                <button onClick={() => setIsChangingAssignee(true)} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">Change</button>
                            )}
                        </div>
                        {isChangingAssignee && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                <EmployeeSearchInput
                                    value={selectedNewUser}
                                    onChange={setSelectedNewUser}
                                />
                                <div className="flex justify-end gap-2 pt-1">
                                    <button onClick={() => { setIsChangingAssignee(false); setSelectedNewUser(null); }} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                    <button
                                        onClick={() => {
                                            if (selectedNewUser?.id && onChangeAssignee) {
                                                onChangeAssignee(task.id, selectedNewUser.id);
                                                setIsChangingAssignee(false);
                                            }
                                        }}
                                        disabled={!selectedNewUser?.id}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Date</p>
                    <p className="text-sm font-semibold text-gray-800">
                        {formatDate(task.due_date)}
                    </p>
                </div>

                {!isHistory ? (
                    <button onClick={() => onSelect(task)} className="px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-black/10">
                        Fill Report
                    </button>
                ) : (
                    <button onClick={() => onSelect(task)} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-bold rounded-xl transition-colors border border-gray-200">
                        View Details
                    </button>
                )}
            </div>
        </div>
    );
}
