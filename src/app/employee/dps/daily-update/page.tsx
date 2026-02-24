"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { ClipboardList, Calendar, Building, PackageOpen, Wrench, ShieldCheck, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function DailyUpdateContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
    const [updateDate, setUpdateDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Scheduled (Planned) Data
    const [schedule, setSchedule] = useState<any>(null);

    // Actual Update Data States
    const [concreteAchieved, setConcreteAchieved] = useState<any[]>([]);
    const [staffActual, setStaffActual] = useState<any[]>([]);
    const [labourActual, setLabourActual] = useState<any[]>([]);
    const [monthlyAchieved, setMonthlyAchieved] = useState<any[]>([]);
    const [equipmentsActual, setEquipmentsActual] = useState<any[]>([]);
    const [materialsStatus, setMaterialsStatus] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAssignments();

        const qSiteId = searchParams.get('siteId');
        const qDate = searchParams.get('date');
        if (qSiteId) setSelectedSiteId(Number(qSiteId));
        if (qDate) setUpdateDate(qDate);
    }, [searchParams]);

    const fetchAssignments = async () => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const res = await apiClient<any>('/dps-schedule/employee/assignments', {
                method: 'GET',
                withAuth: true
            });
            if (res?.assignments) {
                setAssignments(res.assignments);
                // Only set default if not already set by URL params
                if (res.assignments.length > 0 && !selectedSiteId) {
                    setSelectedSiteId(res.assignments[0].site_id);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSiteId) {
            loadDailyUpdateData();
        }
    }, [selectedSiteId, updateDate]);

    const loadDailyUpdateData = async () => {
        if (!selectedSiteId) return;
        setLoading(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            // 1. Fetch Planned Schedule
            const schedRes = await apiClient<any>(`/dps-schedule/${selectedSiteId}`, { method: 'GET', withAuth: true });
            if (schedRes?.schedule) {
                const s = schedRes.schedule;
                setSchedule(s);

                // 1. Initialize from Planned (Filtering by date where applicable)
                const initialConcrete = (s.concrete_planning || []).map((cp: any) => ({ ...cp, concreteAchieved: '' }));
                const initialStaff = (s.staff_planning || []).map((sp: any) => ({ ...sp, actualCount: '' }));

                // Filter Labour and Monthly by the selected updateDate
                const initialLabour = (s.labour_planning || [])
                    .filter((lp: any) => !lp.date || lp.date === updateDate)
                    .map((lp: any) => ({ ...lp, actualCount: '' }));

                const initialMonthly = (s.monthly_schedules || [])
                    .filter((ms: any) => !ms.date || ms.date === updateDate)
                    .map((ms: any) => ({ ...ms, achievedDate: '' }));

                const initialEquip = (s.equipments || []).map((eq: any) => ({ ...eq, breakdown: '' }));
                const initialMaterials = (s.materials || []).map((mat: any) => ({ ...mat, status: 'Pending' }));

                // 2. Override with Prior Saved Actuals for this Date (if any)
                try {
                    const dailyRes = await apiClient<any>(`/dps-schedule/${selectedSiteId}/daily?date=${updateDate}`, { method: 'GET', withAuth: true });
                    if (dailyRes?.update) {
                        const d = dailyRes.update;

                        // Merge Helper function: preserves planned rows, overlays saved actuals
                        const merge = (planned: any[], actual: any[]) => {
                            if (!actual || actual.length === 0) return planned;
                            return planned.map(p => {
                                const found = actual.find(a => String(a.id) === String(p.id));
                                return found ? { ...p, ...found } : p;
                            });
                        };

                        setConcreteAchieved(merge(initialConcrete, d.concrete_achieved));
                        setStaffActual(merge(initialStaff, d.staff_actual));
                        setLabourActual(merge(initialLabour, d.labour_actual));
                        setMonthlyAchieved(merge(initialMonthly, d.monthly_achieved));
                        setEquipmentsActual(merge(initialEquip, d.equipments_actual));
                        setMaterialsStatus(merge(initialMaterials, d.materials_status));
                    } else {
                        // Resets to clean planned state if no update exists for this date
                        setConcreteAchieved(initialConcrete);
                        setStaffActual(initialStaff);
                        setLabourActual(initialLabour);
                        setMonthlyAchieved(initialMonthly);
                        setEquipmentsActual(initialEquip);
                        setMaterialsStatus(initialMaterials);
                    }
                } catch (ignore) {
                    // Reset to defaults if fetch fails or 404
                    setConcreteAchieved(initialConcrete);
                    setStaffActual(initialStaff);
                    setLabourActual(initialLabour);
                    setMonthlyAchieved(initialMonthly);
                    setEquipmentsActual(initialEquip);
                    setMaterialsStatus(initialMaterials);
                }
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedSiteId) return;
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const blob = await apiClient<Blob>(`/dps-schedule/${selectedSiteId}/export?date=${updateDate}`, {
                method: 'GET',
                withAuth: true,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DPS_Daily_Report_${selectedSiteId}_${updateDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to export daily report', error);
            alert('Failed to generate Excel report.');
        }
    };

    const handleSave = async () => {
        if (!selectedSiteId) return;
        setSaving(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            await apiClient(`/dps-schedule/${selectedSiteId}/daily`, {
                method: 'POST',
                withAuth: true,
                body: {
                    updateDate,
                    concreteAchieved,
                    staffActual,
                    labourActual,
                    monthlyAchieved,
                    equipmentsActual,
                    materialsStatus
                }
            });
            alert('Daily Target Update saved successfully!');
        } catch (error) {
            alert('Failed to save update.');
        } finally {
            setSaving(false);
        }
    };

    const updateArrayField = (setter: any, array: any[], id: number | string, field: string, value: any) => {
        setter(array.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    if (loading && assignments.length === 0 && !selectedSiteId) return <div className="p-10 text-center font-bold text-gray-400">Loading assignments...</div>;

    if (assignments.length === 0 && !selectedSiteId) return (
        <div className="flex flex-col items-center justify-center p-20 text-gray-400 font-bold text-xl gap-4">
            <ShieldCheck size={48} className="text-gray-200" />
            <p>You have not been assigned to any Site DPS Schedules.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-10 pb-32">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <ClipboardList className="text-blue-600" size={40} />
                        Daily Progress Update
                    </h1>
                    <p className="text-gray-500 text-lg font-medium">Record what was actually achieved today compared to the master schedule.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Assigned Site</label>
                    <div className="relative">
                        <Building size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 font-bold rounded-2xl appearance-none outline-none focus:border-black transition-colors"
                            value={selectedSiteId || ''}
                            onChange={(e) => setSelectedSiteId(Number(e.target.value))}
                        >
                            {assignments.length > 0 ? (
                                assignments.map(a => <option key={a.site_id} value={a.site_id}>{a.site_name}</option>)
                            ) : (
                                <option value={selectedSiteId || ''}>{schedule?.site_name || 'Direct Site Access'}</option>
                            )}
                        </select>
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 pl-2">Update For Date</label>
                    <div className="relative">
                        <Calendar size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={updateDate}
                            onChange={(e) => setUpdateDate(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 font-bold bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-black transition-colors"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center font-bold text-gray-400">Loading daily structure...</div>
            ) : schedule ? (
                <div className="space-y-8">
                    {/* Concrete */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <h2 className="text-lg font-bold">Concrete Progress</h2>
                        {concreteAchieved.map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_1fr_1fr] gap-4 items-center bg-gray-50 p-4 rounded-xl">
                                <span className="font-medium text-gray-600">Planned: <span className="font-bold text-black">{item.concretePlanned || 0}</span></span>
                                <input
                                    type="text" value={item.concreteAchieved}
                                    onChange={(e) => updateArrayField(setConcreteAchieved, concreteAchieved, item.id, 'concreteAchieved', e.target.value)}
                                    className="p-3 border rounded-xl outline-none" placeholder="Actual Achieved"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Manpower */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <h2 className="text-lg font-bold">Manpower Deployments (Actual vs Planned)</h2>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-gray-500 mb-3 text-sm uppercase">Staff Deployment</h3>
                                {staffActual.map((item) => (
                                    <div key={item.id} className="grid grid-cols-[1fr_100px_100px] gap-2 items-center text-sm py-2 border-b border-gray-100 last:border-0">
                                        <span className="font-bold">{item.designation}</span>
                                        <span className="text-gray-400 text-center">Req: {item.plannedCount}</span>
                                        <input type="number" placeholder="Actual" value={item.actualCount} onChange={e => updateArrayField(setStaffActual, staffActual, item.id, 'actualCount', e.target.value)} className="p-2 bg-gray-50 border rounded-lg outline-none text-center" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-500 mb-3 text-sm uppercase">Labour Deployment</h3>
                                {labourActual.map((item) => (
                                    <div key={item.id} className="grid grid-cols-[1fr_100px_100px] gap-2 items-center text-sm py-2 border-b border-gray-100 last:border-0">
                                        <span className="font-bold">{item.type}</span>
                                        <span className="text-gray-400 text-center">Req: {item.plannedCount}</span>
                                        <input type="number" placeholder="Actual" value={item.actualCount} onChange={e => updateArrayField(setLabourActual, labourActual, item.id, 'actualCount', e.target.value)} className="p-2 bg-gray-50 border rounded-lg outline-none text-center" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Target Goals */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <h2 className="text-lg font-bold">Monthly Schedule (Target Dates Achieved)</h2>
                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 font-bold text-xs text-gray-400 uppercase">
                            <div>Floor</div>
                            <div>Purpose</div>
                            <div>Planned Target</div>
                            <div>Actual Attained Date</div>
                        </div>
                        {monthlyAchieved.map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 items-center bg-gray-50 p-3 rounded-xl">
                                <span className="font-bold">{item.floor === 'Other' ? item.customFloor : item.floor}</span>
                                <span className="text-gray-600">{item.purpose}</span>
                                <span className="text-blue-600 font-bold">{item.date}</span>
                                <input type="date" value={item.achievedDate} onChange={e => updateArrayField(setMonthlyAchieved, monthlyAchieved, item.id, 'achievedDate', e.target.value)} className="p-2 bg-white border border-gray-200 rounded-lg outline-none max-w-[200px]" />
                            </div>
                        ))}
                    </div>

                    {/* Material Procurement Tracking */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2"><PackageOpen size={20} className="text-indigo-500" /> Priority Material Tracking</h2>
                        {materialsStatus.map((mat) => (
                            <div key={mat.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <div className="font-bold text-gray-900">{mat.name}</div>
                                    <div className="text-sm font-medium text-gray-500">Qty: {mat.quantity} | Needed by: {mat.requiredDate}</div>
                                </div>
                                <select
                                    value={mat.status} onChange={e => updateArrayField(setMaterialsStatus, materialsStatus, mat.id, 'status', e.target.value)}
                                    className={`p-3 border rounded-xl outline-none font-bold ${mat.status === 'Pending' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Procured">Procured</option>
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Action Bar Dropdown */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
                        <div className="max-w-6xl mx-auto w-full flex justify-between items-center px-4">
                            <button onClick={() => router.back()} className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                                <ArrowLeft size={18} /> Back
                            </button>
                            <div className="flex gap-4">
                                <button onClick={handleExportExcel} className="px-8 py-4 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 border border-gray-100 transition-colors flex items-center gap-2">
                                    <FileText size={18} /> Export Day Excel
                                </button>
                                <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-xl disabled:bg-gray-400">
                                    {saving ? 'Saving...' : 'Save Daily Target Updates'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function EmployeeDpsDailyUpdate() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-bold text-gray-400">Loading update system...</div>}>
            <DailyUpdateContent />
        </Suspense>
    );
}
