"use client";

import React, { useState, useEffect } from 'react';
import {
    X,
    Plus,
    Trash2,
    Save,
    RefreshCw,
    Building,
    MapPin,
    Users,
    HardHat,
    Search,
    ChevronDown,
    Globe,
    Wrench
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface Tower {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    floors: number;
    plinths: number;
    basements: number;
    terraces: number;
}

interface OtherArea {
    name: string;
    subNames: string[];
}

interface StaffEmployee {
    employee_id: number;
    employee_name: string;
}

interface Staff {
    name: string;
    required: number;
    employees?: StaffEmployee[];
}

interface LaborType {
    name: string;
}

interface Equipment {
    name: string;
}

interface SiteConfig {
    site_id: number;
    towers: Tower[];
    areas: OtherArea[];
    staffList?: Staff[];
    laborTypes?: LaborType[];
    equipments?: Equipment[];
    totalConcretePlanned?: number;
    concreteCumulativeTillDate?: number;
}

interface DpsConfigFormProps {
    siteName: string;
    siteConfig: SiteConfig;
    setSiteConfig: (config: SiteConfig) => void;
    savingConfig: boolean;
    onSave: () => void;
    onClose: () => void;
    employees: any[];
}

export function DpsConfigForm({
    siteName,
    siteConfig,
    setSiteConfig,
    savingConfig,
    onSave,
    onClose,
    employees
}: DpsConfigFormProps) {

    // Tower helpers
    const addTower = () => {
        const id = `TWR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        setSiteConfig({ ...siteConfig, towers: [...siteConfig.towers, { id, name: '', startDate: '', endDate: '', floors: 0, plinths: 0, basements: 0, terraces: 0 }] });
    };
    const updateTower = (i: number, f: keyof Tower, v: any) => {
        const t = [...siteConfig.towers]; t[i] = { ...t[i], [f]: v };
        setSiteConfig({ ...siteConfig, towers: t });
    };
    const removeTower = (i: number) => {
        setSiteConfig({ ...siteConfig, towers: siteConfig.towers.filter((_, idx) => idx !== i) });
    };

    // Area helpers
    const addArea = () => {
        setSiteConfig({ ...siteConfig, areas: [...siteConfig.areas, { name: '', subNames: [] }] });
    };
    const updateArea = (i: number, f: keyof OtherArea, v: any) => {
        const a = [...siteConfig.areas]; a[i] = { ...a[i], [f]: v };
        setSiteConfig({ ...siteConfig, areas: a });
    };
    const removeArea = (i: number) => {
        setSiteConfig({ ...siteConfig, areas: siteConfig.areas.filter((_, idx) => idx !== i) });
    };
    const addSubName = (ai: number) => {
        const a = [...siteConfig.areas]; a[ai].subNames.push('');
        setSiteConfig({ ...siteConfig, areas: a });
    };
    const updateSubName = (ai: number, si: number, v: string) => {
        const a = [...siteConfig.areas]; a[ai].subNames[si] = v;
        setSiteConfig({ ...siteConfig, areas: a });
    };
    const removeSubName = (ai: number, si: number) => {
        const a = [...siteConfig.areas]; a[ai].subNames = a[ai].subNames.filter((_, i) => i !== si);
        setSiteConfig({ ...siteConfig, areas: a });
    };

    // Staff helpers
    const addStaff = () => { setSiteConfig({ ...siteConfig, staffList: [...(siteConfig.staffList || []), { name: '', required: 1, employees: [] }] }); };
    const updateStaff = (i: number, f: keyof Staff, v: any) => { const s = [...(siteConfig.staffList || [])]; s[i] = { ...s[i], [f]: v }; setSiteConfig({ ...siteConfig, staffList: s }); };
    const addStaffEmployee = (si: number, emp: StaffEmployee) => { const s = [...(siteConfig.staffList || [])]; const existing = s[si].employees || []; if (existing.find(e => e.employee_id === emp.employee_id)) return; s[si] = { ...s[si], employees: [...existing, emp] }; setSiteConfig({ ...siteConfig, staffList: s }); };
    const removeStaffEmployee = (si: number, empId: number) => { const s = [...(siteConfig.staffList || [])]; s[si] = { ...s[si], employees: (s[si].employees || []).filter(e => e.employee_id !== empId) }; setSiteConfig({ ...siteConfig, staffList: s }); };
    const removeStaff = (i: number) => { setSiteConfig({ ...siteConfig, staffList: (siteConfig.staffList || []).filter((_, idx) => idx !== i) }); };

    // Labor helpers
    const addLaborType = () => { setSiteConfig({ ...siteConfig, laborTypes: [...(siteConfig.laborTypes || []), { name: '' }] }); };
    const updateLaborType = (i: number, v: string) => { const l = [...(siteConfig.laborTypes || [])]; l[i].name = v; setSiteConfig({ ...siteConfig, laborTypes: l }); };
    const removeLaborType = (i: number) => { setSiteConfig({ ...siteConfig, laborTypes: (siteConfig.laborTypes || []).filter((_, idx) => idx !== i) }); };

    // Equipment helpers
    const addEquipment = () => { setSiteConfig({ ...siteConfig, equipments: [...(siteConfig.equipments || []), { name: '' }] }); };
    const updateEquipment = (i: number, v: string) => { const e = [...(siteConfig.equipments || [])]; e[i].name = v; setSiteConfig({ ...siteConfig, equipments: e }); };
    const removeEquipment = (i: number) => { setSiteConfig({ ...siteConfig, equipments: (siteConfig.equipments || []).filter((_, idx) => idx !== i) }); };

    const populateFromMaster = async (type: 'staff' | 'labor' | 'equipment') => {
        try {
            const res = await apiClient<any>('/dps-schedule/master-config', { method: 'GET', withAuth: true });
            if (!res.config) return;

            if (type === 'staff') {
                const masterStaff = res.config.staffList || [];
                const currentStaff = siteConfig.staffList || [];
                // Merge or replace? Let's append new ones
                const mergedStaff = [...currentStaff];
                masterStaff.forEach((ms: any) => {
                    if (!mergedStaff.find(s => s.name.toLowerCase() === ms.name.toLowerCase())) {
                        mergedStaff.push({ ...ms, employees: [] });
                    }
                });
                setSiteConfig({ ...siteConfig, staffList: mergedStaff });
            } else if (type === 'labor') {
                const masterLabor = res.config.laborTypes || [];
                const currentLabor = siteConfig.laborTypes || [];
                const mergedLabor = [...currentLabor];
                masterLabor.forEach((ml: any) => {
                    if (!mergedLabor.find(l => l.name.toLowerCase() === ml.name.toLowerCase())) {
                        mergedLabor.push(ml);
                    }
                });
                setSiteConfig({ ...siteConfig, laborTypes: mergedLabor });
            } else if (type === 'equipment') {
                const masterEq = res.config.equipments || [];
                const currentEq = siteConfig.equipments || [];
                const mergedEq = [...currentEq];
                masterEq.forEach((me: any) => {
                    if (!mergedEq.find(e => e.name.toLowerCase() === me.name.toLowerCase())) {
                        mergedEq.push(me);
                    }
                });
                setSiteConfig({ ...siteConfig, equipments: mergedEq });
            }
        } catch (error) {
            console.error('Failed to populate from master:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-2 text-sm bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/30">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">{siteName} — Site Configuration</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Define towers and operational areas</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Site Metrics / Concrete Planning */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                                <Save size={16} className="text-green-600" />
                                <h4 className="font-bold text-gray-800">Concrete Site Planning</h4>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-green-50/30 p-4 rounded border border-green-100">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Total Concrete Planned (CUM)</label>
                                <input
                                    type="number"
                                    value={siteConfig.totalConcretePlanned ?? 0}
                                    onChange={e => setSiteConfig({ ...siteConfig, totalConcretePlanned: Math.max(0, parseFloat(e.target.value) || 0) })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none text-sm font-black text-gray-700 bg-white"
                                    placeholder="Total Target"
                                    min="0"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Cumulative Concrete Till Date (CUM)</label>
                                <input
                                    type="number"
                                    value={siteConfig.concreteCumulativeTillDate ?? 0}
                                    onChange={e => setSiteConfig({ ...siteConfig, concreteCumulativeTillDate: Math.max(0, parseFloat(e.target.value) || 0) })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none text-sm font-black text-gray-700 bg-white"
                                    placeholder="Achieved so far"
                                    min="0"
                                />
                            </div>
                            <div className="space-y-1 flex flex-col justify-end">
                                <div className="px-4 py-2.5 bg-green-600 text-white rounded shadow-sm flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Progress</span>
                                    <span className="text-lg font-black italic">
                                        {siteConfig.totalConcretePlanned! > 0
                                            ? ((siteConfig.concreteCumulativeTillDate! / siteConfig.totalConcretePlanned!) * 100).toFixed(1)
                                            : '0.0'}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Towers */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                                <Building size={16} className="text-blue-600" />
                                <h4 className="font-bold text-gray-800">Towers</h4>
                            </div>
                            <button onClick={addTower} className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition-all">
                                <Plus size={13} /> Add Tower
                            </button>
                        </div>
                        {siteConfig?.towers?.map((tower: Tower, idx: number) => (
                            <div key={idx} className="px-3 py-2 text-sm bg-white rounded border border-gray-200 space-y-3 hover:border-blue-200 transition-all">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tower {idx + 1}</span>
                                    <button onClick={() => removeTower(idx)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"><Trash2 size={13} /></button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {([
                                        { label: 'Name', field: 'name', type: 'text' },
                                        { label: 'Start Date', field: 'startDate', type: 'date' },
                                        { label: 'End Date', field: 'endDate', type: 'date' },
                                        { label: 'Total Floors', field: 'floors', type: 'number' },
                                        { label: 'No. of Plinths', field: 'plinths', type: 'number' },
                                        { label: 'No. of Basements', field: 'basements', type: 'number' },
                                        { label: 'No. of Terraces', field: 'terraces', type: 'number' },
                                    ] as { label: string; field: keyof Tower; type: string }[]).map(({ label, field, type }) => (
                                        <div key={field} className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
                                            <input
                                                type={type}
                                                value={(tower as any)[field] ?? (type === 'number' ? 0 : '')}
                                                onChange={e => updateTower(idx, field, type === 'number' ? Math.max(0, parseInt(e.target.value) || 0) : e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                                                min={type === 'number' ? "0" : undefined}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {(!siteConfig?.towers || siteConfig.towers.length === 0) && (
                            <div className="py-6 border border-dashed border-gray-200 rounded text-center text-gray-400 text-sm italic">No towers added</div>
                        )}
                    </section>

                    {/* Areas */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-purple-600" />
                                <h4 className="font-bold text-gray-800">Other Areas</h4>
                            </div>
                            <button onClick={addArea} className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded text-xs font-bold transition-all">
                                <Plus size={13} /> Add Area
                            </button>
                        </div>
                        {siteConfig?.areas?.map((area: OtherArea, idx: number) => (
                            <div key={idx} className="px-3 py-2 text-sm bg-white rounded border border-gray-200 space-y-3 hover:border-purple-200 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area Name</label>
                                        <input
                                            type="text"
                                            value={area.name}
                                            onChange={e => updateArea(idx, 'name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-purple-500 outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <button onClick={() => removeArea(idx)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all mt-4"><Trash2 size={14} /></button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sub-zones</span>
                                        <button onClick={() => addSubName(idx)} className="text-[10px] font-bold text-purple-500 hover:underline">+ Add zone</button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {area.subNames.map((sub: string, si: number) => (
                                            <div key={si} className="relative">
                                                <input
                                                    type="text"
                                                    value={sub}
                                                    onChange={e => updateSubName(idx, si, e.target.value)}
                                                    className="w-full pl-3 pr-8 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                                />
                                                <button onClick={() => removeSubName(idx, si)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 transition-colors"><X size={11} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!siteConfig?.areas || siteConfig.areas.length === 0) && (
                            <div className="py-6 border border-dashed border-gray-200 rounded text-center text-gray-400 text-sm italic">No areas added</div>
                        )}
                    </section>

                    {/* Staff List */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-orange-600" />
                                <h4 className="font-bold text-gray-800">Master Staff List</h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => populateFromMaster('staff')}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-[10px] font-black uppercase tracking-widest border border-gray-200 transition-all"
                                >
                                    <Globe size={11} /> Populate from Master
                                </button>
                                <button onClick={addStaff} className="flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded text-xs font-bold transition-all">
                                    <Plus size={13} /> Add Staff Role
                                </button>
                            </div>
                        </div>
                        {siteConfig?.staffList?.map((staff: Staff, idx: number) => (
                            <div key={idx} className="px-3 py-2 text-sm bg-white rounded border border-gray-200 space-y-3 hover:border-orange-200 transition-all flex flex-col md:flex-row items-end gap-3">
                                <div className="flex-[2] w-full space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role Name</label>
                                    <input
                                        type="text"
                                        value={staff.name}
                                        onChange={e => updateStaff(idx, 'name', e.target.value)}
                                        placeholder="e.g. Site Engineer"
                                        className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div className="flex-1 w-full space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Required Count</label>
                                    <input
                                        type="number"
                                        value={staff.required || 0}
                                        onChange={e => updateStaff(idx, 'required', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 outline-none text-sm font-medium"
                                        min="0"
                                    />
                                </div>
                                <div className="flex-[2] w-full space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Map Employees (Optional)</label>
                                    <EmployeeSelect
                                        employees={employees}
                                        onChange={(id, name) => {
                                            if (id && name) addStaffEmployee(idx, { employee_id: id, employee_name: name });
                                        }}
                                        placeholder="Add Employee..."
                                    />
                                    {staff.employees && staff.employees.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {staff.employees.map(emp => (
                                                <div key={emp.employee_id} className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-xs font-medium">
                                                    <span>{emp.employee_name}</span>
                                                    <button
                                                        onClick={() => removeStaffEmployee(idx, emp.employee_id)}
                                                        className="p-0.5 hover:bg-orange-200 rounded-full transition-colors"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removeStaff(idx)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all mb-0.5 self-center md:self-end"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </section>

                    {/* Labor Types */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                                <HardHat size={16} className="text-amber-600" />
                                <h4 className="font-bold text-gray-800">Labor Types</h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => populateFromMaster('labor')}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-[10px] font-black uppercase tracking-widest border border-gray-200 transition-all"
                                >
                                    <Globe size={11} /> Populate from Master
                                </button>
                                <button onClick={addLaborType} className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-xs font-bold transition-all">
                                    <Plus size={13} /> Add Labor Type
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {siteConfig?.laborTypes?.map((labor: LaborType, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={labor.name}
                                        onChange={e => updateLaborType(idx, e.target.value)}
                                        placeholder="e.g. Mason, Helper..."
                                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded outline-none focus:border-amber-400 text-sm font-medium"
                                    />
                                    <button onClick={() => removeLaborType(idx)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Equipments */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <div className="flex items-center gap-2">
                                <Wrench size={16} className="text-blue-600" />
                                <h4 className="font-bold text-gray-800">Equipments</h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => populateFromMaster('equipment')}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-[10px] font-black uppercase tracking-widest border border-gray-200 transition-all"
                                >
                                    <Globe size={11} /> Populate from Master
                                </button>
                                <button onClick={addEquipment} className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition-all">
                                    <Plus size={13} /> Add Equipment
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {siteConfig?.equipments?.map((eq: Equipment, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={eq.name}
                                        onChange={e => updateEquipment(idx, e.target.value)}
                                        placeholder="e.g. Concrete Pump, JW..."
                                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded outline-none focus:border-blue-400 text-sm font-medium"
                                    />
                                    <button onClick={() => removeEquipment(idx)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50/30">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={onSave}
                        disabled={savingConfig || !siteConfig}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {savingConfig ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                        Save Config
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmployeeSelect({ value, onChange, employees, initialName, placeholder = "Select Employee" }: { value?: number; onChange: (id: number | undefined, name: string | undefined) => void; employees: any[]; initialName?: string; placeholder?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<any[]>([]);

    const selectedEmp = value ? employees?.find(e => e.id === value) : null;
    const displayName = selectedEmp ? `${selectedEmp.name || (selectedEmp.first_name + ' ' + selectedEmp.last_name)} (${selectedEmp.designation || 'No Role'})` : (initialName || placeholder);

    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            setLoading(true);
            const debounce = setTimeout(async () => {
                try {
                    const res = await apiClient<any>(`/organization/employees?format=paginated&search=${encodeURIComponent(searchQuery.trim())}&limit=10&status=active`, { method: 'GET', withAuth: true });
                    const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.items) ? res.items : []);
                    setOptions(items);
                } catch (e) {
                    setOptions([]);
                } finally {
                    setLoading(false);
                }
            }, 300);
            return () => clearTimeout(debounce);
        } else {
            setOptions([]);
        }
    }, [searchQuery]);

    return (
        <div className="relative">
            <div
                onMouseDown={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
                className="w-full px-3 py-2 border border-gray-200 rounded outline-none text-sm font-medium bg-white cursor-pointer flex justify-between items-center hover:border-orange-300 transition-colors"
            >
                <span className={value ? "text-gray-900 truncate" : "text-gray-400"}>{displayName}</span>
                <div className="flex items-center gap-1">
                    {value && (
                        <button type="button" onMouseDown={(e) => { e.stopPropagation(); setIsOpen(false); onChange(undefined, undefined); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors">
                            <X size={12} />
                        </button>
                    )}
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[199]" onMouseDown={() => { setIsOpen(false); setSearchQuery(""); }} />
                    <div className="absolute z-[200] w-full mt-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search by name (min 2 chars)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded outline-none focus:border-orange-500 text-xs text-gray-700"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-48 custom-scrollbar">
                            {loading ? (
                                <div className="p-3 text-center text-xs text-gray-500 flex flex-col items-center">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin mb-1 text-orange-400" />
                                    Searching...
                                </div>
                            ) : searchQuery.trim().length < 2 ? (
                                <div className="p-3 text-center text-xs text-gray-400">Type at least 2 chars to search</div>
                            ) : options.length === 0 ? (
                                <div className="p-3 text-center text-xs text-gray-400">No employees found</div>
                            ) : (
                                options.map((emp) => (
                                    <div
                                        key={emp.id}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            onChange(emp.id, emp.name || (emp.first_name + ' ' + emp.last_name));
                                            setIsOpen(false);
                                            setSearchQuery("");
                                        }}
                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                    >
                                        <p className="text-xs font-bold text-gray-900">{emp.name || (emp.first_name + ' ' + emp.last_name)}</p>
                                        <p className="text-[10px] text-gray-500">{emp.designation || 'No Role'} • {emp.department_name || 'No Dept'}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
