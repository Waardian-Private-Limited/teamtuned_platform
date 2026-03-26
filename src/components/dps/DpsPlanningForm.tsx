"use client";

import React from 'react';
import {
    HardHat,
    Plus,
    Trash2,
    RefreshCw,
    Clock,
    Wrench,
    PackageOpen,
    Layers,
    AlertCircle,
    History as HistoryIcon,
    Calendar
} from 'lucide-react';

interface DpsPlanningFormProps {
    isEditMode: boolean;
    isExpired: () => boolean;
    scheduleValidFrom: string;
    setScheduleValidFrom: (v: string) => void;
    scheduleValidTill: string;
    setScheduleValidTill: (v: string) => void;
    getValidityDuration: () => number;
    concreteMode: 'Date-wise' | 'Monthly';
    setConcreteMode: (v: 'Date-wise' | 'Monthly') => void;
    concreteScope: 'Tower-wise' | 'Overall';
    setConcreteScope: (v: 'Tower-wise' | 'Overall') => void;
    handleGeneratePlanning: () => void;
    concretePlanning: any[];
    setConcretePlanning: (v: any) => void;
    addRecord: (setter: any, baseItem: any) => void;
    removeRecord: (setter: any, id: any) => void;
    updateRecord: (setter: any, id: any, field: string, value: any) => void;
    siteConfig: any;
    staffMode: 'Date-wise' | 'Monthly';
    setStaffMode: (v: 'Date-wise' | 'Monthly') => void;
    staffScope: 'Tower-wise' | 'Overall';
    setStaffScope: (v: 'Tower-wise' | 'Overall') => void;
    handleGenerateStaffPlanning: () => void;
    staffPlanning: any[];
    setStaffPlanning: (v: any) => void;
    handleSyncStaff: () => void;
    labourMode: 'Date-wise' | 'Monthly';
    setLabourMode: (v: 'Date-wise' | 'Monthly') => void;
    labourScope: 'Tower-wise' | 'Overall';
    setLabourScope: (v: 'Tower-wise' | 'Overall') => void;
    handleGenerateLabourPlanning: () => void;
    labourPlanning: any[];
    setLabourPlanning: (v: any) => void;
    handleSyncLabor: () => void;
    monthlySchedules: any[];
    setMonthlySchedules: (v: any) => void;
    equipments: any[];
    setEquipments: (v: any) => void;
    equipmentList: string[];
    equipmentMode: 'Date-wise' | 'Monthly';
    setEquipmentMode: (v: 'Date-wise' | 'Monthly') => void;
    equipmentScope: 'Tower-wise' | 'Overall';
    setEquipmentScope: (v: 'Tower-wise' | 'Overall') => void;
    handleGenerateEquipmentPlanning: () => void;
    handleSyncEquipment: () => void;
    materials: any[];
    setMaterials: (v: any) => void;
    latestStats?: {
        todayAchieved: number;
        monthlyPlanned: number;
        monthlyAchieved: number;
        totalPlanned: number;
        totalAchieved: number;
    };
    observationAction: any[];
    setObservationAction: (v: any) => void;
    onViewTargetHistory?: (id: string | number) => void;
    readOnly?: boolean;
}

export function DpsPlanningForm({
    isEditMode,
    isExpired,
    scheduleValidFrom,
    setScheduleValidFrom,
    scheduleValidTill,
    setScheduleValidTill,
    getValidityDuration,
    concreteMode,
    setConcreteMode,
    concreteScope,
    setConcreteScope,
    handleGeneratePlanning,
    concretePlanning,
    setConcretePlanning,
    addRecord,
    removeRecord,
    updateRecord,
    siteConfig,
    staffMode,
    setStaffMode,
    staffScope,
    setStaffScope,
    handleGenerateStaffPlanning,
    staffPlanning,
    setStaffPlanning,
    handleSyncStaff,
    labourMode,
    setLabourMode,
    labourScope,
    setLabourScope,
    handleGenerateLabourPlanning,
    labourPlanning,
    setLabourPlanning,
    handleSyncLabor,
    monthlySchedules,
    setMonthlySchedules,
    equipments,
    setEquipments,
    equipmentList,
    equipmentMode,
    setEquipmentMode,
    equipmentScope,
    setEquipmentScope,
    handleGenerateEquipmentPlanning,
    handleSyncEquipment,
    materials,
    setMaterials,
    latestStats,
    observationAction,
    setObservationAction,
    onViewTargetHistory,
    readOnly = false
}: DpsPlanningFormProps) {
    const [labourView, setLabourView] = React.useState<'list' | 'grid'>('grid');

    const uniqueTowers = React.useMemo(() => {
        const t = siteConfig?.towers?.map((t: any) => t.name) || [];
        const a = siteConfig?.areas?.map((a: any) => a.name) || [];
        const existing = Array.from(new Set(labourPlanning.map(p => p.towerId)));
        return Array.from(new Set(['Overall', ...t, ...a, ...existing])).filter(Boolean);
    }, [siteConfig, labourPlanning]);

    const uniqueTypes = React.useMemo(() => {
        const configTypes = siteConfig?.laborTypes?.map((l: any) => l.name) || [];
        const existing = Array.from(new Set(labourPlanning.map(p => p.type)));
        return Array.from(new Set([...configTypes, ...existing])).filter(Boolean);
    }, [siteConfig, labourPlanning]);

    const groupedLabour = React.useMemo(() => {
        return labourPlanning.reduce((acc, plan) => {
            const key = plan.date || 'No Date';
            if (!acc[key]) acc[key] = [];
            acc[key].push(plan);
            return acc;
        }, {} as Record<string, any[]>);
    }, [labourPlanning]);
    return (
        <>
            <style>{`
                fieldset:disabled .edit-btn, fieldset:disabled button { display: none !important; }
                fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea { background-color: transparent !important; border-color: transparent !important; opacity: 1; -webkit-appearance: none; appearance: none; color: #111; user-select: none; }
            `}</style>
            <fieldset disabled={!isEditMode || readOnly} className="p-0 m-0 border-none space-y-6 w-full min-w-0">

                {/* Schedule Validity */}
                <div className="bg-white px-3 py-2 text-sm rounded-sm border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center relative overflow-hidden">
                    {isExpired() && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10">Expired</div>}
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Schedule Valid From</label>
                        <input type="date" value={scheduleValidFrom} onChange={e => setScheduleValidFrom(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:border-black outline-none font-medium text-gray-700" />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Schedule Valid Till</label>
                        <input type="date" value={scheduleValidTill} onChange={e => setScheduleValidTill(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:border-black outline-none font-medium text-gray-700" />
                    </div>
                    <div className="w-full md:w-32 flex flex-col items-center justify-center px-3 py-2 text-sm bg-blue-50/30 rounded-sm border border-blue-50">
                        <span className="text-[10px] font-black text-blue-400 uppercase">Duration</span>
                        <span className="text-2xl font-black text-blue-600">{getValidityDuration()}</span>
                        <span className="text-[10px] font-bold text-blue-400">Days</span>
                    </div>
                </div>

                {/* 2. Concrete Planning */}
                <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 gap-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-3"><Layers className="text-amber-500" />Concrete Planning</h2>
                            <p className="text-xs text-gray-400 font-medium ml-9">Set planned concrete volumes per date/month and tower.</p>
                        </div>

                        {/* Summary Metrics (Dashboard Style) */}
                        <div className="grid grid-cols-3 gap-0 border border-black divide-x divide-black w-full md:w-auto">
                            <div className="px-4 py-2 bg-slate-50 flex flex-col items-center min-w-[100px]">
                                <span className="text-[8px] font-black text-black/60 uppercase tracking-widest">Today's Achieved</span>
                                <span className="text-sm font-black text-black">{latestStats?.todayAchieved || 0} m³</span>
                            </div>
                            <div className="px-4 py-2 bg-white flex flex-col items-center min-w-[100px]">
                                <span className="text-[8px] font-black text-black/60 uppercase tracking-widest">Monthly Status</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-black text-emerald-600">{latestStats?.monthlyAchieved || 0}</span>
                                    <span className="text-[8px] font-bold text-black/40">/ {concretePlanning.reduce((sum, p) => sum + (Number(p.concretePlanned) || 0), 0)}</span>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-slate-50 flex flex-col items-center min-w-[100px]">
                                <span className="text-[8px] font-black text-black/60 uppercase tracking-widest">Total Achieved</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-black text-blue-600">{latestStats?.totalAchieved || 0}</span>
                                    <span className="text-[8px] font-bold text-black/40">/ {concretePlanning.reduce((sum, p) => sum + (Number(p.concretePlanned) || 0), 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setConcreteMode('Date-wise')} className={`px-3 py-1.5 ${concreteMode === 'Date-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Date-wise</button>
                                <button onClick={() => setConcreteMode('Monthly')} className={`px-3 py-1.5 ${concreteMode === 'Monthly' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Monthly</button>
                            </div>
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setConcreteScope('Tower-wise')} className={`px-3 py-1.5 ${concreteScope === 'Tower-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Tower-wise</button>
                                <button onClick={() => setConcreteScope('Overall')} className={`px-3 py-1.5 ${concreteScope === 'Overall' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Overall</button>
                            </div>
                            <button
                                onClick={handleGeneratePlanning}
                                className="text-amber-600 font-bold text-xs bg-amber-50 px-4 py-2 rounded-sm hover:bg-amber-100 flex items-center gap-2 border border-amber-100 transition-all shadow-sm active:scale-95 group"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                Generate Records
                            </button>
                            <button
                                onClick={() => addRecord(setConcretePlanning, { towerId: siteConfig?.towers[0]?.name || 'Overall', date: '', concretePlanned: '' })}
                                className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={14} />
                                Add Record
                            </button>
                        </div>
                    </div>

                    {/* Site-Wide Stats Summary */}
                    {siteConfig && (() => {
                        const formTotalPlanned = concretePlanning.reduce((sum, p) => sum + (Number(p.concretePlanned) || 0), 0);
                        const cumulativeAchieved = siteConfig.concrete_cumulative_till_date || siteConfig.concreteCumulativeTillDate || 0;
                        const executionPercent = formTotalPlanned > 0 ? (cumulativeAchieved / formTotalPlanned) * 100 : 0;

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-sm border border-gray-100">
                                <div className="flex flex-col border-r border-gray-200 last:border-0 pl-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Planned</span>
                                    <span className="text-lg font-black text-gray-700">
                                        {formTotalPlanned || (siteConfig.total_concrete_planned || siteConfig.totalConcretePlanned || 0)} CUM
                                    </span>
                                </div>
                                <div className="flex flex-col border-r border-gray-200 last:border-0 pl-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cumulative Till Date</span>
                                    <span className="text-lg font-black text-gray-700">{cumulativeAchieved} CUM</span>
                                </div>
                                <div className="flex flex-col pl-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overall Execution</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500"
                                                style={{ width: `${Math.min(100, executionPercent)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-black text-amber-600 whitespace-nowrap">
                                            {executionPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="grid grid-cols-[1.2fr_1.5fr_1.5fr_auto] gap-4 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-2">
                        <div>{concreteMode === 'Date-wise' ? 'Date' : 'Month'}</div><div>Select Tower / Area</div><div>Concrete Planned (CUM)</div><div></div>
                    </div>
                    {concretePlanning.map(plan => (
                        <div key={plan.id} className="grid grid-cols-[1.2fr_1.5fr_1.5fr_auto] gap-4 items-center group">
                            {concreteMode === 'Date-wise' ? (
                                <input type="date" value={plan.date || ''} onChange={e => updateRecord(setConcretePlanning, plan.id, 'date', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-blue-600 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" />
                            ) : (
                                <input type="text" value={plan.date} onChange={e => updateRecord(setConcretePlanning, plan.id, 'date', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" placeholder="January 2024" />
                            )}
                            <select value={plan.towerId} onChange={e => updateRecord(setConcretePlanning, plan.id, 'towerId', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none">
                                <option value="Overall">Overall Site</option>
                                {siteConfig?.towers?.map((t: any, idx: number) => <option key={idx} value={t.name}>{t.name}</option>)}
                                {siteConfig?.areas?.map((area: any) => (
                                    <option key={area.name} value={area.name}>{area.name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="0"
                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                value={plan.concretePlanned}
                                onChange={e => updateRecord(setConcretePlanning, plan.id, 'concretePlanned', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none"
                                placeholder="CUM"
                            />
                            <button onClick={() => removeRecord(setConcretePlanning, plan.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>

                {/* 2b. Staff Planning */}
                <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 gap-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-3"><HardHat className="text-blue-500" />Staff Planning</h2>
                            <p className="text-xs text-gray-400 font-medium ml-9">Set daily staff requirements per tower.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setStaffMode('Date-wise')} className={`px-3 py-1.5 ${staffMode === 'Date-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Date-wise</button>
                                <button onClick={() => setStaffMode('Monthly')} className={`px-3 py-1.5 ${staffMode === 'Monthly' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Monthly</button>
                            </div>
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setStaffScope('Tower-wise')} className={`px-3 py-1.5 ${staffScope === 'Tower-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Tower-wise</button>
                                <button onClick={() => setStaffScope('Overall')} className={`px-3 py-1.5 ${staffScope === 'Overall' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Overall</button>
                            </div>
                            <button
                                onClick={handleGenerateStaffPlanning}
                                className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 border border-blue-100 transition-all shadow-sm active:scale-95 group"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                Generate Records
                            </button>
                            <button
                                onClick={handleSyncStaff}
                                className="text-gray-600 font-bold text-xs bg-gray-50 px-4 py-2 rounded-sm hover:bg-gray-100 flex items-center gap-2 border border-gray-200 transition-all shadow-sm active:scale-95 group"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                Sync
                            </button>
                            <button
                                onClick={() => addRecord(setStaffPlanning, { towerId: siteConfig?.towers[0]?.name || 'Overall', role: '', designation: '', plannedCount: '', is_manual: true })}
                                className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={14} />
                                Add Record
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_auto] gap-4 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-2">
                        <div>{staffMode === 'Date-wise' ? 'Date' : 'Month'}</div><div>Select Tower</div><div>Designation / Role</div><div>Planned Count</div><div></div>
                    </div>
                    {staffPlanning.map(plan => (
                        <div key={plan.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_auto] gap-4 items-center">
                            {staffMode === 'Date-wise' ? (
                                <input type="date" value={plan.date || ''} onChange={e => updateRecord(setStaffPlanning, plan.id, 'date', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-blue-600 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" />
                            ) : (
                                <input type="text" value={plan.date || ''} onChange={e => updateRecord(setStaffPlanning, plan.id, 'date', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" placeholder="Month..." />
                            )}
                            <select value={plan.towerId} onChange={e => updateRecord(setStaffPlanning, plan.id, 'towerId', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none">
                                <option value="Overall">Overall</option>
                                {siteConfig?.areas?.map((area: any) => (
                                    <option key={area.name} value={area.name}>{area.name}</option>
                                ))}
                                {siteConfig?.towers?.map((t: any, idx: number) => <option key={idx} value={t.name}>{t.name || `Tower ${idx + 1}`}</option>)}
                            </select>
                            <input
                                type="text"
                                value={plan.role || plan.designation || ''}
                                onChange={e => {
                                    setStaffPlanning((prev: any) => prev.map((item: any) =>
                                        item.id === plan.id ? { ...item, role: e.target.value, designation: e.target.value } : item
                                    ));
                                }}
                                className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none"
                                placeholder="E.g. Site Engineer"
                            />
                            <input
                                type="number"
                                min="0"
                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                value={plan.plannedCount || ''}
                                onChange={e => updateRecord(setStaffPlanning, plan.id, 'plannedCount', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none text-center"
                                placeholder="0"
                            />
                            <button onClick={() => removeRecord(setStaffPlanning, plan.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                        </div>
                    ))}

                    {staffPlanning.length > 0 && (
                        <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_auto] gap-4 items-center px-2 py-3 bg-blue-50/20 border-t border-blue-100 mt-2">
                            <div className="col-span-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right pr-4">Total Staff Planned</div>
                            <div className="text-sm font-black text-blue-700 text-center">
                                {staffPlanning.reduce((sum, p) => sum + (Number(p.plannedCount) || 0), 0)}
                            </div>
                            <div></div>
                        </div>
                    )}
                </div>

                {/* 2c. Labour Planning */}
                <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 gap-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-3"><HardHat className="text-red-500" />Labour Planning</h2>
                            <p className="text-xs text-gray-400 font-medium ml-9">Set daily manpower requirements per tower.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setLabourMode('Date-wise')} className={`px-3 py-1.5 ${labourMode === 'Date-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Date-wise</button>
                                <button onClick={() => setLabourMode('Monthly')} className={`px-3 py-1.5 ${labourMode === 'Monthly' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Monthly</button>
                            </div>
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setLabourScope('Tower-wise')} className={`px-3 py-1.5 ${labourScope === 'Tower-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Tower-wise</button>
                                <button onClick={() => setLabourScope('Overall')} className={`px-3 py-1.5 ${labourScope === 'Overall' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Overall</button>
                            </div>
                            <button
                                onClick={handleGenerateLabourPlanning}
                                className="text-red-600 font-bold text-xs bg-red-50 px-4 py-2 rounded-sm hover:bg-red-100 flex items-center gap-2 border border-red-100 transition-all shadow-sm active:scale-95 group"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                Generate
                            </button>
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setLabourView('list')} className={`px-3 py-1.5 ${labourView === 'list' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>List</button>
                                <button onClick={() => setLabourView('grid')} className={`px-3 py-1.5 ${labourView === 'grid' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Grid</button>
                            </div>
                            <button
                                onClick={handleSyncLabor}
                                className="text-red-600 font-bold text-xs bg-red-50 px-4 py-2 rounded-sm hover:bg-red-100 flex items-center gap-2 transition-all border border-red-50 shadow-sm active:scale-95 group"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                Sync
                            </button>
                            <button
                                onClick={() => addRecord(setLabourPlanning, { towerId: siteConfig?.towers[0]?.name || 'Overall', date: '', labourName: '', type: '', plannedCount: '' })}
                                className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={14} />
                                Add Row
                            </button>
                        </div>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                        {labourView === 'list' ? (
                            <>
                                <div className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-3 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-4 mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-50">
                                    <div>{labourMode === 'Date-wise' ? 'Date' : 'Month'}</div><div>Tower</div><div>Labour Name</div><div>Trade / Type</div><div>Qty</div><div></div>
                                </div>
                                <div className="space-y-2">
                                    {labourPlanning.map(plan => (
                                        <div key={plan.id} className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-3 items-center bg-gray-50/30 p-3 rounded-sm border border-gray-50 hover:border-red-100 hover:bg-red-50/30 transition-all group">
                                            {labourMode === 'Date-wise' ? (
                                                <input type="date" value={plan.date || ''} onChange={e => updateRecord(setLabourPlanning, plan.id, 'date', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-sm focus:border-red-400 outline-none text-[10px] font-bold text-blue-600" />
                                            ) : (
                                                <input type="text" value={plan.date || ''} onChange={e => updateRecord(setLabourPlanning, plan.id, 'date', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-sm focus:border-red-400 outline-none text-[10px] font-bold text-gray-700" placeholder="Month..." />
                                            )}
                                            <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
                                                <select value={plan.towerId} onChange={e => updateRecord(setLabourPlanning, plan.id, 'towerId', e.target.value)} className="w-full px-2 py-2 text-[10px] font-bold text-gray-700 outline-none bg-transparent">
                                                    <option value="Overall">Overall</option>
                                                    {siteConfig?.areas?.map((area: any) => (
                                                        <option key={area.name} value={area.name}>{area.name}</option>
                                                    ))}
                                                    {siteConfig?.towers?.map((t: any, idx: number) => <option key={idx} value={t.name}>{t.name || `Tower ${idx + 1}`}</option>)}
                                                </select>
                                            </div>
                                            <input type="text" value={plan.labourName || ''} onChange={e => updateRecord(setLabourPlanning, plan.id, 'labourName', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-sm focus:border-red-400 outline-none text-xs font-medium" placeholder="Name/Agency..." />
                                            <input type="text" value={plan.type || ''} onChange={e => updateRecord(setLabourPlanning, plan.id, 'type', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-sm focus:border-red-400 outline-none text-xs font-medium" placeholder="Trade..." />
                                            <input
                                                type="number"
                                                min="0"
                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                value={plan.plannedCount || ''}
                                                onChange={e => updateRecord(setLabourPlanning, plan.id, 'plannedCount', Math.max(0, parseInt(e.target.value) || 0))}
                                                className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-red-400 outline-none text-xs font-bold text-center"
                                                placeholder="0"
                                            />
                                            <button onClick={() => removeRecord(setLabourPlanning, plan.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6">
                                {(Object.entries(groupedLabour) as [string, any[]][]).map(([date, plans]) => (
                                    <div key={date} className="border border-gray-100 rounded-sm overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={12} /> {String(date)}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                Total: {plans.reduce((sum: number, p: any) => sum + (Number(p.plannedCount) || 0), 0)}
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-fixed min-w-max">
                                                <thead>
                                                    <tr className="bg-white border-b border-gray-50 text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                                                        <th className="px-3 py-2 text-left sticky left-0 bg-white z-20 border-r border-gray-50 w-32 shadow-sm">Category</th>
                                                        {uniqueTowers.map(t => (
                                                            <th key={t} className="px-1 py-2 text-center border-r border-gray-50 w-16">{t}</th>
                                                        ))}
                                                        <th className="px-1 py-2 text-center w-16 text-slate-900 border-l border-gray-100">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {uniqueTypes.map(type => {
                                                        let typeTotal = 0;
                                                        return (
                                                            <tr key={type} className="hover:bg-blue-50/30 transition-colors">
                                                                <td className="px-3 py-1 text-[10px] font-bold text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-50 shadow-sm truncate" title={String(type)}>{String(type)}</td>
                                                                {uniqueTowers.map(tower => {
                                                                    const plan = plans.find((p: any) => p.type === type && p.towerId === tower);
                                                                    if (plan) typeTotal += (Number(plan.plannedCount) || 0);
                                                                    return (
                                                                        <td key={tower} className="px-0.5 py-0.5 border-r border-gray-50/50">
                                                                            {plan ? (
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                                                    value={plan.plannedCount || ''}
                                                                                    onChange={e => updateRecord(setLabourPlanning, plan.id, 'plannedCount', Math.max(0, parseInt(e.target.value) || 0))}
                                                                                    className="w-full px-1 py-1.5 text-xs font-black text-center bg-transparent focus:bg-white outline-none focus:ring-1 focus:ring-red-400 rounded-none h-full transition-all"
                                                                                    placeholder="0"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-8 flex items-center justify-center text-[10px] text-gray-200">-</div>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-1 py-1 text-[10px] font-black text-center text-slate-900 border-l border-gray-100 bg-slate-50/30">{typeTotal || '-'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {labourPlanning.length > 0 && (
                            <div className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-3 items-center px-4 py-3 bg-red-50/20 border-t border-red-100 mt-2">
                                <div className="col-span-4 text-[10px] font-black text-red-600 uppercase tracking-widest text-right pr-4">Total Manpower Planned</div>
                                <div className="text-sm font-black text-red-700 text-center">
                                    {labourPlanning.reduce((sum, p) => sum + (Number(p.plannedCount) || 0), 0)}
                                </div>
                                <div></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Monthly Schedule */}
                <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-3"><Clock className="text-purple-500" />Monthly Schedule Setting</h2>
                            <p className="text-xs text-gray-500 font-medium ml-9">Structure daily targets for each tower.</p>
                        </div>
                        <button onClick={() => addRecord(setMonthlySchedules, { towerId: siteConfig?.towers[0]?.id || '', floor: '', customFloor: '', target_date: '', purpose: '' })} className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2"><Plus size={14} /> Add Row</button>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                        <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1.5fr_0.8fr_1fr_auto] gap-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-2 mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-50">
                            <div>Location</div><div>Floor</div><div>Target Date</div><div>Purpose</div><div>Done?</div><div>Done Date</div><div></div>
                        </div>
                        <div className="space-y-2">
                            {monthlySchedules.map(sched => (
                                <div key={sched.id} className={`grid grid-cols-[1fr_1.2fr_1.2fr_1.5fr_0.8fr_1fr_auto] gap-2 items-center p-2 rounded-sm border border-gray-50 transition-all group ${sched.is_achieved === 'Yes' ? 'bg-emerald-50/50' : 'bg-gray-50/30 hover:border-purple-100 hover:bg-purple-50/30'}`}>
                                    <select
                                        disabled={sched.is_achieved === 'Yes'}
                                        value={sched.towerId}
                                        onChange={e => updateRecord(setMonthlySchedules, sched.id, 'towerId', e.target.value)}
                                        className="font-bold text-[10px] text-gray-700 bg-white px-2 py-2 rounded-sm border border-gray-200 shadow-sm outline-none focus:border-purple-400 disabled:opacity-70"
                                    >
                                        <option value="">Select Location...</option>
                                        {(siteConfig?.towers || []).length > 0 && (
                                            <optgroup label="Towers">
                                                {siteConfig.towers.map((t: any, idx: number) => (
                                                    <option key={t.id || idx} value={t.id}>{t.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {(siteConfig?.areas || []).length > 0 && (
                                            <optgroup label="Other Areas">
                                                {siteConfig.areas.map((a: any, idx: number) => (
                                                    <option key={idx} value={a.name}>{a.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    <div className="flex flex-col gap-1 w-full">
                                        <select disabled={sched.is_achieved === 'Yes'} value={sched.floor} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'floor', e.target.value)} className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-purple-400 outline-none text-[10px] font-bold disabled:opacity-70">
                                            <option value="">Select Floor/Subzone...</option>
                                            {(() => {
                                                const tower = siteConfig?.towers?.find((t: any) => t.id === sched.towerId);
                                                const area = siteConfig?.areas?.find((a: any) => a.name === sched.towerId);

                                                if (tower) {
                                                    return (
                                                        <>
                                                            {Array.from({ length: Number(tower.basements) || 0 }).map((_, i) => (
                                                                <option key={`B${i + 1}`} value={`Basement ${i + 1}`}>Basement {i + 1}</option>
                                                            ))}
                                                            {Number(tower.plinths) > 0 && Array.from({ length: Number(tower.plinths) }).map((_, i) => (
                                                                <option key={`P${i + 1}`} value={Number(tower.plinths) === 1 ? 'Plinth' : `Plinth ${i + 1}`}>
                                                                    {Number(tower.plinths) === 1 ? 'Plinth' : `Plinth ${i + 1}`}
                                                                </option>
                                                            ))}
                                                            {Array.from({ length: Number(tower.floors) || 0 }).map((_, i) => (
                                                                <option key={`F${i + 1}`} value={`Floor ${i + 1}`}>Floor {i + 1}</option>
                                                            ))}
                                                            {Array.from({ length: Number(tower.terraces) || 0 }).map((_, i) => (
                                                                <option key={`T${i + 1}`} value={Number(tower.terraces) === 1 ? 'Terrace' : `Terrace ${i + 1}`}>
                                                                    {Number(tower.terraces) === 1 ? 'Terrace' : `Terrace ${i + 1}`}
                                                                </option>
                                                            ))}
                                                        </>
                                                    );
                                                }
                                                if (area) {
                                                    return (area.subNames || []).map((sub: string, i: number) => (
                                                        <option key={i} value={sub}>{sub}</option>
                                                    ));
                                                }
                                                return null;
                                            })()}
                                            <option value="Other">Custom...</option>
                                        </select>
                                        {sched.floor === 'Other' && (
                                            <input disabled={sched.is_achieved === 'Yes'} type="text" value={sched.customFloor || ''} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'customFloor', e.target.value)} placeholder="..." className="w-full px-2 py-1 bg-white border border-purple-200 rounded-sm outline-none text-[9px] font-medium disabled:opacity-70" />
                                        )}
                                    </div>
                                    <input disabled={sched.is_achieved === 'Yes'} type="date" value={sched.target_date || sched.date || ''} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'target_date', e.target.value)} className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-purple-400 outline-none text-[10px] font-bold text-blue-600 disabled:opacity-70" />
                                    <input disabled={sched.is_achieved === 'Yes'} type="text" value={sched.purpose || ''} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'purpose', e.target.value)} className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-purple-400 outline-none text-[10px] font-medium disabled:opacity-70" placeholder="Activity..." />
                                    <select
                                        value={sched.is_achieved || 'No'}
                                        onChange={e => updateRecord(setMonthlySchedules, sched.id, 'is_achieved', e.target.value)}
                                        className={`w-full px-2 py-2 bg-white border border-gray-200 rounded-sm outline-none text-[10px] font-bold ${sched.is_achieved === 'Yes' ? 'text-emerald-600 border-emerald-200' : 'text-gray-500'}`}
                                    >
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                    <input
                                        type="date"
                                        value={sched.achieved_date || ''}
                                        onChange={e => updateRecord(setMonthlySchedules, sched.id, 'achieved_date', e.target.value)}
                                        className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm outline-none text-[10px] font-bold text-emerald-600"
                                    />
                                    <button
                                        disabled={sched.is_achieved === 'Yes'}
                                        onClick={() => removeRecord(setMonthlySchedules, sched.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100 disabled:hidden"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Equipments */}
                <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 gap-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-3"><Wrench className="text-gray-700" />Equipments Tracker</h2>
                            <p className="text-xs text-gray-400 font-medium ml-9">Set daily equipment requirements per tower.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setEquipmentMode('Date-wise')} className={`px-3 py-1.5 ${equipmentMode === 'Date-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Date-wise</button>
                                <button onClick={() => setEquipmentMode('Monthly')} className={`px-3 py-1.5 ${equipmentMode === 'Monthly' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Monthly</button>
                            </div>
                            <div className="flex border border-gray-200 rounded-sm overflow-hidden text-[10px] font-bold">
                                <button onClick={() => setEquipmentScope('Tower-wise')} className={`px-3 py-1.5 ${equipmentScope === 'Tower-wise' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Tower-wise</button>
                                <button onClick={() => setEquipmentScope('Overall')} className={`px-3 py-1.5 ${equipmentScope === 'Overall' ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Overall</button>
                            </div>
                            <button
                                onClick={handleGenerateEquipmentPlanning}
                                className="text-gray-700 font-bold text-xs bg-gray-50 px-4 py-2 rounded-sm hover:bg-gray-100 flex items-center gap-2 border border-gray-200 transition-all shadow-sm active:scale-95 group"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                Generate Records
                            </button>
                            <button
                                onClick={handleSyncEquipment}
                                className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 border border-blue-100 transition-all shadow-sm active:scale-95 group"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                Sync
                            </button>
                            <button
                                onClick={() => addRecord(setEquipments, { towerId: 'Overall', name: '', required: '' })}
                                className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={14} />
                                Add Record
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_auto] gap-4 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-2">
                        <div>{equipmentMode === 'Date-wise' ? 'Date' : 'Month'}</div><div>Select Tower</div><div>Equipment Name</div><div>Required Count</div><div></div>
                    </div>
                    {equipments.map(eq => (
                        <div key={eq.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_auto] gap-4 items-center group">
                            {equipmentMode === 'Date-wise' ? (
                                <input type="date" value={eq.date || ''} onChange={e => updateRecord(setEquipments, eq.id, 'date', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-blue-600 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" />
                            ) : (
                                <input type="text" value={eq.date || ''} onChange={e => updateRecord(setEquipments, eq.id, 'date', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" placeholder="Month..." />
                            )}
                            <select value={eq.towerId} onChange={e => updateRecord(setEquipments, eq.id, 'towerId', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none">
                                <option value="Overall">Overall</option>
                                {siteConfig?.areas?.map((area: any) => (
                                    <option key={area.name} value={area.name}>{area.name}</option>
                                ))}
                                {siteConfig?.towers?.map((t: any, idx: number) => <option key={idx} value={t.name}>{t.name || `Tower ${idx + 1}`}</option>)}
                            </select>
                            <div className="relative">
                                <select value={eq.name} onChange={e => updateRecord(setEquipments, eq.id, 'name', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none">
                                    <option value="">Select Equipment...</option>
                                    {equipmentList.map(item => <option key={item} value={item}>{item}</option>)}
                                    {eq.name && !equipmentList.includes(eq.name) && <option value={eq.name}>{eq.name}</option>}
                                    <option value="Other">Add Manual...</option>
                                </select>
                                {eq.name === 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Enter name"
                                        onBlur={e => updateRecord(setEquipments, eq.id, 'name', e.target.value)}
                                        className="mt-1 w-full px-2 py-1 text-[10px] border border-gray-200 rounded"
                                    />
                                )}
                            </div>
                            <input
                                type="number"
                                min="0"
                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                value={eq.required ?? ''}
                                onChange={e => updateRecord(setEquipments, eq.id, 'required', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none text-center"
                                placeholder="0"
                            />
                            <button onClick={() => removeRecord(setEquipments, eq.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>


                {/* 5. Action Items & Issues (MOM) */}
                <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-3"><AlertCircle className="text-red-500" />Action Items & Issues</h2>
                            <p className="text-xs text-gray-500 font-medium ml-9">Capture site issues and track MOM action points.</p>
                        </div>
                        <button onClick={() => addRecord(setObservationAction, { observation: '', status: 'open', source: 'manual' })} className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 transition-all active:scale-95 shadow-sm border border-blue-100"><Plus size={14} /> Add Issue</button>
                    </div>

                    <div className="space-y-3">
                        {observationAction.map((item, idx) => (
                            <div key={item.id || idx} className={`p-4 rounded-sm border transition-all flex flex-col gap-3 group relative overflow-hidden ${item.source === 'MOM' ? 'bg-amber-50/30 border-amber-100' : 'bg-gray-50/30 border-gray-100 hover:border-gray-200'}`}>
                                {item.source === 'MOM' && (
                                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black px-3 py-0.5 rounded-bl-sm uppercase tracking-tighter">MOM Item</div>
                                )}
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            Issue Description
                                            {item.source === 'MOM' && <span className="text-[9px] font-bold text-amber-600">(Read-only)</span>}
                                        </label>
                                        <textarea
                                            disabled={item.source === 'MOM'}
                                            value={item.observation || ''}
                                            onChange={e => updateRecord(setObservationAction, item.id, 'observation', e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-sm focus:border-black outline-none resize-none disabled:bg-transparent disabled:border-transparent disabled:px-0"
                                            placeholder="Describe the issue or observation..."
                                        />
                                    </div>
                                    <div className="w-32 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                                        <select
                                            disabled={item.source === 'MOM'}
                                            value={item.status || 'open'}
                                            onChange={e => updateRecord(setObservationAction, item.id, 'status', e.target.value)}
                                            className="w-full px-2 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-sm focus:border-black outline-none disabled:opacity-70"
                                        >
                                            <option value="open">Open</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                    {item.source !== 'MOM' && (
                                        <button onClick={() => removeRecord(setObservationAction, item.id)} className="mt-7 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                    )}
                                </div>
                                {item.meeting_title && (
                                    <div className="pt-2 border-t border-amber-100/50 flex items-center justify-between">
                                        <span className="text-[10px] text-amber-600/60 font-medium italic">Source: {item.meeting_title} ({new Date(item.meeting_date).toLocaleDateString()})</span>
                                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${item.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{item.priority} Priority</span>
                                    </div>
                                )}
                            </div>
                        ))}

                        {observationAction.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-300 gap-2 border-2 border-dashed border-gray-50 rounded-sm">
                                <AlertCircle size={40} strokeWidth={1} />
                                <span className="text-xs font-medium">No active issues or action items</span>
                            </div>
                        )}
                    </div>
                </div>

            </fieldset>
        </>
    );
}
