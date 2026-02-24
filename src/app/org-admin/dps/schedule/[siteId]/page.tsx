"use client";

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Building, Calendar, Layers, ShieldCheck, Wrench, AlertCircle, Plus, Trash2, Clock, HardHat, PackageOpen, FileText, RefreshCw, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

export default function SiteDpsSchedulePage() {
    const router = useRouter();
    const params = useParams();
    const siteId = params.siteId;

    const [siteData, setSiteData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(true);
    const [scheduleId, setScheduleId] = useState<number | null>(null);
    const [scheduleStatus, setScheduleStatus] = useState<string>('active');
    const [scheduleValidFrom, setScheduleValidFrom] = useState('');
    const [scheduleValidTill, setScheduleValidTill] = useState('');

    // --- State Management ---
    const [towers, setTowers] = useState<any[]>([{ id: 1, name: 'Tower A', startDate: '', endDate: '', duration: '', basements: '', plinth: 'Not Included', floors: '' }]);
    const [concretePlanning, setConcretePlanning] = useState<any[]>([{ id: 1, towerId: 'Overall', concretePlanned: '' }]);
    const [staffPlanning, setStaffPlanning] = useState([{ id: 1, towerId: 'Overall', designation: '', plannedCount: '' }]);
    const [labourPlanning, setLabourPlanning] = useState([{ id: 1, towerId: 'Overall', date: '', labourName: '', type: '', plannedCount: '' }]);
    const [monthlySchedules, setMonthlySchedules] = useState([{ id: 1, towerId: 1, floor: '', customFloor: '', date: '', purpose: '' }]);
    const [equipments, setEquipments] = useState([{ id: 1, name: '', required: '', available: '' }]);
    const [observations, setObservations] = useState([{ id: 1, towerId: 1, type: 'Safety', description: '' }]);
    const [materials, setMaterials] = useState([{ id: 1, name: '', quantity: '', requiredDate: '' }]);
    const [otherIssues, setOtherIssues] = useState('');

    // Predefined lists for Selects
    const observationTypes = ['Safety', 'Quality', 'NC'];
    const equipmentList = ['Crane', 'Excavator', 'Concrete Mixer', 'Bulldozer', 'Other (Add New)'];

    useEffect(() => {
        if (siteId) {
            fetchSiteData();
        }
    }, [siteId]);

    const fetchSiteData = async () => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const res = await apiClient<any>(`/sites/${siteId}`, { method: 'GET', withAuth: true });
            if (res?.site) setSiteData(res.site);

            // Fetch existing schedule if any
            try {
                const schedRes = await apiClient<any>(`/dps-schedule/${siteId}`, { method: 'GET', withAuth: true });
                if (schedRes?.schedule) {
                    const s = schedRes.schedule;
                    setScheduleId(s.id);
                    setScheduleStatus(s.status);
                    if (s.schedule_valid_from) setScheduleValidFrom(s.schedule_valid_from.split('T')[0]);
                    if (s.schedule_valid_till) setScheduleValidTill(s.schedule_valid_till.split('T')[0]);
                    if (s.towers) setTowers(s.towers);
                    if (s.concrete_planning) setConcretePlanning(s.concrete_planning);
                    if (s.staff_planning) setStaffPlanning(s.staff_planning);
                    if (s.labour_planning) setLabourPlanning(s.labour_planning);
                    if (s.monthly_schedules) setMonthlySchedules(s.monthly_schedules);
                    if (s.equipments) setEquipments(s.equipments);
                    if (s.observations) setObservations(s.observations);
                    if (s.materials) setMaterials(s.materials);
                    if (s.other_issues) setOtherIssues(s.other_issues);
                    setIsEditMode(false);
                }
            } catch (scheduleError) {
                console.log('No existing schedule found for this site.');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleBack = () => {
        router.push('/org-admin/dps/schedule');
    };

    const addRecord = (setter: any, baseItem: any) => {
        setter((prev: any) => [...prev, { ...baseItem, id: Date.now() }]);
    };
    const removeRecord = (setter: any, id: number) => {
        setter((prev: any) => prev.filter((item: any) => item.id !== id));
    };
    const updateRecord = (setter: any, id: number, field: string, value: any) => {
        setter((prev: any) => prev.map((item: any) => item.id === id ? { ...item, [field]: value } : item));
    };

    // Calculate duration based on dates automatically
    const handleDateChange = (id: number, field: string, value: string) => {
        setTowers(prev => prev.map(t => {
            if (t.id === id) {
                const updated = { ...t, [field]: value };
                if (updated.startDate && updated.endDate) {
                    const diffTime = Math.abs(new Date(updated.endDate).getTime() - new Date(updated.startDate).getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    updated.duration = diffDays > 0 ? `${diffDays} days` : '0 days';
                }
                return updated;
            }
            return t;
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const res = await apiClient<any>(`/dps-schedule/${siteId}`, {
                method: 'POST',
                withAuth: true,
                body: {
                    id: scheduleId,
                    scheduleValidFrom,
                    scheduleValidTill,
                    towers,
                    concretePlanning,
                    staffPlanning,
                    labourPlanning,
                    monthlySchedules,
                    equipments,
                    observations,
                    materials,
                    otherIssues
                }
            });
            if (res) {
                alert('DPS Schedule has been saved successfully!');
                router.push('/org-admin/dps/submissions'); // Redirect to submissions view
            }
        } catch (error) {
            console.error('Failed to save schedule', error);
            alert('Failed to save schedule. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const isExpired = () => {
        if (!scheduleValidTill) return false;
        return new Date(scheduleValidTill) < new Date(new Date().setHours(0, 0, 0, 0));
    };

    const getValidityDuration = () => {
        if (!scheduleValidFrom || !scheduleValidTill) return 0;
        const start = new Date(scheduleValidFrom);
        const end = new Date(scheduleValidTill);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 0;
    };

    const handleCreateNew = () => {
        setScheduleId(null);
        setScheduleValidFrom('');
        setScheduleValidTill('');
        // Keep Towers as they are usually constant, but reset planning counts if desired.
        // For now, just reset the ID to force a new SQL Insert
        setIsEditMode(true);
    };

    const handleExport = async () => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const blob = await apiClient<Blob>(`/dps-schedule/${siteId}/export`, {
                method: 'GET',
                withAuth: true,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DPS_Report_${siteData?.name || siteId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to export schedule', error);
            alert('Failed to generate Excel report.');
        }
    };

    const handleSyncLabor = async () => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            // 1. Try to fetch contractors for this site
            const contractorsRes = await apiClient<any>(`/labor/contractors?site_id=${siteId}`, { method: 'GET', withAuth: true });
            const contractors = contractorsRes?.contractors || [];

            const newPlanning: any[] = [];
            for (const contractor of contractors) {
                // Fetch categories/subcategories for each contractor
                const catRes = await apiClient<any>(`/labor/contractors/${contractor.id}/categories`, { method: 'GET', withAuth: true });
                const categories = catRes?.categories || [];

                for (const cat of categories) {
                    if (cat.subcategory_name) {
                        newPlanning.push({
                            id: Date.now() + Math.random(),
                            towerId: 'Overall',
                            date: '',
                            labourName: contractor.name || '',
                            type: cat.subcategory_name || '',
                            plannedCount: ''
                        });
                    }
                }
            }

            // 2. Fallback: If no site-contractors found, fetch system-wide labor subcategories (e.g. Carpenter, Helper)
            if (newPlanning.length === 0) {
                const subRes = await apiClient<any>(`/labor/subcategories`, { method: 'GET', withAuth: true });
                const subcategories = Array.isArray(subRes) ? subRes : (subRes?.subcategories || subRes?.data || []);

                for (const sub of subcategories) {
                    newPlanning.push({
                        id: Date.now() + Math.random(),
                        towerId: 'Overall',
                        date: '',
                        labourName: '', // User will fill this or it stays general
                        type: sub.name || '',
                        plannedCount: ''
                    });
                }
            }

            if (newPlanning.length > 0) {
                setLabourPlanning(prev => {
                    // Filter out truly empty initial rows
                    const current = prev.filter(p => p.labourName || p.type || p.plannedCount);
                    return [...current, ...newPlanning];
                });
                alert(`Synced ${newPlanning.length} labor trades/categories.`);
            } else {
                alert('No labor categories or contractors found in the system.');
            }
        } catch (error) {
            console.error('Failed to sync labor', error);
        }
    };

    const handleSyncStaff = async () => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            // Fetch employees for this site
            const empRes = await apiClient<any>(`/organization/employees?site_id=${siteId}`, { method: 'GET', withAuth: true });
            const employees = Array.isArray(empRes) ? empRes : (empRes?.employees || empRes?.data || []);

            // Use designations to group
            const designations = Array.from(new Set(employees.map((e: any) => e.designation).filter(Boolean)));
            const newPlanning = (designations as string[]).map(d => ({
                id: Date.now() + Math.random(),
                towerId: 'Overall',
                designation: d || '',
                plannedCount: '1'
            }));

            if (newPlanning.length > 0) {
                setStaffPlanning(prev => {
                    if (prev.length === 1 && !prev[0].designation) return newPlanning;
                    return [...prev, ...newPlanning];
                });
                alert(`Synced staff requirements from ${employees.length} assigned employees.`);
            } else {
                alert('No employees with designations found for this site.');
            }
        } catch (error) {
            console.error('Failed to sync staff', error);
        }
    };



    return (
        <div className="max-w-7xl mx-auto p-8 space-y-10 pb-32">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button
                    onClick={handleBack}
                    className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <Building className="text-blue-600" size={40} />
                        {siteData ? `${siteData.name} - DPS Schedule` : 'Site execution Schedule'}
                    </h1>
                    <p className="text-gray-500 text-lg font-medium mt-1">Configure the execution parameters and schedule for this site.</p>
                </div>
            </div>

            <style>{`
                fieldset:disabled .edit-btn, fieldset:disabled button { display: none !important; }
                fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea { background-color: transparent !important; border-color: transparent !important; opacity: 1; -webkit-appearance: none; appearance: none; color: #111; user-select: none; }
            `}</style>
            <fieldset disabled={!isEditMode} className="p-0 m-0 border-none space-y-10 w-full min-w-0">

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-center relative overflow-hidden">
                    {isExpired() && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10">
                            Expired
                        </div>
                    )}
                    <div className="flex-1 w-full relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Schedule Valid From</label>
                        <input
                            type="date"
                            value={scheduleValidFrom}
                            onChange={(e) => setScheduleValidFrom(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium text-gray-700"
                        />
                    </div>
                    <div className="flex-1 w-full relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Schedule Valid Till</label>
                        <input
                            type="date"
                            value={scheduleValidTill}
                            onChange={(e) => setScheduleValidTill(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium text-gray-700"
                        />
                    </div>
                    <div className="w-full md:w-32 flex flex-col items-center justify-center p-4 bg-blue-50/30 rounded-2xl border border-blue-50">
                        <span className="text-[10px] font-black text-blue-400 uppercase">Duration</span>
                        <span className="text-2xl font-black text-blue-600">{getValidityDuration()}</span>
                        <span className="text-[10px] font-bold text-blue-400">Days</span>
                    </div>
                </div>

                {/* 1. Project Towers Setup */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <Layers className="text-blue-500" />
                            Project Towers Overview
                        </h2>
                        <button
                            onClick={() => {
                                const nextChar = String.fromCharCode(65 + towers.length);
                                const defaultName = `Tower ${nextChar}`;
                                addRecord(setTowers, { name: defaultName, startDate: '', endDate: '', duration: '', basements: '', plinth: 'Not Included', floors: '' });
                            }}
                            className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2"
                        >
                            <Plus size={16} /> Add Tower
                        </button>
                    </div>
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 font-bold text-sm text-gray-400 uppercase tracking-wider px-2">
                        <div>Tower Name</div>
                        <div>Start Date</div>
                        <div>End Date</div>
                        <div>Duration</div>
                        <div></div>
                    </div>
                    {towers.map(tower => (
                        <div key={tower.id} className="space-y-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center">
                                <input
                                    required
                                    type="text" value={tower.name} onChange={(e) => updateRecord(setTowers, tower.id, 'name', e.target.value)}
                                    pattern=".*"
                                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-black outline-none font-medium" placeholder="E.g. Tower A" />
                                <input
                                    type="date" value={tower.startDate} onChange={(e) => handleDateChange(tower.id, 'startDate', e.target.value)}
                                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-black outline-none font-medium text-gray-600" />
                                <input
                                    type="date" value={tower.endDate} onChange={(e) => handleDateChange(tower.id, 'endDate', e.target.value)}
                                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-black outline-none font-medium text-gray-600" />
                                <input
                                    required
                                    type="text" value={tower.duration} readOnly
                                    pattern=".*"
                                    className="w-full p-4 bg-gray-100 border border-gray-200 rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed" placeholder="Auto-calculated" />
                                <button onClick={() => removeRecord(setTowers, tower.id)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Basements</label>
                                    <input
                                        type="number" min="0" value={tower.basements} onChange={(e) => updateRecord(setTowers, tower.id, 'basements', e.target.value)}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-black outline-none font-medium" placeholder="Count (e.g. 2)" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Plinth Status</label>
                                    <select
                                        value={tower.plinth} onChange={(e) => updateRecord(setTowers, tower.id, 'plinth', e.target.value)}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-black outline-none font-medium"
                                    >
                                        <option value="Not Included">Not Included</option>
                                        <option value="Included">Included</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Floors (Above Plinth)</label>
                                    <input
                                        type="number" min="0" value={tower.floors} onChange={(e) => updateRecord(setTowers, tower.id, 'floors', e.target.value)}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-black outline-none font-medium" placeholder="Count (e.g. 15)" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. Concrete Planning */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <HardHat className="text-amber-500" />
                            Concrete Planning
                        </h2>
                        <button onClick={() => addRecord(setConcretePlanning, { towerId: 'Overall', concretePlanned: '' })} className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2">
                            <Plus size={16} /> Add Record
                        </button>
                    </div>
                    <div className="grid grid-cols-[1fr_2fr_auto] gap-4 font-bold text-sm text-gray-400 uppercase tracking-wider px-2">
                        <div>Select Tower</div>
                        <div>Concrete Planned (CUM)</div>
                        <div></div>
                    </div>
                    {concretePlanning.map(plan => (
                        <div key={plan.id} className="grid grid-cols-[1fr_2fr_auto] gap-4 items-center">
                            <select
                                value={plan.towerId} onChange={(e) => updateRecord(setConcretePlanning, plan.id, 'towerId', e.target.value === 'Overall' || e.target.value === 'NTA_PODIUM' ? e.target.value : Number(e.target.value))}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium"
                            >
                                <option value="Overall">Overall (Entire Site)</option>
                                <option value="NTA_PODIUM">NTA/PODIUM</option>
                                {towers.map(t => <option key={t.id} value={t.id}>{t.name || 'Unnamed Tower'}</option>)}
                            </select>
                            <input
                                type="number" value={plan.concretePlanned} onChange={(e) => updateRecord(setConcretePlanning, plan.id, 'concretePlanned', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" placeholder="Volume in cubic meters" />
                            <button onClick={() => removeRecord(setConcretePlanning, plan.id)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 2b. Staff Planning */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <HardHat className="text-blue-500" />
                            Staff Planning
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={handleSyncStaff} className="text-gray-600 font-bold text-sm bg-gray-50 px-4 py-2 rounded-xl hover:bg-gray-100 flex items-center gap-2 border border-gray-100 transition-colors">
                                <RefreshCw size={16} /> Sync
                            </button>
                            <button onClick={() => addRecord(setStaffPlanning, { towerId: 'Overall', designation: '', plannedCount: '' })} className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2">
                                <Plus size={16} /> Add Record
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 font-bold text-sm text-gray-400 uppercase tracking-wider px-2">
                        <div>Select Tower</div>
                        <div>Designation / Role</div>
                        <div>Planned Count</div>
                        <div></div>
                    </div>
                    {staffPlanning.map(plan => (
                        <div key={plan.id} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 items-center">
                            <select
                                value={plan.towerId} onChange={(e) => updateRecord(setStaffPlanning, plan.id, 'towerId', e.target.value === 'Overall' || e.target.value === 'NTA_PODIUM' ? e.target.value : Number(e.target.value))}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium"
                            >
                                <option value="Overall">Overall (Entire Site)</option>
                                <option value="NTA_PODIUM">NTA/PODIUM</option>
                                {towers.map(t => <option key={t.id} value={t.id}>{t.name || 'Unnamed Tower'}</option>)}
                            </select>
                            <input
                                type="text" value={plan.designation || ''} onChange={(e) => updateRecord(setStaffPlanning, plan.id, 'designation', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" placeholder="E.g. Site Engineer, Supervisor" />
                            <input
                                type="number" value={plan.plannedCount || ''} onChange={(e) => updateRecord(setStaffPlanning, plan.id, 'plannedCount', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" placeholder="Qty" />
                            <button onClick={() => removeRecord(setStaffPlanning, plan.id)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 2c. Labour Planning */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                <HardHat className="text-red-500" />
                                Labour Planning
                            </h2>
                            <p className="text-xs text-gray-500 font-medium ml-9">Set daily manpower requirements per tower.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSyncLabor} className="text-red-600 font-bold text-xs bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 flex items-center gap-2 transition-colors border border-red-50">
                                <RefreshCw size={14} /> Sync
                            </button>
                            <button onClick={() => addRecord(setLabourPlanning, { towerId: towers[0]?.id || 'Overall', date: '', labourName: '', type: '', plannedCount: '' })} className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2 transition-colors">
                                <Plus size={14} /> Add Row
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                        <div className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-3 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-4 mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-50">
                            <div>Tower</div>
                            <div>Date</div>
                            <div>Labour Name</div>
                            <div>Trade / Type</div>
                            <div>Qty</div>
                            <div></div>
                        </div>

                        <div className="space-y-2">
                            {labourPlanning.map(plan => (
                                <div key={plan.id} className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr_0.8fr_auto] gap-3 items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-50 hover:border-red-100 hover:bg-red-50/30 transition-all group">
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                        <select
                                            value={plan.towerId}
                                            onChange={(e) => updateRecord(setLabourPlanning, plan.id, 'towerId', e.target.value === 'Overall' || e.target.value === 'NTA_PODIUM' ? e.target.value : Number(e.target.value))}
                                            className="w-full px-2 py-2 text-[10px] font-bold text-gray-700 outline-none bg-transparent"
                                        >
                                            <option value="Overall">Overall</option>
                                            <option value="NTA_PODIUM">NTA/PODIUM</option>
                                            {towers.map(t => <option key={t.id} value={t.id}>{t.name || 'Unnamed'}</option>)}
                                        </select>
                                    </div>

                                    <div className="w-full">
                                        <input
                                            type="date"
                                            value={plan.date || ''}
                                            onChange={(e) => updateRecord(setLabourPlanning, plan.id, 'date', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-red-400 outline-none text-[10px] font-bold text-blue-600"
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        value={plan.labourName || ''}
                                        onChange={(e) => updateRecord(setLabourPlanning, plan.id, 'labourName', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-red-400 outline-none text-xs font-medium"
                                        placeholder="Name/Agency..."
                                    />

                                    <input
                                        type="text"
                                        value={plan.type || ''}
                                        onChange={(e) => updateRecord(setLabourPlanning, plan.id, 'type', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-red-400 outline-none text-xs font-medium"
                                        placeholder="Trade..."
                                    />

                                    <input
                                        type="number"
                                        value={plan.plannedCount || ''}
                                        onChange={(e) => updateRecord(setLabourPlanning, plan.id, 'plannedCount', e.target.value)}
                                        className="w-full px-2 py-2 bg-white border border-gray-200 rounded-xl focus:border-red-400 outline-none text-xs font-bold text-center"
                                        placeholder="0"
                                    />

                                    <button
                                        onClick={() => removeRecord(setLabourPlanning, plan.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Monthly Schedule */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                <Clock className="text-purple-500" />
                                Monthly Schedule Setting
                            </h2>
                            <p className="text-xs text-gray-500 font-medium ml-9">Structure daily targets for each tower across the schedule duration.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => addRecord(setMonthlySchedules, { towerId: towers[0]?.id || 0, floor: '', customFloor: '', date: '', purpose: '' })} className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2 transition-colors">
                                <Plus size={14} /> Add Row
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                        <div className="grid grid-cols-[1.2fr_1.5fr_1.2fr_2fr_auto] gap-3 font-bold text-[10px] text-gray-400 uppercase tracking-wider px-4 mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-50">
                            <div>Tower</div>
                            <div>Floor Level</div>
                            <div>Date Target</div>
                            <div>Purpose / Activity</div>
                            <div></div>
                        </div>

                        <div className="space-y-2">
                            {monthlySchedules.map(sched => (
                                <div key={sched.id} className="grid grid-cols-[1.2fr_1.5fr_1.2fr_2fr_auto] gap-3 items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-50 hover:border-purple-100 hover:bg-purple-50/30 transition-all group">
                                    <div className="font-bold text-xs text-gray-700 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                                        {towers.find(t => t.id === Number(sched.towerId))?.name || 'T-?'}
                                    </div>

                                    <div className="flex flex-col gap-1 relative w-full">
                                        <select
                                            value={sched.floor}
                                            onChange={(e) => updateRecord(setMonthlySchedules, sched.id, 'floor', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-purple-400 outline-none text-xs font-bold"
                                        >
                                            <option value="">Floor...</option>
                                            <option value="Foundation">Foundation</option>
                                            <option value="NTA">NTA</option>
                                            <option value="PCC">PCC</option>
                                            <option value="COLUMN">COLUMN</option>
                                            {Array.from({ length: Number(towers.find(t => t.id === Number(sched.towerId))?.basements) || 0 }).map((_, i) => (
                                                <option key={`B${i + 1}`} value={`Basement ${i + 1}`}>Basement {i + 1}</option>
                                            ))}
                                            {towers.find(t => t.id === Number(sched.towerId))?.plinth === 'Included' && (
                                                <option value="Plinth">Plinth</option>
                                            )}
                                            {Array.from({ length: Number(towers.find(t => t.id === Number(sched.towerId))?.floors) || 0 }).map((_, i) => (
                                                <option key={`F${i + 1}`} value={`Floor ${i + 1}`}>Floor {i + 1}</option>
                                            ))}
                                            <option value="Other">Custom...</option>
                                        </select>
                                        {sched.floor === 'Other' && (
                                            <input
                                                type="text"
                                                value={sched.customFloor || ''}
                                                onChange={(e) => updateRecord(setMonthlySchedules, sched.id, 'customFloor', e.target.value)}
                                                placeholder="..."
                                                className="w-full px-3 py-1 bg-white border border-purple-200 rounded-lg focus:border-purple-400 outline-none text-[10px] font-medium"
                                            />
                                        )}
                                    </div>

                                    <div className="w-full">
                                        <input
                                            type="date"
                                            value={sched.date}
                                            onChange={(e) => updateRecord(setMonthlySchedules, sched.id, 'date', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-purple-400 outline-none text-[10px] font-bold text-blue-600"
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        value={sched.purpose}
                                        onChange={(e) => updateRecord(setMonthlySchedules, sched.id, 'purpose', e.target.value)}
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-purple-400 outline-none text-xs font-medium"
                                        placeholder="Activity details..."
                                    />

                                    <button
                                        onClick={() => removeRecord(setMonthlySchedules, sched.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Equipments */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <Wrench className="text-gray-700" />
                            Equipments Tracker
                        </h2>
                        <button onClick={() => addRecord(setEquipments, { name: '', required: '', available: '' })} className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2">
                            <Plus size={16} /> Add Equipment
                        </button>
                    </div>
                    <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 font-bold text-sm text-gray-400 uppercase tracking-wider px-2">
                        <div>Equipment Name</div>
                        <div>Required Qty</div>
                        <div>Available Qty</div>
                        <div></div>
                    </div>
                    {equipments.map(eq => (
                        <div key={eq.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center">
                            <div className="relative">
                                {eq.name === 'Other (Add New)' ? (
                                    <input
                                        type="text" autoFocus placeholder="Enter custom equipment name"
                                        onChange={(e) => updateRecord(setEquipments, eq.id, 'name', e.target.value)}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" />
                                ) : (
                                    <select
                                        value={eq.name} onChange={(e) => updateRecord(setEquipments, eq.id, 'name', e.target.value)}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium"
                                    >
                                        <option value="">Select Equipment...</option>
                                        {equipmentList.map(item => <option key={item} value={item}>{item}</option>)}
                                        {eq.name && !equipmentList.includes(eq.name) && <option value={eq.name}>{eq.name}</option>}
                                    </select>
                                )}
                            </div>
                            <input
                                type="number" value={eq.required} onChange={(e) => updateRecord(setEquipments, eq.id, 'required', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" placeholder="Qty" />
                            <input
                                type="number" value={eq.available} onChange={(e) => updateRecord(setEquipments, eq.id, 'available', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" placeholder="Qty" />
                            <button onClick={() => removeRecord(setEquipments, eq.id)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 5. Safety/Quality Observations */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <ShieldCheck className="text-green-500" />
                            Safety / Quality Observations & NC
                        </h2>
                        <button onClick={() => addRecord(setObservations, { towerId: towers[0]?.id || 0, type: 'Safety', description: '' })} className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2">
                            <Plus size={16} /> Add Observation
                        </button>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_3fr_auto] gap-4 font-bold text-sm text-gray-400 uppercase tracking-wider px-2">
                        <div>Tower</div>
                        <div>Type</div>
                        <div>Description</div>
                        <div></div>
                    </div>
                    {observations.map(obs => (
                        <div key={obs.id} className="grid grid-cols-[1fr_1fr_3fr_auto] gap-4 items-start">
                            <select
                                value={obs.towerId} onChange={(e) => updateRecord(setObservations, obs.id, 'towerId', Number(e.target.value))}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium"
                            >
                                {towers.map(t => <option key={t.id} value={t.id}>{t.name || 'Unnamed Tower'}</option>)}
                            </select>
                            <select
                                value={obs.type} onChange={(e) => updateRecord(setObservations, obs.id, 'type', e.target.value)}
                                className={`w-full p-4 border  rounded-2xl outline-none font-bold ${obs.type === 'Safety' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    obs.type === 'Quality' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'
                                    }`}
                            >
                                {observationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <textarea
                                value={obs.description} onChange={(e) => updateRecord(setObservations, obs.id, 'description', e.target.value)}
                                rows={2}
                                placeholder="Describe observation..."
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium resize-none shadow-inner"
                            />
                            <button onClick={() => removeRecord(setObservations, obs.id)} className="p-4 mt-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 6. Priority Pending Material */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <PackageOpen className="text-indigo-500" />
                            Priority Pending Materials
                        </h2>
                        <button onClick={() => addRecord(setMaterials, { name: '', quantity: '', requiredDate: '' })} className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 flex items-center gap-2">
                            <Plus size={16} /> Add Material
                        </button>
                    </div>
                    <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 font-bold text-sm text-gray-400 uppercase tracking-wider px-2">
                        <div>Material Name</div>
                        <div>Quantity Required</div>
                        <div>Required Date</div>
                        <div></div>
                    </div>
                    {materials.map(mat => (
                        <div key={mat.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center">
                            <input
                                type="text" value={mat.name} onChange={(e) => updateRecord(setMaterials, mat.id, 'name', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" placeholder="E.g. Cement 53 Grade" />
                            <input
                                type="text" value={mat.quantity} onChange={(e) => updateRecord(setMaterials, mat.id, 'quantity', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium" placeholder="Quantity with unit" />
                            <input
                                type="date" value={mat.requiredDate} onChange={(e) => updateRecord(setMaterials, mat.id, 'requiredDate', e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-black outline-none font-medium text-gray-600" />
                            <button onClick={() => removeRecord(setMaterials, mat.id)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 7. Other Issues */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <AlertCircle className="text-red-500" />
                            Other Issues / Comments
                        </h2>
                    </div>
                    <textarea
                        value={otherIssues}
                        onChange={(e) => setOtherIssues(e.target.value)}
                        rows={4}
                        placeholder="Document any other issues affecting the schedule..."
                        className="w-full p-6 bg-gray-50 border border-gray-100 rounded-3xl focus:border-black outline-none font-medium resize-y"
                    />
                </div>
            </fieldset>

            {/* 8. Execution Log (Timeline of Daily Forms) */}
            {
                !isEditMode && scheduleId && scheduleValidFrom && scheduleValidTill && (
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8 mb-32">
                        <div className="border-b border-gray-50 pb-4">
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                <Clock className="text-green-600" size={28} />
                                Site Execution Log (Daily Update Tree)
                            </h2>
                            <p className="text-gray-500 font-medium ml-10 mt-1">A form is automatically ready for every day of your {getValidityDuration()}-day schedule.</p>
                        </div>

                        <div className="space-y-3">
                            {Array.from({ length: getValidityDuration() }).map((_, i) => {
                                const date = new Date(scheduleValidFrom);
                                date.setDate(date.getDate() + i);
                                const dateStr = date.toISOString().split('T')[0];
                                const isToday = dateStr === new Date().toISOString().split('T')[0];
                                const past = date < new Date(new Date().setHours(0, 0, 0, 0));

                                return (
                                    <div key={dateStr} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${isToday ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/30 border-gray-50 hover:border-gray-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${isToday ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                    {new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                    {isToday && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Today</span>}
                                                </h3>
                                                <p className="text-xs text-gray-400 font-medium">Daily Execution Form - Project {siteData?.name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="hidden md:flex flex-col items-end">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Status</span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                                    Not Filled
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => router.push(`/employee/dps/daily-update?siteId=${siteId}&date=${dateStr}`)}
                                                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
                                            >
                                                View/Record Actuals
                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            }

            {/* Action Bar Dropdown */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4">
                    <p className="font-medium text-gray-500 flex items-center gap-2"><FileText size={18} /> {isEditMode ? 'Schedule Draft' : 'Saved Schedule Document'}</p>
                    <div className="flex gap-4">
                        {!isEditMode ? (
                            <>
                                {isExpired() ? (
                                    <button onClick={handleCreateNew} className="px-10 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors shadow-xl">
                                        Renew/Create New Schedule
                                    </button>
                                ) : (
                                    <button onClick={() => setIsEditMode(true)} className="px-10 py-4 bg-gray-100 text-gray-900 font-bold rounded-2xl hover:bg-gray-200 transition-colors shadow-sm">
                                        Edit Schedule
                                    </button>
                                )}
                                <button onClick={handleExport} className="px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-xl">
                                    Generate Excel
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleBack} className="px-8 py-4 bg-gray-100 text-gray-900 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
                                    Discard
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="px-10 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors shadow-xl disabled:bg-gray-400">
                                    {isSaving ? 'Saving...' : 'Save Schedule'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

        </div >
    );
}
