"use client";

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Building, Calendar, CalendarClock, Layers, ShieldCheck, Wrench, AlertCircle, Plus, Trash2, Clock, HardHat, PackageOpen, FileText, RefreshCw, CheckCircle2, ChevronRight, History as HistoryIcon
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DpsPlanningForm, needsPlanCumulative, planPeriodKey } from './DpsPlanningForm';
import { DpsCbdForm } from './DpsCbdForm';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';

interface DpsSiteScheduleProps {
    siteId: string | string[];
    /** Root of the DPS section — e.g. "/org-admin/dps" or "/employee/dps" */
    basePath: string;
}

/**
 * Every planning row needs a stable id.
 *
 * The grids key their React rows off `row.id`, and plans saved by older builds
 * (or rebuilt from a daily submission) carry rows without one — which React
 * reports as a missing key and which makes rows lose their input state as the
 * list changes. Stamp anything that arrives without an id, positionally so the
 * same row keeps the same id for the life of the screen.
 */
const withRowIds = (rows: any[], prefix: string) =>
    (Array.isArray(rows) ? rows : []).map((row, i) =>
        row && row.id !== undefined && row.id !== null && row.id !== ''
            ? row
            : { ...row, id: `${prefix}-${i}` }
    );

/** First and last day of the month a date falls in, as yyyy-mm-dd. */
const monthBounds = (ref = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    return { from: `${y}-${pad(m + 1)}-01`, till: `${y}-${pad(m + 1)}-${pad(last)}` };
};

export default function DpsSiteSchedule({ siteId, basePath }: DpsSiteScheduleProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const unitId = searchParams.get('unitId');
    const unitName = searchParams.get('unitName') || '';
    const scheduleIdParam = searchParams.get('scheduleId');
    // "Create Plan" always opens a blank cycle. Without this the screen loaded
    // the running plan instead, so creating and editing were the same button.
    const isNewPlan = searchParams.get('new') === '1';

    const actualSiteId = Array.isArray(siteId) ? siteId[0] : siteId;
    const unitQuery = unitId
        ? `unitId=${unitId}&unitName=${encodeURIComponent(unitName)}&type=${searchParams.get('type') || 'planning'}`
        : '';
    /** One level up: the schedules list for this department, else its site. */
    const backPath = unitId
        ? `${basePath}/planned-schedules/${actualSiteId}?${unitQuery}`
        : `${basePath}/schedule?siteId=${actualSiteId}`;

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
    // Staff, labour and equipment are planned as one figure for the cycle by
    // default. Per-day, per-tower manning is a level of detail almost no plan
    // actually carries, and defaulting to it meant every auto-fill produced
    // hundreds of rows before anyone had typed a number.
    const [staffMode, setStaffMode] = useState<'Date-wise' | 'Monthly'>('Monthly');
    const [staffScope, setStaffScope] = useState<'Tower-wise' | 'Overall'>('Overall');
    const [labourMode, setLabourMode] = useState<'Date-wise' | 'Monthly'>('Monthly');
    const [labourScope, setLabourScope] = useState<'Tower-wise' | 'Overall'>('Overall');
    const [equipmentMode, setEquipmentMode] = useState<'Date-wise' | 'Monthly'>('Monthly');
    const [equipmentScope, setEquipmentScope] = useState<'Tower-wise' | 'Overall'>('Overall');
    const [clientBillTargetDate, setClientBillTargetDate] = useState('');
    const [contractorBillTargetDate, setContractorBillTargetDate] = useState('');
    const [observationAction, setObservationAction] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState<{ isOpen: boolean, targetId: string | number | null }>({ isOpen: false, targetId: null });
    // Saving used to drop you back on the sites list with only a toast, so the
    // link between "I planned this" and "daily forms now exist" was invisible.
    const [saveResult, setSaveResult] = useState<{ version?: number; updated: boolean; status?: string; startsOn?: string | null } | null>(null);
    const [targetHistory, setTargetHistory] = useState<any[]>([]);
    /** The plan a new cycle will close, so the screen can warn before saving. */
    const [planBeingReplaced, setPlanBeingReplaced] = useState<any>(null);

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
    /** Cumulative planned per period — one figure for the day or the month,
     *  independent of whether the pour itself is split tower-wise. */
    const [concreteCumulative, setConcreteCumulative] = useState<Record<string, number>>({});
    const [staffPlanning, setStaffPlanning] = useState([{ id: 1, towerId: 'Overall', designation: '', plannedCount: '' }]);
    const [labourPlanning, setLabourPlanning] = useState([{ id: 1, towerId: 'Overall', date: '', labourName: '', type: '', plannedCount: '' }]);
    const [monthlySchedules, setMonthlySchedules] = useState([{ id: 1, towerId: '', floor: '', customFloor: '', target_date: '', achieved_date: '', date: '', purpose: '', is_achieved: false, client_bill_acheived: false }]);
    const [equipments, setEquipments] = useState<any[]>([{ id: 1, towerId: 'Overall', name: '', required: '' }]);
    const [materials, setMaterials] = useState([{ id: 1, name: '', quantity: '', requiredDate: '' }]);
    const equipmentList = ['Crane', 'Excavator', 'Concrete Mixer', 'Bulldozer', 'Other (Add New)'];

    useEffect(() => {
        if (siteId) fetchSiteData();
    }, [siteId, unitId, searchParams.get('type'), scheduleIdParam, isNewPlan]);

    // Sync state with search params if they change
    useEffect(() => {
        const typeInUrl = searchParams.get('type');
        if (typeInUrl && (typeInUrl === 'planning' || typeInUrl === 'cbd')) {
            setPlanType(typeInUrl as 'planning' | 'cbd');
        }
    }, [searchParams]);

    /**
     * Concrete KPIs for the planning header.
     *
     * These used to come from `/:siteId/daily-update`, a path that does not exist
     * (the route is `/:siteId/daily`, and it reads the legacy `dps_daily_updates`
     * table that nothing writes to any more). Actuals now come from the same
     * concrete-tracking endpoint the planning grid uses, so both agree.
     */
    const loadConcreteStats = async (sched: any, config: any) => {
        const today = new Date().toISOString().split('T')[0];

        const trackingQuery = sched?.id ? `?scheduleId=${sched.id}` : '';
        const [tracking, submissionsRes] = await Promise.all([
            apiClient<any>(`/dps-schedule/${actualSiteId}/concrete-tracking${trackingQuery}`, { method: 'GET', withAuth: true }),
            apiClient<any>(`/dps-schedule/dynamic-assignments?siteId=${actualSiteId}&formType=planning&status=submitted`, { method: 'GET', withAuth: true })
        ]);

        const submissions = submissionsRes?.data || submissionsRes || [];
        const latestSub = submissions.length > 0 ? submissions[0] : null;
        const todayRow = (tracking?.days || []).find((d: any) => d.period === today);

        setLatestStats({
            todayAchieved: Number(todayRow?.achieved) || 0,
            monthlyPlanned: Number(tracking?.totals?.planned) || Number(latestSub?.submitted_data?.concrete_planning?.planned_total) || 0,
            monthlyAchieved: Number(tracking?.totals?.achieved) || Number(sched?.current_validity_achieved) || 0,
            totalPlanned: Number(config?.total_concrete_planned) || 0,
            totalAchieved: Number(config?.current_site_achieved || config?.concrete_cumulative_till_date) || 0
        });
    };

    /** Open meeting points for this site, merged into the issues section. */
    const loadMomActions = async () => {
        const momRes = await apiClient<any>(`/dps-schedule/${siteId}/mom-actions`, { method: 'GET', withAuth: true });
        const momData = momRes?.data || [];
        setObservationAction(prev => {
            const momItems = momData.map((m: any) => ({ ...m, id: `mom-${m.id}`, source: 'MOM' }));
            const existingIds = prev.map(p => p.id);
            return [...prev, ...momItems.filter((m: any) => !existingIds.includes(m.id))];
        });
    };

    /** Seed a fresh plan from the last submitted form so nothing is retyped. */
    const loadCarryForward = async (sched: any) => {
        const latestRes = await apiClient<any>(
            `/dps-schedule/dynamic-assignments/latest-submission?siteId=${actualSiteId}&scheduleId=${sched?.id || ''}`,
            { method: 'GET', withAuth: true }
        );
        if (!latestRes?.data) return;

        const {
            materials: prevMaterials,
            equipments: prevEquipments,
            staff_planning: prevStaff,
            monthly_schedules: prevMonthly
        } = latestRes.data;

        let seq = 0;
        const reId = (prefix: string) => (item: any) => ({ ...item, id: `${prefix}-${Date.now()}-${seq++}` });

        if (prevMaterials?.length > 0) setMaterials(prevMaterials.map(reId('prev-mat')));
        if (prevEquipments?.length > 0) setEquipments(prevEquipments.map(reId('prev-eq')));
        if (prevStaff?.length > 0) {
            // Manual rows carry `role`, generated rows carry `designation`; keep both.
            setStaffPlanning(prevStaff.map((s: any) => ({
                ...reId('prev-staff')(s),
                role: s.role || s.designation || ''
            })));
        }
        if (prevMonthly?.length > 0) setMonthlySchedules(prevMonthly.map(reId('prev-month')));
    };

    const fetchSiteData = async () => {
        try {
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

            // A brand-new cycle starts blank and defaults to the next period that
            // is not spoken for, because that is how plans are actually cut: set
            // up ahead of the month, then filled in day by day against it.
            if (isNewPlan) {
                setScheduleId(null);
                setScheduleStatus('active');
                setIsEditMode(true);

                // Everything already running or queued for this department. The
                // running one is what a plan starting today would replace; the
                // queued ones are what the default period has to step past.
                let live: any[] = [];
                try {
                    const qs = new URLSearchParams({ siteId: String(actualSiteId) });
                    if (unitId) qs.append('unitId', unitId);
                    qs.append('type', searchParams.get('type') || planType);
                    const listRes = await apiClient<any>(`/dps-schedule?${qs.toString()}`, { method: 'GET', withAuth: true });
                    live = (listRes?.schedules || []).filter(
                        (p: any) => p.status === 'active' || p.status === 'scheduled'
                    );
                } catch {
                    live = [];
                }
                setPlanBeingReplaced(live.find((p: any) => p.status === 'active') || null);

                // Start the month after the last period already covered — planning
                // the same month twice replaces it, which is rarely what "create a
                // plan" is reaching for when one is already queued.
                const endsOf = live
                    .map((p: any) => p.schedule_valid_till)
                    .filter(Boolean)
                    .map((d: string) => new Date(d))
                    .filter((d: Date) => !isNaN(d.getTime()));
                const lastCovered = endsOf.length
                    ? new Date(Math.max(...endsOf.map((d: Date) => d.getTime())))
                    : null;

                const now = new Date();
                const stillRunning = lastCovered
                    ? new Date(lastCovered).setHours(23, 59, 59, 999) >= now.getTime()
                    : false;
                const target = stillRunning && lastCovered
                    ? new Date(lastCovered.getFullYear(), lastCovered.getMonth() + 1, 1)
                    : now;
                const { from, till } = monthBounds(target);
                setScheduleValidFrom(from);
                setScheduleValidTill(till);
                setConcreteCumulative({});

                // Seed the new cycle from the last submitted report and pull in
                // open issues, so a month rolls over instead of being retyped.
                await Promise.allSettled([
                    loadCarryForward(null),
                    loadMomActions(),
                    loadConcreteStats(null, configRes?.config)
                ]);
                return;
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
                    if (sched.towers) setTowers(withRowIds(sched.towers, 'tower'));
                    if (sched.concrete_planning) setConcretePlanning(withRowIds(sched.concrete_planning, 'conc'));
                    setConcreteCumulative(
                        sched.concrete_cumulative && typeof sched.concrete_cumulative === 'object' && !Array.isArray(sched.concrete_cumulative)
                            ? sched.concrete_cumulative
                            : {}
                    );
                    if (sched.staff_planning) setStaffPlanning(withRowIds(sched.staff_planning, 'staff'));
                    if (sched.labour_planning) setLabourPlanning(withRowIds(sched.labour_planning, 'labour'));
                    if (sched.monthly_schedules) setMonthlySchedules(withRowIds(sched.monthly_schedules, 'mile'));
                    if (sched.equipments) setEquipments(withRowIds(sched.equipments, 'eq'));
                    if (sched.materials) setMaterials(withRowIds(sched.materials, 'mat'));
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

                    // These three feeds are independent of each other. They used to
                    // share one try/catch and one Promise.all, so a single failing
                    // request silently took down the stats, the MOM items AND the
                    // carry-forward. Settle them separately instead.
                    await Promise.allSettled([
                        loadConcreteStats(sched, configRes?.config),
                        loadMomActions(),
                        scheduleIdParam ? Promise.resolve() : loadCarryForward(sched)
                    ]);
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

    /**
     * @param asNewVersion  Archive the current plan and insert a fresh version.
     *   Ordinary edits update the active row in place; a new version is only
     *   created deliberately, because submissions are tied to a schedule id and
     *   forking one detaches all of its recorded progress.
     */
    const handleSave = async (asNewVersion = false) => {
        if (!scheduleValidFrom || !scheduleValidTill) {
            toast.error('Set the plan period (from and to dates) before saving.');
            return;
        }
        if (new Date(scheduleValidTill) < new Date(scheduleValidFrom)) {
            toast.error('The plan period ends before it starts.');
            return;
        }
        // Cumulative planned is required wherever the grid asks for it — a plan
        // that states a per-period figure but no running total is half a plan.
        if (planType === 'planning' && needsPlanCumulative(concreteCumulative, concreteMode, concreteScope)) {
            toast.error('Enter the cumulative planned for this plan before saving.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                id: scheduleId,
                unit_id: unitId,
                scheduleValidFrom,
                scheduleValidTill,
                towers,
                concrete_planning: concretePlanning,
                concrete_cumulative: concreteCumulative,
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

            // A queued plan has not started; editing it in place is right. Only a
            // closed plan forces a new one.
            const isEditable = scheduleStatus === 'active' || scheduleStatus === 'scheduled';
            const canUpdateInPlace = !asNewVersion && scheduleId && isEditable;

            let res;
            if (canUpdateInPlace) {
                try {
                    res = await apiClient<any>(`/dps-schedule/${siteId}/${scheduleId}`, {
                        method: 'PUT',
                        withAuth: true,
                        body: payload
                    });
                    setSaveResult({ updated: true });
                } catch (err: any) {
                    // The row was archived behind our back (someone else revised it);
                    // fall through and create a version rather than losing the edit.
                    if (err?.status !== 409) throw err;
                    res = await apiClient<any>(`/dps-schedule/${siteId}`, {
                        method: 'POST',
                        withAuth: true,
                        body: payload
                    });
                    toast('This plan was closed elsewhere, so your edit became a new plan.', { icon: 'ℹ️' });
                    setSaveResult({
                        updated: false,
                        version: res?.version,
                        status: res?.status,
                        startsOn: res?.starts_on
                    });
                }
            } else {
                res = await apiClient<any>(`/dps-schedule/${siteId}`, {
                    method: 'POST',
                    withAuth: true,
                    body: payload
                });
                setSaveResult({ updated: false, version: res?.version });

                // The plan now exists. Hold on to its id and clear `new=1`, or the
                // next save would create yet another plan and archive this one.
                if (res?.id) {
                    setScheduleId(res.id);
                    setScheduleStatus('active');
                    setPlanBeingReplaced(null);
                    const qs = new URLSearchParams(searchParams.toString());
                    qs.delete('new');
                    qs.set('scheduleId', String(res.id));
                    router.replace(`${basePath}/schedule/${actualSiteId}?${qs.toString()}`);
                }
            }

            if (res) setIsEditMode(false);
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

    // Renewing goes through the same URL-driven flow as "Create Plan" so both
    // land on an identical blank cycle rather than two subtly different ones.
    const handleCreateNew = () => {
        const qs = new URLSearchParams(searchParams.toString());
        qs.delete('scheduleId');
        qs.set('new', '1');
        router.push(`${basePath}/schedule/${actualSiteId}?${qs.toString()}`);
    };

    const handleExport = async () => {
        try {
            const blob = await apiClient<Blob>(`/dps-schedule/${siteId}/export`, { method: 'GET', withAuth: true, responseType: 'blob' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `DPR_Report_${siteData?.name || siteId}.xlsx`;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); document.body.removeChild(a);
        } catch { toast.error('Failed to generate Excel report.'); }
    };

    const handleGeneratePlanning = () => {
        if (!scheduleValidFrom || !scheduleValidTill) {
            toast.error('Please set schedule validity dates first.');
            return;
        }
        // Date-wise pour dates are chosen one by one — concrete is not poured every
        // day — so there is no grid to lay back out, and doing so would wipe them.
        if (concreteMode === 'Date-wise') {
            toast.error('Date-wise pour dates are added individually. Switch to Monthly to lay out a grid.');
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: 'Rebuild Cycle Rows',
            message: `This lays out one concrete row per ${concreteScope === 'Tower-wise' ? 'tower and area' : 'site'} for the whole cycle, replacing whatever is in the grid now. Do you want to proceed?`,
            type: 'warning',
            onConfirm: () => {
                const records: any[] = [];
                let currentId = Date.now();

                // Monthly is one bucket for the whole cycle, so this lays out one
                // row per scope — not one per calendar month.
                const period = planPeriodKey(scheduleValidFrom, scheduleValidTill);
                const scopes = concreteScope === 'Tower-wise'
                    ? [
                        ...(siteConfig?.towers || []).map((t: any) => t.name),
                        ...(siteConfig?.areas || []).map((a: any) => a.name)
                    ].filter(Boolean)
                    : [];
                (scopes.length > 0 ? scopes : ['Overall']).forEach((name: string) => {
                    records.push({ id: currentId++, date: period, towerId: name, concretePlanned: '' });
                });

                setConcretePlanning(records);
                closeConfirmation();
            }
        });
    };
    const formatDay = (d: string) => d
        ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    /**
     * Whether this plan's period is still ahead of us.
     *
     * The server makes the same call in IST when it decides between 'active' and
     * 'scheduled'; this is the screen's preview of that decision.
     */
    const startsLater = Boolean(
        scheduleValidFrom &&
        new Date(scheduleValidFrom).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)
    );

    /** The month this plan covers — the label people actually navigate by. */
    const periodLabel = (() => {
        if (!scheduleValidFrom) return '';
        const from = new Date(scheduleValidFrom);
        if (isNaN(from.getTime())) return '';
        const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        const till = scheduleValidTill ? new Date(scheduleValidTill) : null;
        if (!till || isNaN(till.getTime())) return month(from);
        if (from.getFullYear() === till.getFullYear() && from.getMonth() === till.getMonth()) return month(from);
        return `${month(from)} — ${month(till)}`;
    })();

    return (
        <div className="max-w-7xl mx-auto p-5 space-y-6 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push(backPath)}
                    title={unitId ? 'Back to schedules' : 'Back to departments'}
                    className="p-3 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-4">
                        <Building className="text-blue-600" size={22} />
                        <span>{`${isNewPlan ? 'New Plan' : 'Plan'}${periodLabel ? ` — ${periodLabel}` : ''}`}</span>
                        {unitName ? <span className="text-base font-medium text-gray-400">{unitName}</span> : null}
                    </h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">
                        {siteData?.name ? `${siteData.name} • ` : ''}
                        Plan the cycle here; the daily report is filled against it each day.
                    </p>
                </div>
            </div>

            {/* What saving actually does depends on when this plan starts, so say
                which of the two it will be before the planner commits. */}
            {isNewPlan && (startsLater
                ? (
                    <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200">
                        <CalendarClock size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-indigo-900 leading-relaxed">
                            This plan starts on <span className="font-semibold">{formatDay(scheduleValidFrom)}</span>,
                            so it will be saved as <span className="font-semibold">scheduled</span> and take over
                            that morning.
                            {planBeingReplaced
                                ? ' The plan running today keeps producing daily reports until then.'
                                : ' No daily reports are produced for this department until then.'}
                        </p>
                    </div>
                )
                : planBeingReplaced && (
                    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200">
                        <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-900 leading-relaxed">
                            This plan starts today, so saving it closes the plan currently running
                            {planBeingReplaced.schedule_valid_from
                                ? <> for <span className="font-semibold">
                                    {new Date(planBeingReplaced.schedule_valid_from).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                </span></>
                                : null}.
                            The daily reports already filed against it stay with it.
                        </p>
                    </div>
                )
            )}

            {/* A queued plan is live work, just not yet in force. */}
            {!isNewPlan && scheduleId && scheduleStatus === 'scheduled' && (
                <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200">
                    <CalendarClock size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-900 leading-relaxed">
                        This plan is scheduled and takes over on <span className="font-semibold">{formatDay(scheduleValidFrom)}</span>.
                        Edit it freely until then — it is not producing daily reports yet.
                    </p>
                </div>
            )}

            {/* A closed plan is a record of a finished cycle, not a draft. */}
            {!isNewPlan && scheduleId && !['active', 'scheduled'].includes(scheduleStatus) && (
                <div className="flex items-start gap-3 px-4 py-3 bg-slate-100 border border-slate-200">
                    <FileText size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 leading-relaxed">
                        This is a closed plan, kept for its record of daily reports. To change how work is planned,
                        create a plan for the current period instead.
                    </p>
                </div>
            )}

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
                        concreteCumulative={concreteCumulative}
                        setConcreteCumulative={setConcreteCumulative}
                        addRecord={addRecord}
                        removeRecord={removeRecord}
                        updateRecord={updateRecord}
                        siteConfig={siteConfig}
                        staffMode={staffMode}
                        setStaffMode={setStaffMode}
                        staffScope={staffScope}
                        setStaffScope={setStaffScope}
                        staffPlanning={staffPlanning}
                        setStaffPlanning={setStaffPlanning}
                        labourMode={labourMode}
                        setLabourMode={setLabourMode}
                        labourScope={labourScope}
                        setLabourScope={setLabourScope}
                        labourPlanning={labourPlanning}
                        setLabourPlanning={setLabourPlanning}
                        monthlySchedules={monthlySchedules}
                        setMonthlySchedules={setMonthlySchedules}
                        equipments={equipments}
                        setEquipments={setEquipments}
                        equipmentList={(siteConfig?.equipments || []).map((e: any) => e.name)}
                        equipmentMode={equipmentMode}
                        setEquipmentMode={setEquipmentMode}
                        equipmentScope={equipmentScope}
                        setEquipmentScope={setEquipmentScope}
                        latestStats={latestStats}
                        onViewTargetHistory={fetchTargetHistory}
                        siteId={Array.isArray(siteId) ? siteId[0] : siteId}
                        scheduleId={scheduleId}
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
                    <p className="font-medium text-gray-500 flex items-center gap-2">
                        <FileText size={18} />
                        {isNewPlan
                            ? `New plan${periodLabel ? ` · ${periodLabel}` : ''}`
                            : isEditMode
                                ? `Editing plan${periodLabel ? ` · ${periodLabel}` : ''}`
                                : `${scheduleStatus === 'active' ? 'Active' : 'Closed'} plan${periodLabel ? ` · ${periodLabel}` : ''}`}
                    </p>
                    <div className="flex gap-4">
                        {!isEditMode ? (
                            <>
                                {scheduleStatus === 'active' && !isExpired() && (
                                    <button onClick={() => setIsEditMode(true)} className="px-6 py-2 bg-gray-100 text-gray-900 font-medium text-sm rounded-sm hover:bg-gray-200 transition-colors shadow-sm">Edit Plan</button>
                                )}
                                <button onClick={handleCreateNew} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium text-sm rounded-sm hover:border-gray-900 hover:text-gray-900 transition-colors">
                                    Create Plan for Next Period
                                </button>
                                <button onClick={handleExport} className="px-6 py-2 bg-blue-600 text-white font-medium text-sm rounded-sm hover:bg-blue-700 transition-colors shadow-sm">Generate Excel</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => router.push(backPath)} className="px-5 py-2 bg-gray-100 text-gray-900 font-medium text-sm rounded-sm hover:bg-gray-200 transition-colors">Discard</button>
                                <button onClick={() => handleSave(false)} disabled={isSaving} className="px-6 py-2 bg-black text-white font-medium text-sm rounded-sm hover:bg-gray-800 transition-colors shadow-sm disabled:bg-gray-400">
                                    {isSaving ? 'Saving...' : (scheduleId && scheduleStatus === 'active' ? 'Save changes' : 'Create Plan')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Post-save: say what the plan actually produced and where to go next */}
            {saveResult && (() => {
                const assignees = planType === 'cbd'
                    ? (siteConfig?.cbd_assignees || [])
                    : (siteConfig?.planning_assignees || []);
                const startsOn = scheduleValidFrom
                    ? new Date(scheduleValidFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : null;

                return (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-lg border border-slate-200 shadow-2xl">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 flex-shrink-0">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-semibold text-slate-900">
                                        {saveResult.updated ? 'Plan updated' : 'Plan created'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {siteData?.name}{unitName ? ` · ${unitName}` : ''}{periodLabel ? ` · ${periodLabel}` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="px-6 py-5 space-y-3">
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {saveResult.status === 'scheduled' ? (
                                        <>
                                            This plan takes over on <span className="font-semibold text-slate-900">{startsOn || 'its start date'}</span>.
                                            Until then the plan running today keeps producing the daily
                                            {planType === 'cbd' ? ' CBD' : ' DPR'} report.
                                        </>
                                    ) : (
                                        <>
                                            Daily {planType === 'cbd' ? 'CBD' : 'DPR'} forms are generated automatically each morning
                                            {startsOn ? <> from <span className="font-semibold text-slate-900">{startsOn}</span></> : null}
                                            {' '}for as long as this plan is active.
                                        </>
                                    )}
                                </p>

                                <div className="border border-slate-200 divide-y divide-slate-100">
                                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignees</span>
                                        <span className="text-xs font-semibold text-slate-900 text-right truncate">
                                            {assignees.length > 0
                                                ? assignees.map((a: any) => a.employee_name).join(', ')
                                                : 'None set — add them in Site Config'}
                                        </span>
                                    </div>
                                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Period</span>
                                        <span className="text-xs font-semibold text-slate-900">
                                            {periodLabel || '—'} · {getValidityDuration()} days
                                        </span>
                                    </div>
                                </div>

                                {assignees.length === 0 && (
                                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200">
                                        <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800">
                                            No assignees are set for this site, so no daily forms will reach anyone.
                                            Add them under <span className="font-semibold">Site Config</span> on the planning screen.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setSaveResult(null)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    Keep editing
                                </button>
                                <button
                                    onClick={() => router.push(backPath)}
                                    className="px-4 py-2 border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-900 transition-colors"
                                >
                                    {unitId ? 'Back to Schedules' : 'Back to Departments'}
                                </button>
                                <button
                                    onClick={() => router.push(`${basePath}/assignments`)}
                                    className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                                >
                                    Go to Daily Forms
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
