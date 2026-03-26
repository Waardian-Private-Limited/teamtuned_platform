"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { ClipboardList, Calendar, Building, PackageOpen, Wrench, ShieldCheck, Save, ArrowLeft, RefreshCw, FileText, Plus, Trash2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

interface DpsDailyUpdateProps {
    basePath: string; // e.g., "/org-admin/dps" or "/employee/dps"
}

function DailyUpdateContent({ basePath }: DpsDailyUpdateProps) {
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
    const [showAllTargets, setShowAllTargets] = useState(false);

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
                const initialStaff = (s.staff_planning || []).map((sp: any) => ({
                    ...sp,
                    actualCount: '',
                    required_wo: sp.required_wo ?? sp.plannedCount ?? 0
                }));

                // Filter Labour and Monthly by the selected updateDate
                const initialLabour = (s.labour_planning || [])
                    .filter((lp: any) => !lp.date || lp.date === updateDate)
                    .map((lp: any) => ({ ...lp, actualCount: '' }));

                const initialMonthly = (s.monthly_schedules || [])
                    .map((ms: any) => ({ ...ms, achieved_date: ms.achieved_date || '' }));

                const initialEquip = (s.equipments || [])
                    .filter((eq: any) => !eq.date || eq.date === updateDate)
                    .map((eq: any) => ({ ...eq, plannedCount: eq.plannedCount || eq.required || 0, actualCount: '', breakdown: '' }));
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
            a.download = `DPR_Daily_Report_${selectedSiteId}_${updateDate}.xlsx`;
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
            <p>You have not been assigned to any Site DPR Schedules.</p>
        </div>
    );

    const isOverall = schedule?.scope === 'Overall' ||
        (Array.isArray(schedule?.concrete_planning)
            ? schedule?.concrete_planning.some((p: any) => p.scope === 'Overall')
            : schedule?.concrete_planning?.scope === 'Overall');
    const showVarianceCol = schedule && !schedule.is_monthly && schedule.scope !== 'site' && !isOverall;

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-10 pb-32">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <ClipboardList className="text-blue-600" size={40} />
                        DPR Daily Progress Update
                    </h1>
                    <p className="text-gray-500 text-lg font-medium">Record what was actually achieved today compared to the master schedule.</p>
                </div>
            </div>

            <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.04)] flex flex-col md:flex-row gap-10 items-center transition-all">
                <div className="flex-1 w-full space-y-3">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-2">Assigned Site / Project Name</label>
                    <div className="relative">
                        <Building size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            className="w-full pl-14 pr-4 py-5 bg-gray-50 border border-gray-100 font-bold rounded-2xl appearance-none outline-none focus:border-black focus:bg-white transition-all text-sm"
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
                <div className="flex-1 w-full space-y-3">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-2">Reporting / Update Date</label>
                    <div className="relative">
                        <Calendar size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={updateDate}
                            onChange={(e) => setUpdateDate(e.target.value)}
                            className="w-full pl-14 pr-4 py-5 font-bold bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-black focus:bg-white transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center font-bold text-gray-400">Loading daily structure...</div>
            ) : schedule ? (
                <div className="space-y-8">
                    {/* Concrete */}
                    <div className="bg-white overflow-hidden rounded border border-gray-200 shadow-sm">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h2 className="text-sm font-black text-[#111827] uppercase tracking-widest">Concrete Progress</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-gray-50/50">
                                        <th className="py-3 px-6 border-b border-gray-100">Location / Description</th>
                                        <th className="py-3 px-6 border-b border-gray-100 text-center">Planned Qty</th>
                                        <th className="py-2.5 px-4 border-b border-gray-100 text-center text-[10px] uppercase font-bold text-[#111827]">Actual Achieved</th>
                                        {showVarianceCol && <th className="py-2.5 px-4 border-b border-gray-100 text-center text-[10px] uppercase font-bold text-[#111827]">Variance</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {concreteAchieved.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="py-2.5 px-4 font-bold text-gray-800 text-sm">Concrete Pouring</td>
                                            <td className="py-2.5 px-4 text-center font-black text-gray-900 text-xs">{item.concretePlanned || 0}</td>
                                            <td className="py-2.5 px-4 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                    value={item.concreteAchieved}
                                                    onChange={(e) => updateArrayField(setConcreteAchieved, concreteAchieved, item.id, 'concreteAchieved', Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="w-16 p-1.5 bg-white border border-gray-200 rounded font-black text-gray-900 outline-none text-center focus:border-blue-500 text-xs"
                                                    placeholder="0"
                                                />
                                            </td>
                                            {showVarianceCol && (
                                                <td className={`py-2.5 px-4 text-center font-black text-sm ${((item.concreteAchieved || 0) - (item.concretePlanned || 0)) < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                                                    {((item.concreteAchieved || 0) - (item.concretePlanned || 0)) > 0 ? '+' : ''}
                                                    {(item.concreteAchieved || 0) - (item.concretePlanned || 0)}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Manpower */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
                            <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#F3F4F6] flex justify-between items-center">
                                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest">Staff Deployment</h3>
                                <button
                                    onClick={() => {
                                        const newRow = {
                                            id: Date.now(),
                                            designation: '',
                                            plannedCount: 0,
                                            actualCount: 0,
                                            required_wo: 0,
                                            status: '',
                                            remark: '',
                                            towerId: 'Overall',
                                            is_manual: true
                                        };
                                        setStaffActual([...staffActual, newRow]);
                                    }}
                                    className="p-1 px-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                                >
                                    <Plus size={14} />
                                    Add Row
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-[#111827] uppercase tracking-widest bg-[#F9FAFB]/50">
                                            <th className="py-2.5 px-4 border-b border-[#F3F4F6]">DESIGNATION</th>
                                            <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center">PLANNED</th>
                                            <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center">QTY (ACTUAL)</th>
                                            {!schedule?.is_monthly && <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center text-[#10B981] text-[9px]">VARIANCE (PLANNED VS ACTUAL)</th>}
                                            <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center">REQUIRED (WO)</th>
                                            {!schedule?.is_monthly && <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center text-[#2563EB] text-[9px]">VARIANCE (PLANNED VS REQUIRED)</th>}
                                            <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F4F6]">
                                        {staffActual.map((item) => (
                                            <tr key={item.id} className="hover:bg-[#F9FAFB]/30 transition-colors">
                                                <td className="py-2.5 px-4 font-medium text-[#374151] text-sm">
                                                    {item.is_manual ? (
                                                        <input
                                                            type="text"
                                                            value={item.designation || ''}
                                                            onChange={e => updateArrayField(setStaffActual, staffActual, item.id, 'designation', e.target.value)}
                                                            placeholder="Designation"
                                                            className="w-full p-1 bg-transparent border-b border-[#D1D5DB] focus:border-[#2563EB] outline-none text-xs"
                                                        />
                                                    ) : (
                                                        item.designation
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-center font-bold text-[#111827] text-sm">{item.plannedCount || 0}</td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.actualCount}
                                                        onChange={e => updateArrayField(setStaffActual, staffActual, item.id, 'actualCount', Math.max(0, parseInt(e.target.value) || 0))}
                                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                        className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded font-bold text-[#111827] outline-none text-center focus:border-[#2563EB] text-sm"
                                                    />
                                                </td>
                                                {!schedule?.is_monthly && (
                                                    <td className={`py-4 px-3 text-center font-bold ${((item.actualCount || 0) - (item.plannedCount || 0)) < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                                                        {((item.actualCount || 0) - (item.plannedCount || 0)) > 0 ? '+' : ''}
                                                        {(item.actualCount || 0) - (item.plannedCount || 0)}
                                                    </td>
                                                )}
                                                <td className="py-2.5 px-4 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.required_wo ?? ''}
                                                        onChange={e => updateArrayField(setStaffActual, staffActual, item.id, 'required_wo', Math.max(0, parseInt(e.target.value) || 0))}
                                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                        className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded font-bold text-[#111827] outline-none text-center focus:border-[#2563EB] text-sm"
                                                    />
                                                </td>
                                                {!schedule?.is_monthly && (
                                                    <td className={`py-4 px-3 text-center font-bold ${((item.required_wo || 0) - (item.plannedCount || 0)) < 0 ? 'text-[#EF4444]' : 'text-[#2563EB]'}`}>
                                                        {((item.required_wo || 0) - (item.plannedCount || 0)) > 0 ? '+' : ''}
                                                        {(item.required_wo || 0) - (item.plannedCount || 0)}
                                                    </td>
                                                )}
                                                <td className="py-2.5 px-4 text-center">
                                                    {item.is_manual && (
                                                        <button
                                                            onClick={() => setStaffActual(staffActual.filter(s => s.id !== item.id))}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-[#F9FAFB]/50 font-bold text-xs">
                                        <tr className="border-t border-[#F3F4F6]">
                                            <td className="py-3 px-4 text-[#111827]">Total</td>
                                            <td className="py-3 px-4 text-center text-[#111827]">
                                                {staffActual.reduce((acc, item) => acc + (parseInt(item.plannedCount) || 0), 0)}
                                            </td>
                                            <td className="py-3 px-4 text-center text-[#2563EB]">
                                                {staffActual.reduce((acc, item) => acc + (parseInt(item.actualCount) || 0), 0)}
                                            </td>
                                            {!schedule?.is_monthly && (
                                                <td className={`py-3 px-4 text-center font-bold ${staffActual.reduce((acc, item) => acc + ((item.actualCount || 0) - (item.plannedCount || 0)), 0) < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                                                    {staffActual.reduce((acc, item) => acc + ((item.actualCount || 0) - (item.plannedCount || 0)), 0) > 0 ? '+' : ''}
                                                    {staffActual.reduce((acc, item) => acc + ((item.actualCount || 0) - (item.plannedCount || 0)), 0)}
                                                </td>
                                            )}
                                            <td className="py-3 px-4 text-center text-[#6B7280]">
                                                {staffActual.reduce((acc, item) => acc + (parseInt(item.required_wo) || 0), 0)}
                                            </td>
                                            {!schedule?.is_monthly && (
                                                <td className={`py-3 px-4 text-center font-bold ${staffActual.reduce((acc, item) => acc + ((item.required_wo || 0) - (item.plannedCount || 0)), 0) < 0 ? 'text-[#EF4444]' : 'text-[#2563EB]'}`}>
                                                    {staffActual.reduce((acc, item) => acc + ((item.required_wo || 0) - (item.plannedCount || 0)), 0) > 0 ? '+' : ''}
                                                    {staffActual.reduce((acc, item) => acc + ((item.required_wo || 0) - (item.plannedCount || 0)), 0)}
                                                </td>
                                            )}
                                            <td className="py-3 px-4"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
                            <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#F3F4F6]">
                                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest">Labour Deployment</h3>
                            </div>
                            <div className="overflow-x-auto">
                                {(() => {
                                    const uniqueTowers = Array.from(new Set(
                                        labourActual
                                            .filter((l: any) => (parseInt(l.plannedCount) || 0) > 0 || (l.actualCount !== undefined && l.actualCount !== null && l.actualCount !== '' && parseInt(l.actualCount.toString()) > 0))
                                            .map((l: any) => l.towerId || 'Overall')
                                    ));
                                    const uniqueTypes = Array.from(new Set(
                                        labourActual
                                            .filter((l: any) => uniqueTowers.includes(l.towerId || 'Overall'))
                                            .filter((l: any) => (parseInt(l.plannedCount) || 0) > 0 || (l.actualCount !== undefined && l.actualCount !== null && l.actualCount !== '' && parseInt(l.actualCount.toString()) > 0))
                                            .map((l: any) => l.type)
                                    )).filter(Boolean);
                                    const showVarianceCol = true; // Assuming we always want variance in this pivot view

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
                                                        <tr key={type} className="hover:bg-[#F9FAFB]/30 transition-colors">
                                                            <td className="py-3 px-4 font-medium text-[#374151] text-sm border-r border-[#F3F4F6] sticky left-0 bg-white z-10 shadow-sm">{type}</td>
                                                            {uniqueTowers.map((tower: any) => {
                                                                const item = labourActual.find((l: any) => l.type === type && (l.towerId || 'Overall') === tower);

                                                                const planned = item?.plannedCount || 0;
                                                                const actual = item?.actualCount ?? '';
                                                                const actualNum = parseInt(actual.toString()) || 0;
                                                                const variance = (item?.actualCount !== undefined && item?.actualCount !== null && item?.actualCount !== '') ? (actualNum - planned) : 0;

                                                                typeTotalPlanned += planned;
                                                                typeTotalActual += actualNum;

                                                                return (
                                                                    <React.Fragment key={`${type}-${tower}`}>
                                                                        <td className="py-2 px-2 text-center text-[#111827] font-bold text-sm border-r border-[#F3F4F6] bg-gray-50/20">{planned || '-'}</td>
                                                                        <td className="py-2 px-2 text-center border-r border-[#F3F4F6]">
                                                                            {item ? (
                                                                                <input
                                                                                    type="number"
                                                                                    value={actual}
                                                                                    onChange={e => updateArrayField(setLabourActual, labourActual, item.id, 'actualCount', Math.max(0, parseInt(e.target.value) || 0))}
                                                                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                                                    className="w-14 p-1 bg-white border border-[#D1D5DB] rounded text-[#111827] outline-none focus:border-[#2563EB] text-center font-bold text-sm"
                                                                                />
                                                                            ) : <span className="text-gray-200">-</span>}
                                                                        </td>
                                                                        <td className={`py-2 px-2 text-center font-bold text-[11px] border-r border-[#F3F4F6] ${(item?.actualCount !== undefined && item?.actualCount !== null && item?.actualCount !== '') ? (variance < 0 ? 'text-[#EF4444]' : 'text-[#10B981]') : 'text-gray-300'}`}>
                                                                            {(item?.actualCount !== undefined && item?.actualCount !== null && item?.actualCount !== '') ? (variance > 0 ? `+${variance}` : variance) : '-'}
                                                                        </td>
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                            <td className="py-3 px-4 text-center font-black text-sm text-[#111827] bg-[#F9FAFB]/50">
                                                                {typeTotalActual} <span className="text-[10px] text-gray-400 font-bold ml-1">/ {typeTotalPlanned}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-[#F9FAFB]/80 font-black text-xs">
                                                <tr className="border-t border-[#F3F4F6]">
                                                    <td className="py-4 px-4 text-[#111827]">Total Manpower</td>
                                                    {uniqueTowers.map((tower: any) => {
                                                        const towerPlanned = labourActual.filter((l: any) => (l.towerId || 'Overall') === tower).reduce((acc: number, l: any) => acc + (parseInt(l.plannedCount) || 0), 0);
                                                        const towerActual = labourActual.filter((l: any) => (l.towerId || 'Overall') === tower).reduce((acc: number, l: any) => acc + (parseInt(l.actualCount) || 0), 0);
                                                        return (
                                                            <React.Fragment key={`${tower}-total`}>
                                                                <td className="py-4 px-2 text-center border-r border-[#F3F4F6]">{towerPlanned}</td>
                                                                <td className="py-4 px-2 text-center border-r border-[#F3F4F6] text-[#2563EB]">{towerActual}</td>
                                                                <td className="py-4 px-2 text-center border-r border-[#F3F4F6] text-[#EF4444]">{towerActual - towerPlanned}</td>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    <td className="py-4 px-4 text-center text-[#111827] bg-[#F3F4F6]">
                                                        {labourActual.reduce((acc: number, l: any) => acc + (parseInt(l.actualCount) || 0), 0)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Target Goals */}
                    <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
                        <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ClipboardList size={18} className="text-[#2563EB]" />
                                <h2 className="text-sm font-bold text-[#111827] uppercase tracking-widest">Schedule Targets</h2>
                            </div>
                            <button
                                onClick={() => setShowAllTargets(!showAllTargets)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${showAllTargets ? 'bg-[#2563EB] text-white' : 'bg-blue-50 text-[#2563EB] hover:bg-blue-100'}`}
                            >
                                {showAllTargets ? 'Showing All Targets' : 'View All Targets'}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest bg-[#F9FAFB]/50">
                                        <th className="py-2.5 px-4 border-b border-[#F3F4F6]">TOWER / FLOOR</th>
                                        <th className="py-2.5 px-4 border-b border-[#F3F4F6]">Purpose</th>
                                        <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center">Target Date</th>
                                        <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center">Achieved Date</th>
                                        <th className="py-2.5 px-4 border-b border-[#F3F4F6]">Comments</th>
                                        <th className="py-2.5 px-4 border-b border-[#F3F4F6] text-center">Bill</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F3F4F6]">
                                    {(showAllTargets ? monthlyAchieved : monthlyAchieved.filter(item => (item.target_date || item.date) === updateDate || item.achieved_date === updateDate)).map((item) => {
                                        const isMissedToday = (item.target_date || item.date) === updateDate && !item.is_achieved;
                                        return (
                                            <React.Fragment key={item.id}>
                                                <tr className="hover:bg-[#F9FAFB]/30 transition-colors">
                                                    <td className="py-2.5 px-4">
                                                        <span className="font-bold flex flex-col text-[#111827]">
                                                            <span className="text-[9px] leading-tight uppercase tracking-tight">{item.towerId}</span>
                                                            <span className="text-sm">Floor {item.floor === 'Other' ? item.customFloor : item.floor}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-[#111827] text-xs font-bold leading-tight">
                                                        {item.purpose}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <input type="date" value={item.achieved_date || ''} onChange={e => updateArrayField(setMonthlyAchieved, monthlyAchieved, item.id, 'achieved_date', e.target.value)} className="p-1.5 bg-white border border-[#D1D5DB] rounded outline-none text-[10px] text-[#111827]" />
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <input
                                                            type="text"
                                                            value={item.comments || ''}
                                                            placeholder="Add remark..."
                                                            onChange={e => updateArrayField(setMonthlyAchieved, monthlyAchieved, item.id, 'comments', e.target.value)}
                                                            className="w-full p-1.5 bg-white border border-[#D1D5DB] rounded outline-none text-[10px] text-[#111827] focus:border-[#2563EB]"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.client_bill_acheived}
                                                            onChange={e => updateArrayField(setMonthlyAchieved, monthlyAchieved, item.id, 'client_bill_acheived', e.target.checked)}
                                                            className="w-3.5 h-3.5 text-[#2563EB] border-[#D1D5DB] rounded focus:ring-[#2563EB]"
                                                        />
                                                    </td>
                                                </tr>
                                                {(isMissedToday || item.missed_reason) && (
                                                    <tr className="bg-red-50/50">
                                                        <td colSpan={6} className="px-5 py-3 border-b border-red-100">
                                                            <div className="flex flex-wrap items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Revised Date:</span>
                                                                    <input
                                                                        type="date"
                                                                        value={item.revised_date || ''}
                                                                        onChange={e => updateArrayField(setMonthlyAchieved, monthlyAchieved, item.id, 'revised_date', e.target.value)}
                                                                        className="p-1.5 text-[10px] border border-red-200 rounded outline-none focus:border-red-400 bg-white"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Provide Reason:</span>
                                                                    <input
                                                                        type="text"
                                                                        value={item.missed_reason || ''}
                                                                        placeholder="e.g. Labor shortage, Material delay..."
                                                                        onChange={e => updateArrayField(setMonthlyAchieved, monthlyAchieved, item.id, 'missed_reason', e.target.value)}
                                                                        className="flex-1 p-1.5 text-[10px] border border-red-200 rounded outline-none focus:border-red-400 placeholder:text-red-300 bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {(showAllTargets ? monthlyAchieved : monthlyAchieved.filter(item => (item.target_date || item.date) === updateDate)).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-10 text-center text-[#111827] font-bold text-sm">
                                                {showAllTargets ? 'No targets found.' : 'No targets scheduled for today.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Equipments Tracker Section */}
                    <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
                        <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Wrench size={18} className="text-[#F59E0B]" />
                                <h2 className="text-sm font-bold text-[#111827] uppercase tracking-widest">Equipments Status</h2>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB] border-y border-[#F3F4F6]">
                                        <th className="py-3 px-4">EQUIPMENT TYPE</th>
                                        <th className="py-3 px-4 text-center">PLANNED</th>
                                        <th className="py-3 px-4 text-center">QTY (ACTUAL)</th>
                                        <th className="py-3 px-4 text-center text-[#EF4444]">VARIANCE</th>
                                        <th className="py-3 px-4 text-center">STATUS</th>
                                        <th className="py-3 px-4 text-center">REMARK</th>
                                        <th className="py-3 px-4 text-center w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F3F4F6]">
                                    {equipmentsActual.map((eq) => {
                                        const isShortage = (parseInt(eq.plannedCount) || 0) > (parseInt(eq.actualCount) || 0);
                                        return (
                                            <tr key={eq.id} className="hover:bg-[#F9FAFB]/30 transition-colors">
                                                <td className="py-2.5 px-4 font-bold text-[#111827] text-sm">{eq.name}</td>
                                                <td className="py-2.5 px-4 text-center font-bold text-[#111827] text-sm">{eq.plannedCount || 0}</td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <input
                                                        type="number"
                                                        value={eq.actualCount}
                                                        onChange={e => updateArrayField(setEquipmentsActual, equipmentsActual, eq.id, 'actualCount', Math.max(0, parseInt(e.target.value) || 0))}
                                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                        className="w-16 p-1.5 bg-white border border-[#D1D5DB] rounded font-bold text-[#111827] outline-none text-center focus:border-[#2563EB] text-sm"
                                                    />
                                                </td>
                                                <td className={`py-2.5 px-4 text-center font-bold text-sm ${((eq.actualCount || 0) - (eq.plannedCount || 0)) < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                                                    {((eq.actualCount || 0) - (eq.plannedCount || 0)) > 0 ? '+' : ''}
                                                    {(eq.actualCount || 0) - (eq.plannedCount || 0)}
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    {isShortage && (
                                                        <select
                                                            value={eq.status || ''}
                                                            onChange={e => updateArrayField(setEquipmentsActual, equipmentsActual, eq.id, 'status', e.target.value)}
                                                            className="w-full p-1 text-[10px] border border-orange-200 rounded outline-none focus:border-orange-400 bg-white font-bold"
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="Breakdown">Breakdown</option>
                                                            <option value="Not Available">Not Available</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    {isShortage && (
                                                        <input
                                                            type="text"
                                                            value={eq.remark || ''}
                                                            placeholder="Optional..."
                                                            onChange={e => updateArrayField(setEquipmentsActual, equipmentsActual, eq.id, 'remark', e.target.value)}
                                                            className="w-full p-1 text-[10px] border border-orange-200 rounded outline-none focus:border-orange-400 placeholder:text-orange-300 bg-white"
                                                        />
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-center text-red-400 hover:text-red-600 transition-colors">
                                                    {eq.is_manual && (
                                                        <button
                                                            onClick={() => setEquipmentsActual(equipmentsActual.filter(s => s.id !== eq.id))}
                                                            className="transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-[#F9FAFB]/50 font-bold text-xs">
                                    <tr className="border-t border-[#F3F4F6]">
                                        <td className="py-3 px-4 text-[#111827]">Total</td>
                                        <td className="py-3 px-4 text-center text-[#111827]">
                                            {equipmentsActual.reduce((acc, eq) => acc + (parseInt(eq.plannedCount) || 0), 0)}
                                        </td>
                                        <td className="py-3 px-4 text-center text-[#2563EB]">
                                            {equipmentsActual.reduce((acc, eq) => acc + (parseInt(eq.actualCount) || 0), 0)}
                                        </td>
                                        {showVarianceCol && <td className={`py-3 px-4 text-center ${equipmentsActual.reduce((acc, eq) => acc + ((eq.actualCount || 0) - (eq.plannedCount || 0)), 0) < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                                            {equipmentsActual.reduce((acc, eq) => acc + ((eq.actualCount || 0) - (eq.plannedCount || 0)), 0) > 0 ? '+' : ''}
                                            {equipmentsActual.reduce((acc, eq) => acc + ((eq.actualCount || 0) - (eq.plannedCount || 0)), 0)}
                                        </td>}
                                        <td className="py-3 px-4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                            {equipmentsActual.length === 0 && (
                                <div className="p-10 text-center text-[#111827] font-bold text-sm">No equipment planned for this date.</div>
                            )}
                        </div>
                    </div>

                    {/* Material Procurement Tracking */}
                    <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
                        <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#F3F4F6] flex items-center gap-3">
                            <PackageOpen size={18} className="text-[#6366F1]" />
                            <h2 className="text-sm font-black text-[#111827] uppercase tracking-widest">Priority Material Tracking</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[11px] font-black text-[#111827] uppercase tracking-widest bg-[#F9FAFB]/50">
                                        <th className="py-3 px-6 border-b border-[#F3F4F6]">Material Name</th>
                                        <th className="py-3 px-6 border-b border-[#F3F4F6]">Requirement</th>
                                        <th className="py-3 px-6 border-b border-[#F3F4F6] text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F3F4F6]">
                                    {materialsStatus.map((mat) => (
                                        <tr key={mat.id} className="hover:bg-[#F9FAFB]/30 transition-colors">
                                            <td className="py-2.5 px-4 font-bold text-[#111827] text-sm">{mat.name}</td>
                                            <td className="py-2.5 px-4 text-[11px] font-medium text-[#111827]">Qty: {mat.quantity} | Needed by: {mat.requiredDate}</td>
                                            <td className="py-2.5 px-4 text-center">
                                                <select
                                                    value={mat.status} onChange={e => updateArrayField(setMaterialsStatus, materialsStatus, mat.id, 'status', e.target.value)}
                                                    className={`p-1.5 border rounded font-bold text-[10px] outline-none ${mat.status === 'Pending' ? 'bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]' : 'bg-[#F0FDF4] text-[#10B981] border-[#DCFCE7]'}`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Procured">Procured</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {materialsStatus.length === 0 && (
                                <div className="p-10 text-center text-[#111827] font-bold text-sm">No priority materials tracked for today.</div>
                            )}
                        </div>
                    </div>

                    {/* Action Bar Dropdown */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F3F4F6] py-3.5 px-6 flex justify-end gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-50">
                        <div className="max-w-6xl mx-auto w-full flex justify-between items-center px-4">
                            <button onClick={() => router.back()} className="px-5 py-2 bg-[#F3F4F6] text-[#6B7280] font-bold rounded-lg hover:bg-[#E5E7EB] transition-colors flex items-center gap-2 border border-[#E5E7EB] text-xs">
                                <ArrowLeft size={14} /> Back
                            </button>
                            <div className="flex gap-3">
                                <button onClick={handleExportExcel} className="px-5 py-2 bg-white text-[#4B5563] font-bold rounded-lg hover:bg-[#F9FAFB] border border-[#E5E7EB] transition-colors flex items-center gap-2 text-xs">
                                    <FileText size={14} /> Export Day Excel
                                </button>
                                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[#2563EB] text-white font-bold rounded-lg hover:bg-[#1D4ED8] transition-all shadow-md shadow-blue-100 flex items-center gap-2 disabled:bg-gray-400 text-xs text-nowrap">
                                    <Save size={14} /> {saving ? 'Saving...' : 'Save Updates'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null
            }
        </div >
    );
}

export default function DpsDailyUpdate(props: DpsDailyUpdateProps) {
    return (
        <Suspense fallback={<div className="p-20 text-center font-bold text-gray-400">Loading update system...</div>}>
            <DailyUpdateContent {...props} />
        </Suspense>
    );
}
