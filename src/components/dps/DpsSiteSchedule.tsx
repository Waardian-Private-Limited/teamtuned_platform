"use client";

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Building, Calendar, Layers, ShieldCheck, Wrench, AlertCircle, Plus, Trash2, Clock, HardHat, PackageOpen, FileText, RefreshCw, CheckCircle2, ChevronRight, History as HistoryIcon
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
    const [clientBillTargetDate, setClientBillTargetDate] = useState('');
    const [contractorBillTargetDate, setContractorBillTargetDate] = useState('');
    const [observationAction, setObservationAction] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState<{ isOpen: boolean, targetId: string | number | null }>({ isOpen: false, targetId: null });
    const [targetHistory, setTargetHistory] = useState<any[]>([]);

    const [latestStats, setLatestStats] = useState({
        todayAchieved: 0,
        monthlyPlanned: 0,
        monthlyAchieved: 0,
        totalPlanned: 0,
        totalAchieved: 0
    });

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
    const [equipments, setEquipments] = useState<any[]>([{ id: 1, towerId: 'Overall', name: '', required: '' }]);
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
                const currentType = searchParams.get('type') || planType;
                if (currentType) qParams.append('type', currentType);
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
                    if (sched.client_bill_target_date) setClientBillTargetDate(formatDate(sched.client_bill_target_date));
                    if (sched.contractor_bill_target_date) setContractorBillTargetDate(formatDate(sched.contractor_bill_target_date));
                    if (sched.observation_action) setObservationAction(sched.observation_action);
                    setIsEditMode(false);

                    // Fetch Latest Stats for Concrete Card
                    try {
                        const today = new Date().toISOString().split('T')[0];
                        const [dailyRes, submissionsRes] = await Promise.all([
                            apiClient<any>(`/dps-schedule/${siteId}/daily-update?date=${today}`, { method: 'GET', withAuth: true }),
                            apiClient<any>(`/dps-schedule/dynamic-assignments?siteId=${siteId}&formType=planning&status=submitted`, { method: 'GET', withAuth: true })
                        ]);

                        const submissions = submissionsRes?.data || submissionsRes || [];
                        const latestSub = submissions.length > 0 ? submissions[0] : null;

                        setLatestStats({
                            todayAchieved: dailyRes?.data?.concreteAchieved?.reduce((a: number, c: any) => a + (Number(c.achieved) || 0), 0) || 0,
                            monthlyPlanned: Number(latestSub?.submitted_data?.concrete_planning?.planned_total) || 0,
                            monthlyAchieved: Number(sched?.current_validity_achieved || latestSub?.submitted_data?.concrete_planning?.achieved_total) || 0,
                            totalPlanned: Number(configRes?.config?.total_concrete_planned) || 0,
                            totalAchieved: Number(configRes?.config?.current_site_achieved || configRes?.config?.concrete_cumulative_till_date) || 0
                        });

                        // Fetch MOM / Action Items
                        const momRes = await apiClient<any>(`/dps-schedule/${siteId}/mom-actions`, { method: 'GET', withAuth: true });
                        const momData = momRes?.data || [];
                        setObservationAction(prev => {
                            const momItems = momData.map((m: any) => ({
                                ...m,
                                id: `mom-${m.id}`,
                                source: 'MOM'
                            }));
                            // Keep unique MOM items
                            const existingIds = prev.map(p => p.id);
                            const uniqueMom = momItems.filter((m: any) => !existingIds.includes(m.id));
                            return [...prev, ...uniqueMom];
                        });

                        // Repopulate Materials, Equipment, Staff and Targets if it's a new form (not editing an existing draft)
                        if (!scheduleIdParam) {
                            const actualSiteId = Array.isArray(siteId) ? siteId[0] : siteId;
                            const latestRes = await apiClient<any>(`/dps-schedule/dynamic-assignments/latest-submission?siteId=${actualSiteId}&scheduleId=${sched?.id || ''}`, { method: 'GET', withAuth: true });
                            if (latestRes?.data) {
                                const { materials: prevMaterials, equipments: prevEquipments, staff_planning: prevStaff, monthly_schedules: prevMonthly } = latestRes.data;

                                if (prevMaterials?.length > 0) {
                                    setMaterials(prevMaterials.map((m: any) => ({ ...m, id: `prev-mat-${Date.now()}-${Math.random()}` })));
                                }
                                if (prevEquipments?.length > 0) {
                                    setEquipments(prevEquipments.map((e: any) => ({ ...e, id: `prev-eq-${Date.now()}-${Math.random()}` })));
                                }
                                if (prevStaff?.length > 0) {
                                    // Map designation to role to ensure consistency in manual rows
                                    setStaffPlanning(prevStaff.map((s: any) => ({
                                        ...s,
                                        role: s.role || s.designation || '',
                                        id: `prev-staff-${Date.now()}-${Math.random()}`
                                    })));
                                }
                                if (prevMonthly?.length > 0) {
                                    setMonthlySchedules(prevMonthly.map((m: any) => ({
                                        ...m,
                                        id: `prev-month-${Date.now()}-${Math.random()}`
                                    })));
                                }
                            }
                        }

                    } catch (e) {
                        console.error('Failed to fetch detailed stats', e);
                    }
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

    const fetchTargetHistory = async (targetId: string | number) => {
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const res = await apiClient<any>(`/dps-schedule/${siteId}/target-history/${targetId}`, { method: 'GET', withAuth: true });
            if (res?.history) {
                setTargetHistory(res.history);
                setShowHistoryModal({ isOpen: true, targetId });
            } else {
                toast.error('No history found for this target.');
            }
        } catch (error) {
            console.error('Failed to fetch target history', error);
            toast.error('Failed to fetch target history.');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { apiClient } = await import('@/lib/apiClient');
            const payload = {
                id: scheduleId,
                unit_id: unitId,
                scheduleValidFrom,
                scheduleValidTill,
                towers,
                concrete_planning: concretePlanning,
                staff_planning: staffPlanning,
                labour_planning: labourPlanning,
                monthly_schedules: monthlySchedules,
                equipments,
                materials,
                concreteMode,
                concreteScope,
                staffMode,
                staffScope,
                labourMode,
                labourScope,
                equipmentMode,
                equipmentScope,
                client_bill_target_date: clientBillTargetDate,
                contractor_bill_target_date: contractorBillTargetDate,
                plan_type: planType,
                observationAction,
                mode: isEditMode ? 'edit' : 'new'
            };

            const res = await apiClient<any>(`/dps-schedule/${siteId}`, {
                method: 'POST',
                withAuth: true,
                body: payload
            });
            if (res) {
                toast.success('DPR Schedule saved successfully!');
                router.push(`${backPath.includes('org-admin') ? '/org-admin/dps/schedule' : '/employee/dps/schedule'}`);
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
                                required: eq.required || eq.count || eq.qty || ''
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
                required: eq.required || eq.count || eq.qty || ''
            }));

            if (newPlanning.length > 0) {
                setEquipments(prev => {
                    const current = prev.filter(p => p.name || p.required);
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
                        clientBillTargetDate={clientBillTargetDate}
                        setClientBillTargetDate={setClientBillTargetDate}
                        contractorBillTargetDate={contractorBillTargetDate}
                        setContractorBillTargetDate={setContractorBillTargetDate}
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
                        observationAction={observationAction}
                        setObservationAction={setObservationAction}
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
                        latestStats={latestStats}
                        onViewTargetHistory={fetchTargetHistory}
                    />
                )}
            </div>

            {/* Target History Modal */}
            {showHistoryModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <HistoryIcon className="text-indigo-600" /> Target Revision History
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Track date changes and reasons</p>
                            </div>
                            <button onClick={() => setShowHistoryModal({ isOpen: false, targetId: null })} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {targetHistory.length > 0 ? (
                                <div className="space-y-6">
                                    {targetHistory.map((h, idx) => (
                                        <div key={idx} className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-indigo-100 last:before:hidden">
                                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center z-10">
                                                <Clock size={12} className="text-indigo-600" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-slate-900">{new Date(h.new_target_date).toLocaleDateString()}</span>
                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Revised On {new Date(h.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm">
                                                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic">"{h.reason || 'No reason provided'}"</p>
                                                </div>
                                                {h.previous_target_date && (
                                                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                        Previous: <span className="line-through">{new Date(h.previous_target_date).toLocaleDateString()}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                                    <HistoryIcon size={40} className="mb-2 opacity-20" />
                                    <p className="text-sm font-medium">No history found for this target.</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
                            <button onClick={() => setShowHistoryModal({ isOpen: false, targetId: null })} className="px-6 py-2 bg-slate-900 text-white text-xs font-black rounded-sm uppercase tracking-widest hover:bg-black transition-all">Close</button>
                        </div>
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
