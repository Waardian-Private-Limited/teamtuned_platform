"use client";

import React from 'react';
import {
    HardHat,
    Plus,
    Trash2,
    RefreshCw,
    Clock,
    Wrench,
    PackageOpen
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
    setMaterials
}: DpsPlanningFormProps) {
    return (
        <>
            <style>{`
                fieldset:disabled .edit-btn, fieldset:disabled button { display: none !important; }
                fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea { background-color: transparent !important; border-color: transparent !important; opacity: 1; -webkit-appearance: none; appearance: none; color: #111; user-select: none; }
            `}</style>
            <fieldset disabled={!isEditMode} className="p-0 m-0 border-none space-y-6 w-full min-w-0">

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
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-3"><HardHat className="text-amber-500" />Concrete Planning</h2>
                            <p className="text-xs text-gray-400 font-medium ml-9">Set planned concrete volumes per date/month and tower.</p>
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
                    {siteConfig && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-sm border border-gray-100">
                            <div className="flex flex-col border-r border-gray-200 last:border-0 pl-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Planned</span>
                                <span className="text-lg font-black text-gray-700">{siteConfig.total_concrete_planned || siteConfig.totalConcretePlanned || 0} CUM</span>
                            </div>
                            <div className="flex flex-col border-r border-gray-200 last:border-0 pl-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cumulative Till Date</span>
                                <span className="text-lg font-black text-gray-700">{siteConfig.concrete_cumulative_till_date || siteConfig.concreteCumulativeTillDate || 0} CUM</span>
                            </div>
                            <div className="flex flex-col pl-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overall Execution</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500"
                                            style={{ width: `${Math.min(100, ((siteConfig.total_concrete_planned || siteConfig.totalConcretePlanned) > 0 ? ((siteConfig.concrete_cumulative_till_date || siteConfig.concreteCumulativeTillDate) / (siteConfig.total_concrete_planned || siteConfig.totalConcretePlanned)) * 100 : 0))}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-black text-amber-600 whitespace-nowrap">
                                        {((siteConfig.total_concrete_planned || siteConfig.totalConcretePlanned) > 0 ? ((siteConfig.concrete_cumulative_till_date || siteConfig.concreteCumulativeTillDate) / (siteConfig.total_concrete_planned || siteConfig.totalConcretePlanned)) * 100 : 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-[1.2fr_1.5fr_1.5fr_auto] gap-4 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-2">
                        <div>{concreteMode === 'Date-wise' ? 'Date' : 'Month'}</div><div>Select Tower / Area</div><div>Concrete Planned (CUM)</div><div></div>
                    </div>
                    {concretePlanning.map(plan => (
                        <div key={plan.id} className="grid grid-cols-[1.2fr_1.5fr_1.5fr_auto] gap-4 items-center group">
                            {concreteMode === 'Date-wise' ? (
                                <input type="date" value={plan.date} onChange={e => updateRecord(setConcretePlanning, plan.id, 'date', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-blue-600 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" />
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
                            <input type="number" value={plan.concretePlanned} onChange={e => updateRecord(setConcretePlanning, plan.id, 'concretePlanned', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" placeholder="CUM" />
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
                                onClick={() => addRecord(setStaffPlanning, { towerId: siteConfig?.towers[0]?.name || 'Overall', designation: '', plannedCount: '' })}
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
                            <input type="text" value={plan.designation || ''} onChange={e => updateRecord(setStaffPlanning, plan.id, 'designation', e.target.value)} className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none" placeholder="E.g. Site Engineer" />
                            <input type="number" value={plan.plannedCount || ''} onChange={e => updateRecord(setStaffPlanning, plan.id, 'plannedCount', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none text-center" placeholder="0" />
                            <button onClick={() => removeRecord(setStaffPlanning, plan.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                        </div>
                    ))}
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
                                Generate Records
                            </button>
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
                    <div className="max-h-[500px] overflow-y-auto pr-2">
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
                                    <input type="number" value={plan.plannedCount || ''} onChange={e => updateRecord(setLabourPlanning, plan.id, 'plannedCount', e.target.value)} className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-red-400 outline-none text-xs font-bold text-center" placeholder="0" />
                                    <button onClick={() => removeRecord(setLabourPlanning, plan.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
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
                        <div className="grid grid-cols-[1.2fr_1.5fr_1.2fr_1.8fr_auto] gap-2 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-2 mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-50">
                            <div>Tower / Area</div><div>Floor / Subzone</div><div>Target Date</div><div>Purpose</div><div></div>
                        </div>
                        <div className="space-y-2">
                            {monthlySchedules.map(sched => (
                                <div key={sched.id} className="grid grid-cols-[1.2fr_1.5fr_1.2fr_1.8fr_auto] gap-2 items-center bg-gray-50/30 p-2 rounded-sm border border-gray-50 hover:border-purple-100 hover:bg-purple-50/30 transition-all group">
                                    <select
                                        value={sched.towerId}
                                        onChange={e => updateRecord(setMonthlySchedules, sched.id, 'towerId', e.target.value)}
                                        className="font-bold text-[10px] text-gray-700 bg-white px-2 py-2 rounded-sm border border-gray-200 shadow-sm outline-none focus:border-purple-400"
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
                                        <select value={sched.floor} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'floor', e.target.value)} className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-purple-400 outline-none text-[10px] font-bold">
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
                                            <input type="text" value={sched.customFloor || ''} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'customFloor', e.target.value)} placeholder="..." className="w-full px-2 py-1 bg-white border border-purple-200 rounded-sm outline-none text-[9px] font-medium" />
                                        )}
                                    </div>
                                    <input type="date" value={sched.target_date || sched.date} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'target_date', e.target.value)} className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-purple-400 outline-none text-[10px] font-bold text-blue-600" />
                                    <input type="text" value={sched.purpose} onChange={e => updateRecord(setMonthlySchedules, sched.id, 'purpose', e.target.value)} className="w-full px-2 py-2 bg-white border border-gray-200 rounded-sm focus:border-purple-400 outline-none text-[10px] font-medium" placeholder="Activity..." />
                                    <button onClick={() => removeRecord(setMonthlySchedules, sched.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
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
                                onClick={() => addRecord(setEquipments, { towerId: 'Overall', name: '', required: '', available: '' })}
                                className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-sm hover:bg-blue-100 flex items-center gap-2 transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={14} />
                                Add Record
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto] gap-4 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-2">
                        <div>{equipmentMode === 'Date-wise' ? 'Date' : 'Month'}</div><div>Select Tower</div><div>Equipment Name</div><div>Required</div><div>Available</div><div></div>
                    </div>
                    {equipments.map(eq => (
                        <div key={eq.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto] gap-4 items-center group">
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
                            <input type="number" value={eq.required} onChange={e => updateRecord(setEquipments, eq.id, 'required', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none text-center" placeholder="0" />
                            <input type="number" value={eq.available} onChange={e => updateRecord(setEquipments, eq.id, 'available', e.target.value)} className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-sm focus:border-blue-400 outline-none text-center" placeholder="0" />
                            <button onClick={() => removeRecord(setEquipments, eq.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>

            </fieldset>
        </>
    );
}
