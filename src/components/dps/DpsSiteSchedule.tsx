"use client";

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Building, Calendar, Layers, ShieldCheck, Wrench, AlertCircle, Plus, Trash2, Clock, HardHat, PackageOpen, FileText, RefreshCw, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DpsPlanningForm } from './DpsPlanningForm';
import { DpsCbdForm } from './DpsCbdForm';
import toast from 'react-hot-toast';

interface DpsSiteScheduleProps {
    siteId: string | string[];
    /** URL to navigate back to — e.g. "/org-admin/dps/schedule" or "/employee/dps/schedule" */
    backPath: string;
    /** Base path prefix for daily-update links */
    dailyUpdatePath: string;
}

export default function DpsSiteSchedule({ siteId, backPath, dailyUpdatePath }: DpsSiteScheduleProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const unitId = searchParams.get('unitId');
    const scheduleIdParam = searchParams.get('scheduleId');

    const [siteData, setSiteData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(true);
    const [planType, setPlanType] = useState<'planning' | 'cbd'>(
        (searchParams.get('type') as 'planning' | 'cbd') || 'planning'
    );
    const [scheduleId, setScheduleId] = useState<number | null>(null);
    const [scheduleStatus, setScheduleStatus] = useState<string>('active');
    const [scheduleValidFrom, setScheduleValidFrom] = useState('');
    const [scheduleValidTill, setScheduleValidTill] = useState('');
    const [siteConfig, setSiteConfig] = useState<any>(null);
    const [concreteMode, setConcreteMode] = useState<'Date-wise' | 'Monthly'>('Date-wise');
    const [concreteScope, setConcreteScope] = useState<'Tower-wise' | 'Overall'>('Tower-wise');
    const [staffMode, setStaffMode] = useState<'Date-wise' | 'Monthly'>('Date-wise');
    const [staffScope, setStaffScope] = useState<'Tower-wise' | 'Overall'>('Tower-wise');
    const [labourMode, setLabourMode] = useState<'Date-wise' | 'Monthly'>('Date-wise');
    const [labourScope, setLabourScope] = useState<'Tower-wise' | 'Overall'>('Tower-wise');
    const [equipmentMode, setEquipmentMode] = useState<'Date-wise' | 'Monthly'>('Date-wise');
    const [equipmentScope, setEquipmentScope] = useState<'Tower-wise' | 'Overall'>('Tower-wise');

    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    const closeConfirmation = () => setConfirmationModal(prev => ({ ...prev, isOpen: false }));

    // --- State Management ---
    const [towers, setTowers] = useState<any[]>([{ id: 1, name: 'Tower A', startDate: '', endDate: '', duration: '', basements: '', plinth: 'Not Included', floors: '' }]);
    const [concretePlanning, setConcretePlanning] = useState<any[]>([{ id: 1, towerId: 'Overall', concretePlanned: '' }]);
    const [staffPlanning, setStaffPlanning] = useState([{ id: 1, towerId: 'Overall', designation: '', plannedCount: '' }]);
    const [labourPlanning, setLabourPlanning] = useState([{ id: 1, towerId: 'Overall', date: '', labourName: '', type: '', plannedCount: '' }]);
    const [monthlySchedules, setMonthlySchedules] = useState([{ id: 1, towerId: '', floor: '', customFloor: '', target_date: '', achieved_date: '', date: '', purpose: '', is_achieved: false, client_bill_acheived: false }]);
    const [equipments, setEquipments] = useState<any[]>([{ id: 1, towerId: 'Overall', name: '', required: '', available: '' }]);
    const [materials, setMaterials] = useState([{ id: 1, name: '', quantity: '', requiredDate: '' }]);
    const equipmentList = ['Crane', 'Excavator', 'Concrete Mixer', 'Bulldozer', 'Other (Add New)'];

    useEffect(() => {
        if (siteId) fetchSiteData();
    }, [siteId, unitId, searchParams.get('type')]);

    // Sync state with search params if they change
    useEffect(() => {
        const typeInUrl = searchParams.get('type');
        if (typeInUrl && (typeInUrl === 'planning' || typeInUrl === 'cbd')) {
            setPlanType(typeInUrl as 'planning' | 'cbd');
        }
    }, [searchParams]);

    const fetchSiteData = async () => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const [siteRes, configRes] = await Promise.all([
                apiClient<any>(`/sites/${siteId}`, { method: 'GET', withAuth: true }),
                apiClient<any>(`/dps-schedule/${siteId}/config`, { method: 'GET', withAuth: true })
            ]);

            if (siteRes?.site) setSiteData(siteRes.site);
            if (configRes?.config) setSiteConfig(configRes.config);

            // Only fallback to database unit record if type is missing from URL
            if (unitId && !searchParams.get('type')) {
                try {
                    const unitsRes = await apiClient<any>(`/dps-schedule/${siteId}/units`, { method: 'GET', withAuth: true });
                    const currentUnit = unitsRes.units?.find((u: any) => String(u.id) === String(unitId));
                    if (currentUnit?.form_type) {
                        setPlanType(currentUnit.form_type as 'planning' | 'cbd');
                    }
                } catch (e) {
                    console.error('Failed to verify unit form type', e);
                }
            }

            let sched;
            try {
                let url = `/dps-schedule/${siteId}`;
                const qParams = new URLSearchParams();
                if (scheduleIdParam) qParams.append('scheduleId', scheduleIdParam);
                if (unitId) qParams.append('unitId', unitId);
                if (qParams.toString()) url += `?${qParams.toString()}`;

                const schedRes = await apiClient<any>(url, { method: 'GET', withAuth: true });
                if (schedRes?.schedule) {
                    sched = schedRes.schedule;
                    setScheduleId(sched.id);
                    setScheduleStatus(sched.status);
                    const formatDate = (d: any) => {
                        if (!d) return '';
                        try {
                            const date = new Date(d);
                            if (isNaN(date.getTime())) return String(d).split('T')[0].trim();
                            return date.toISOString().split('T')[0];
                        } catch {
                            return String(d).split('T')[0].trim();
                        }
                    };
                    if (sched.schedule_valid_from) setScheduleValidFrom(formatDate(sched.schedule_valid_from));
                    if (sched.schedule_valid_till) setScheduleValidTill(formatDate(sched.schedule_valid_till));
                    if (sched.towers) setTowers(sched.towers);
                    if (sched.concrete_planning) setConcretePlanning(sched.concrete_planning);
                    if (sched.staff_planning) setStaffPlanning(sched.staff_planning);
                    if (sched.labour_planning) setLabourPlanning(sched.labour_planning);
                    if (sched.monthly_schedules) setMonthlySchedules(sched.monthly_schedules);
                    if (sched.equipments) setEquipments(sched.equipments);
                    if (sched.materials) setMaterials(sched.materials);
                    if (sched.concrete_mode) setConcreteMode(sched.concrete_mode);
                    if (sched.concrete_scope) setConcreteScope(sched.concrete_scope);
                    if (sched.staff_mode) setStaffMode(sched.staff_mode);
                    if (sched.staff_scope) setStaffScope(sched.staff_scope);
                    if (sched.labour_mode) setLabourMode(sched.labour_mode);
                    if (sched.labour_scope) setLabourScope(sched.labour_scope);
                    if (sched.equipment_mode) setEquipmentMode(sched.equipment_mode);
                    if (sched.equipment_scope) setEquipmentScope(sched.equipment_scope);
                    setIsEditMode(false);
                }
            } catch {
                console.log('No existing schedule for this site, starting fresh.');
            }

            // If it's a new schedule, we don't need to initialize anything from config anymore
            // since dropdowns use siteConfig directly.
        } catch (error) {
            console.error(error);
        }
    };

    const addRecord = (setter: any, baseItem: any) => setter((prev: any) => [...prev, { ...baseItem, id: Date.now() }]);
    const removeRecord = (setter: any, id: any) => setter((prev: any) => prev.filter((item: any) => item.id !== id));
    const updateRecord = (setter: any, id: any, field: string, value: any) =>
        setter((prev: any) => prev.map((item: any) => item.id === id ? { ...item, [field]: value } : item));

    const handleDateChange = (id: any, field: string, value: string) => {
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
                    unit_id: unitId,
                    scheduleValidFrom,
                    scheduleValidTill,
                    towers,
                    concretePlanning,
                    staffPlanning,
                    labourPlanning,
                    monthlySchedules,
                    equipments,
                    materials,
                    concreteMode,
                    concreteScope,
                    staffMode,
                    staffScope,
                    labourMode,
                    labourScope,
                    equipmentMode,
                    equipmentScope
                }
            });
            if (res) {
                toast.success('DPR Schedule saved successfully!');
                router.push(`${backPath.includes('org-admin') ? '/org-admin/dps/submissions' : '/employee/dps/submissions'}`);
            }
        } catch {
            toast.error('Failed to save schedule.');
        } finally {
            setIsSaving(false);
        }
    };

    const isExpired = () => scheduleValidTill ? new Date(scheduleValidTill) < new Date(new Date().setHours(0, 0, 0, 0)) : false;

    const getValidityDuration = () => {
        if (!scheduleValidFrom || !scheduleValidTill) return 0;
        const diff = Math.ceil((new Date(scheduleValidTill).getTime() - new Date(scheduleValidFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 0;
    };

    const handleCreateNew = () => { setScheduleId(null); setScheduleValidFrom(''); setScheduleValidTill(''); setIsEditMode(true); };

    const handleExport = async () => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const blob = await apiClient<Blob>(`/dps-schedule/${siteId}/export`, { method: 'GET', withAuth: true, responseType: 'blob' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `DPR_Report_${siteData?.name || siteId}.xlsx`;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); document.body.removeChild(a);
        } catch { toast.error('Failed to generate Excel report.'); }
    };

    const handleSyncLabor = async () => {
        if (!siteConfig?.laborTypes || siteConfig.laborTypes.length === 0) {
            toast.error('No labor types defined in site configuration.');
            return;
        }

        try {
            const dateStr = scheduleValidFrom || new Date().toISOString().split('T')[0];
            const newPlanning = siteConfig.laborTypes.map((labor: any) => ({
                id: Date.now() + Math.random(),
                date: labourMode === 'Date-wise' ? dateStr : new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                towerId: 'Overall',
                labourName: '',
                type: labor.name || '',
                plannedCount: ''
            }));

            if (newPlanning.length > 0) {
                setLabourPlanning(prev => {
                    const current = prev.filter(p => p.labourName || p.type || p.plannedCount);
                    return [...current, ...newPlanning];
                });
                toast.success(`Synced ${newPlanning.length} labor trades from config.`);
            }
        } catch (error) {
            console.error('Failed to sync labor', error);
            toast.error('Failed to sync labor from config.');
        }
    };

    const handleGeneratePlanning = () => {
        if (!scheduleValidFrom || !scheduleValidTill) {
            toast.error('Please set schedule validity dates first.');
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: 'Regenerate Planning Records',
            message: `This will regenerate all concrete planning records as ${concreteMode} (${concreteScope}). Any manually entered planning data for this specific schedule will be replaced. Do you want to proceed?`,
            type: 'warning',
            onConfirm: () => {
                const start = new Date(scheduleValidFrom);
                const end = new Date(scheduleValidTill);
                const records: any[] = [];
                let currentId = Date.now();

                if (concreteMode === 'Date-wise') {
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        if (concreteScope === 'Tower-wise') {
                            if (siteConfig?.towers?.length > 0) {
                                siteConfig.towers.forEach((t: any) => {
                                    records.push({ id: currentId++, date: dateStr, towerId: t.name, concretePlanned: '' });
                                });
                            }
                            if (siteConfig?.areas?.length > 0) {
                                siteConfig.areas.forEach((a: any) => {
                                    records.push({ id: currentId++, date: dateStr, towerId: a.name, concretePlanned: '' });
                                });
                            }
                            if (!siteConfig?.towers?.length && !siteConfig?.areas?.length) {
                                records.push({ id: currentId++, date: dateStr, towerId: 'Overall', concretePlanned: '' });
                            }
                        } else {
                            records.push({ id: currentId++, date: dateStr, towerId: 'Overall', concretePlanned: '' });
                        }
                    }
                } else {
                    // Monthly
                    let d = new Date(start);
                    while (d <= end) {
                        const monthStr = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                        if (concreteScope === 'Tower-wise') {
                            if (siteConfig?.towers?.length > 0) {
                                siteConfig.towers.forEach((t: any) => {
                                    records.push({ id: currentId++, date: monthStr, towerId: t.name, concretePlanned: '' });
                                });
                            }
                            if (siteConfig?.areas?.length > 0) {
                                siteConfig.areas.forEach((a: any) => {
                                    records.push({ id: currentId++, date: monthStr, towerId: a.name, concretePlanned: '' });
                                });
                            }
                            if (!siteConfig?.towers?.length && !siteConfig?.areas?.length) {
                                records.push({ id: currentId++, date: monthStr, towerId: 'Overall', concretePlanned: '' });
                            }
                        } else {
                            records.push({ id: currentId++, date: monthStr, towerId: 'Overall', concretePlanned: '' });
                        }
                        d.setMonth(d.getMonth() + 1);
                    }
                }
                setConcretePlanning(records);
                closeConfirmation();
            }
        });
    };
    const handleGenerateStaffPlanning = () => {
        if (!scheduleValidFrom || !scheduleValidTill) {
            toast.error('Please set schedule validity dates first.');
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: 'Regenerate Staff Records',
            message: `This will regenerate all staff planning records as ${staffMode} (${staffScope}) from the Master Staff List. Existing data will be replaced. Do you want to proceed?`,
            type: 'warning',
            onConfirm: () => {
                const start = new Date(scheduleValidFrom);
                const end = new Date(scheduleValidTill);
                const records: any[] = [];
                let currentId = Date.now();

                const roles = siteConfig?.staffList && siteConfig.staffList.length > 0
                    ? siteConfig.staffList
                    : [{ name: '', required: '1' }];

                const addStaffRows = (dateOrMonth: string) => {
                    const scopes = staffScope === 'Tower-wise'
                        ? [...(siteConfig?.towers || []), ...(siteConfig?.areas || [])]
                        : [{ name: 'Overall' }];

                    if (scopes.length === 0) scopes.push({ name: 'Overall' });

                    scopes.forEach((s: any) => {
                        roles.forEach((role: any) => {
                            records.push({
                                id: currentId++,
                                date: dateOrMonth,
                                towerId: s.name || 'Overall',
                                designation: role.name || '',
                                plannedCount: role.required || '1'
                            });
                        });
                    });
                };

                if (staffMode === 'Date-wise') {
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        addStaffRows(d.toISOString().split('T')[0]);
                    }
                } else {
                    let d = new Date(start);
                    while (d <= end) {
                        addStaffRows(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
                        d.setMonth(d.getMonth() + 1);
                    }
                }
                setStaffPlanning(records);
                closeConfirmation();
            }
        });
    };

    const handleGenerateLabourPlanning = () => {
        if (!scheduleValidFrom || !scheduleValidTill) {
            toast.error('Please set schedule validity dates first.');
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: 'Regenerate Labour Records',
            message: `This will regenerate all labour planning records as ${labourMode} (${labourScope}) from the Labor Types config. Existing data will be replaced. Do you want to proceed?`,
            type: 'warning',
            onConfirm: () => {
                const start = new Date(scheduleValidFrom);
                const end = new Date(scheduleValidTill);
                const records: any[] = [];
                let currentId = Date.now();

                const types = siteConfig?.laborTypes && siteConfig.laborTypes.length > 0
                    ? siteConfig.laborTypes
                    : [{ name: '' }];

                const addLabourRows = (dateOrMonth: string) => {
                    const scopes = labourScope === 'Tower-wise'
                        ? [...(siteConfig?.towers || []), ...(siteConfig?.areas || [])]
                        : [{ name: 'Overall' }];

                    if (scopes.length === 0) scopes.push({ name: 'Overall' });

                    scopes.forEach((s: any) => {
                        types.forEach((type: any) => {
                            records.push({
                                id: currentId++,
                                date: dateOrMonth,
                                towerId: s.name || 'Overall',
                                labourName: '',
                                type: type.name || '',
                                plannedCount: ''
                            });
                        });
                    });
                };

                if (labourMode === 'Date-wise') {
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        addLabourRows(d.toISOString().split('T')[0]);
                    }
                } else {
                    let d = new Date(start);
                    while (d <= end) {
                        addLabourRows(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
                        d.setMonth(d.getMonth() + 1);
                    }
                }
                setLabourPlanning(records);
                closeConfirmation();
            }
        });
    };

    const handleSyncStaff = async () => {
        if (!siteConfig?.staffList || siteConfig.staffList.length === 0) {
            toast.error('No staff roles defined in site configuration.');
            return;
        }

        try {
            const dateStr = scheduleValidFrom || new Date().toISOString().split('T')[0];
            const newPlanning = siteConfig.staffList.map((staff: any) => ({
                id: Date.now() + Math.random(),
                date: staffMode === 'Date-wise' ? dateStr : new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                towerId: 'Overall',
                designation: staff.name || '',
                plannedCount: staff.required || '1'
            }));

            if (newPlanning.length > 0) {
                setStaffPlanning(prev => {
                    const current = prev.filter(p => p.designation || p.plannedCount);
                    return [...current, ...newPlanning];
                });
                toast.success(`Synced ${newPlanning.length} staff roles from config.`);
            }
        } catch (error) {
            console.error('Failed to sync staff', error);
            toast.error('Failed to sync staff from config.');
        }
    };

    const handleGenerateEquipmentPlanning = () => {
        if (!scheduleValidFrom || !scheduleValidTill) {
            toast.error('Please set schedule validity dates first.');
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: 'Regenerate Equipment Records',
            message: `This will regenerate all equipment planning records as ${equipmentMode} (${equipmentScope}) from the site configuration. Existing data will be replaced. Do you want to proceed?`,
            type: 'warning',
            onConfirm: () => {
                const start = new Date(scheduleValidFrom);
                const end = new Date(scheduleValidTill);
                const records: any[] = [];
                let currentId = Date.now();

                const equipTypes = siteConfig?.equipments && siteConfig.equipments.length > 0
                    ? siteConfig.equipments
                    : [{ name: '' }];

                const addEquipRows = (dateOrMonth: string) => {
                    const scopes = equipmentScope === 'Tower-wise'
                        ? [...(siteConfig?.towers || []), ...(siteConfig?.areas || [])]
                        : [{ name: 'Overall' }];

                    if (scopes.length === 0) scopes.push({ name: 'Overall' });

                    scopes.forEach((s: any) => {
                        equipTypes.forEach((eq: any) => {
                            records.push({
                                id: currentId++,
                                date: dateOrMonth,
                                towerId: s.name || 'Overall',
                                name: eq.name || '',
                                required: '',
                                available: ''
                            });
                        });
                    });
                };

                if (equipmentMode === 'Date-wise') {
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        addEquipRows(d.toISOString().split('T')[0]);
                    }
                } else {
                    let d = new Date(start);
                    while (d <= end) {
                        addEquipRows(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
                        d.setMonth(d.getMonth() + 1);
                    }
                }
                setEquipments(records);
                closeConfirmation();
            }
        });
    };

    const handleSyncEquipment = async () => {
        if (!siteConfig?.equipments || siteConfig.equipments.length === 0) {
            toast.error('No equipment defined in site configuration.');
            return;
        }

        try {
            const dateStr = scheduleValidFrom || new Date().toISOString().split('T')[0];
            const newPlanning = siteConfig.equipments.map((eq: any) => ({
                id: Date.now() + Math.random(),
                date: equipmentMode === 'Date-wise' ? dateStr : new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                towerId: 'Overall',
                name: eq.name || '',
                required: '',
                available: ''
            }));

            if (newPlanning.length > 0) {
                setEquipments(prev => {
                    const current = prev.filter(p => p.name || p.required || p.available);
                    return [...current, ...newPlanning];
                });
                toast.success(`Synced ${newPlanning.length} equipments from config.`);
            }
        } catch (error) {
            console.error('Failed to sync equipment', error);
            toast.error('Failed to sync equipment from config.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-5 space-y-6 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.push(backPath)} className="p-3 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors shadow-sm">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-4">
                        <Building className="text-blue-600" size={22} />
                        {siteData ? `${siteData.name} — DPR Schedule` : 'Site Execution Schedule'}
                    </h1>
                    <p className="text-gray-500 text-lg font-medium mt-1">Configure the execution parameters and schedule for this site.</p>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {planType === 'cbd' ? (
                    <DpsCbdForm
                        isEditMode={isEditMode}
                        isExpired={isExpired}
                        scheduleValidFrom={scheduleValidFrom}
                        setScheduleValidFrom={setScheduleValidFrom}
                        scheduleValidTill={scheduleValidTill}
                        setScheduleValidTill={setScheduleValidTill}
                        getValidityDuration={getValidityDuration}
                    />
                ) : (
                    <DpsPlanningForm
                        isEditMode={isEditMode}
                        isExpired={isExpired}
                        scheduleValidFrom={scheduleValidFrom}
                        setScheduleValidFrom={setScheduleValidFrom}
                        scheduleValidTill={scheduleValidTill}
                        setScheduleValidTill={setScheduleValidTill}
                        getValidityDuration={getValidityDuration}
                        concreteMode={concreteMode}
                        setConcreteMode={setConcreteMode}
                        concreteScope={concreteScope}
                        setConcreteScope={setConcreteScope}
                        handleGeneratePlanning={handleGeneratePlanning}
                        concretePlanning={concretePlanning}
                        setConcretePlanning={setConcretePlanning}
                        addRecord={addRecord}
                        removeRecord={removeRecord}
                        updateRecord={updateRecord}
                        siteConfig={siteConfig}
                        staffMode={staffMode}
                        setStaffMode={setStaffMode}
                        staffScope={staffScope}
                        setStaffScope={setStaffScope}
                        handleGenerateStaffPlanning={handleGenerateStaffPlanning}
                        staffPlanning={staffPlanning}
                        setStaffPlanning={setStaffPlanning}
                        handleSyncStaff={handleSyncStaff}
                        labourMode={labourMode}
                        setLabourMode={setLabourMode}
                        labourScope={labourScope}
                        setLabourScope={setLabourScope}
                        handleGenerateLabourPlanning={handleGenerateLabourPlanning}
                        labourPlanning={labourPlanning}
                        setLabourPlanning={setLabourPlanning}
                        handleSyncLabor={handleSyncLabor}
                        monthlySchedules={monthlySchedules}
                        setMonthlySchedules={setMonthlySchedules}
                        equipments={equipments}
                        setEquipments={setEquipments}
                        equipmentList={(siteConfig?.equipments || []).map((e: any) => e.name)}
                        equipmentMode={equipmentMode}
                        setEquipmentMode={setEquipmentMode}
                        equipmentScope={equipmentScope}
                        setEquipmentScope={setEquipmentScope}
                        handleGenerateEquipmentPlanning={handleGenerateEquipmentPlanning}
                        handleSyncEquipment={handleSyncEquipment}
                        materials={materials}
                        setMaterials={setMaterials}
                    />
                )}
            </div>

            {/* 8. Execution Log */}
            {!isEditMode && scheduleId && scheduleValidFrom && scheduleValidTill && planType === 'planning' && (
                <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm space-y-5 mb-32">
                    <div className="border-b border-gray-50 pb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3"><Clock className="text-green-600" size={22} />Site Execution Log</h2>
                        <p className="text-gray-500 font-medium ml-10 mt-1">A form is ready for every day of your {getValidityDuration()}-day schedule.</p>
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: getValidityDuration() }).map((_, i) => {
                            const date = new Date(scheduleValidFrom);
                            date.setDate(date.getDate() + i);
                            const dateStr = date.toISOString().split('T')[0];
                            const isToday = dateStr === new Date().toISOString().split('T')[0];
                            return (
                                <div key={dateStr} className={`group flex items-center justify-between px-3 py-2 text-sm rounded-sm border transition-all ${isToday ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/30 border-gray-50 hover:border-gray-200'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-bold ${isToday ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>{i + 1}</div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                {new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                {isToday && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Today</span>}
                                            </h3>
                                            <p className="text-xs text-gray-400 font-medium">Daily Execution Form — {siteData?.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => router.push(`${dailyUpdatePath}?siteId=${siteId}&date=${dateStr}`)} className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2">
                                        View/Record Actuals <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 text-sm flex justify-end gap-4 shadow-sm border-t border-gray-200 z-50">
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4">
                    <p className="font-medium text-gray-500 flex items-center gap-2"><FileText size={18} /> {isEditMode ? 'Schedule Draft' : 'Saved Schedule Document'}</p>
                    <div className="flex gap-4">
                        {!isEditMode ? (
                            <>
                                {isExpired() ? (
                                    <button onClick={handleCreateNew} className="px-6 py-2 bg-black text-white font-medium text-sm rounded-sm hover:bg-gray-800 transition-colors shadow-sm">Renew/Create New Schedule</button>
                                ) : (
                                    <button onClick={() => setIsEditMode(true)} className="px-6 py-2 bg-gray-100 text-gray-900 font-medium text-sm rounded-sm hover:bg-gray-200 transition-colors shadow-sm">Edit Schedule</button>
                                )}
                                <button onClick={handleExport} className="px-6 py-2 bg-blue-600 text-white font-medium text-sm rounded-sm hover:bg-blue-700 transition-colors shadow-sm">Generate Excel</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => router.push(backPath)} className="px-5 py-2 bg-gray-100 text-gray-900 font-medium text-sm rounded-sm hover:bg-gray-200 transition-colors">Discard</button>
                                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-black text-white font-medium text-sm rounded-sm hover:bg-gray-800 transition-colors shadow-sm disabled:bg-gray-400">
                                    {isSaving ? 'Saving...' : 'Save Schedule'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                title={confirmationModal.title}
                message={confirmationModal.message}
                type={confirmationModal.type}
                onConfirm={confirmationModal.onConfirm}
                onClose={closeConfirmation}
            />
        </div>
    );
}

// ── Confirmation Modal Subcomponent ──────────────────────────────────────
function ConfirmationModal({ isOpen, title, message, type, onConfirm, onClose }: { isOpen: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; onConfirm: () => void; onClose: () => void }) {
    if (!isOpen) return null;

    const icon = type === 'danger'
        ? <AlertCircle className="w-6 h-6 text-red-600" />
        : type === 'warning'
            ? <AlertCircle className="w-6 h-6 text-amber-600" />
            : <AlertCircle className="w-6 h-6 text-blue-600" />;

    const btnClass = type === 'danger'
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        : type === 'warning'
            ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm p-4 md:p-6 text-sm">
            <div className="relative w-full max-w-md transform rounded-2xl bg-white p-6 text-left shadow-xl transition-all border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${type === 'danger' ? 'bg-red-100' : type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        {icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold leading-6 text-gray-900">
                            {title}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnClass}`}
                        onClick={onConfirm}
                    >
                        {type === 'danger' ? 'Delete' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
