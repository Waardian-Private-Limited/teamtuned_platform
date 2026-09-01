"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
    Building,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    LayoutDashboard,
    ClipboardCheck,
    CalendarRange,
    MapPin,
    ArrowRight,
    ArrowLeft,
    Settings,
    Plus,
    X,
    Trash2,
    Save,
    Users,
    HardHat,
    Wrench,
    Globe
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

import { DpsConfigForm } from './DpsConfigForm';
import { DpsMasterConfigForm } from './DpsMasterConfigForm';
import { AlertCircle } from 'lucide-react';

interface DpsScheduleProps {
    basePath: string;
}

interface SiteUnit {
    id: number;
    site_id: number;
    name: string;
    type: string;
    form_type: 'planning' | 'cbd';
    created_at: string;
    has_active_planning?: number;
    has_active_cbd?: number;
    active_planning_version?: number;
    active_cbd_version?: number;
    next_planning_start?: string | null;
    next_cbd_start?: string | null;
}

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

interface Department {
    id: number;
    name: string;
    description?: string;
    status?: string;
}

interface DeptSelection {
    name: string;
    formType: 'planning' | 'cbd';
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
    cbd_assignees?: StaffEmployee[];
    cbd_reviewers?: StaffEmployee[];
    planning_assignees?: StaffEmployee[];
    planning_reviewers?: StaffEmployee[];
    material_responsible?: StaffEmployee[];
    equipment_responsible?: StaffEmployee[];
    totalConcretePlanned?: number;
    concreteCumulativeTillDate?: number;
}

const DEPT_ICONS: Record<string, React.ReactNode> = {
    'Civil': <HardHat size={20} />,
    'Structural': <Building size={20} />,
    'MEP': <Wrench size={20} />,
    'Safety': <ClipboardCheck size={20} />,
};

function getDeptIcon(type: string) {
    const key = Object.keys(DEPT_ICONS).find(k => type?.toLowerCase().includes(k.toLowerCase()));
    return key ? DEPT_ICONS[key] : <Users size={20} />;
}

export default function DpsSchedule({ basePath }: DpsScheduleProps) {
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    // Unit selection view
    const [selectedSite, setSelectedSite] = useState<any>(null);
    const [units, setUnits] = useState<SiteUnit[]>([]);
    const [unitsLoading, setUnitsLoading] = useState(false);

    // Add Department picker — all org departments are listed at once and the
    // admin ticks the ones this site should plan for.
    const [addUnitOpen, setAddUnitOpen] = useState(false);
    const [savingUnit, setSavingUnit] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [deptLoading, setDeptLoading] = useState(false);
    const [deptSearch, setDeptSearch] = useState('');
    const [selectedDepts, setSelectedDepts] = useState<Record<string, DeptSelection>>({});
    const [customUnitName, setCustomUnitName] = useState('');
    const [customUnitType, setCustomUnitType] = useState('');
    const [customUnitFormType, setCustomUnitFormType] = useState<'planning' | 'cbd'>('planning');

    // Modals & States
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [configSite, setConfigSite] = useState<any>(null);
    const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
    const [savingConfig, setSavingConfig] = useState(false);
    const [masterConfigOpen, setMasterConfigOpen] = useState(false);

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
    const [employees, setEmployees] = useState<any[]>([]);

    const router = useRouter();
    const searchParams = useSearchParams();
    const siteIdInUrl = searchParams.get('siteId');

    /** Where a child screen should send you when it is done. */
    const deptListPath = (siteId: number | string) => `${basePath}/schedule?siteId=${siteId}`;
    const planPath = (siteId: number | string, unit: SiteUnit, extra = '') =>
        `${basePath}/schedule/${siteId}?unitId=${unit.id}&unitName=${encodeURIComponent(unit.name)}&type=${unit.form_type || 'planning'}${extra}`;
    const schedulesPath = (siteId: number | string, unit: SiteUnit) =>
        `${basePath}/planned-schedules/${siteId}?unitId=${unit.id}&unitName=${encodeURIComponent(unit.name)}&type=${unit.form_type || 'planning'}`;

    useEffect(() => { fetchSites(); }, []);

    // Which site is open lives in the URL, not in component state. It used to be
    // state only, so coming back from a plan screen always dumped you on the
    // sites list and you had to find your site and department again.
    useEffect(() => {
        if (!siteIdInUrl) {
            setSelectedSite(null);
            setUnits([]);
            return;
        }
        if (selectedSite && String(selectedSite.id) === String(siteIdInUrl)) return;

        const known = sites.find(s => String(s.id) === String(siteIdInUrl));
        if (known) {
            loadUnitsFor(known);
        } else if (!loading && sites.length > 0) {
            // Stale/unknown site in the URL — fall back to the list.
            router.replace(`${basePath}/schedule`);
        }
    }, [siteIdInUrl, sites, loading]);

    const fetchSites = async () => {
        setLoading(true);
        try {
            const res = await apiClient<any>('/dps-schedule/sites', { method: 'GET', withAuth: true });
            setSites(res.sites || []);
        } catch {
            toast.error('Failed to load sites');
        } finally {
            setLoading(false);
        }
    };

    const openSiteUnits = (site: any) => router.push(deptListPath(site.id));

    const loadUnitsFor = async (site: any) => {
        setSelectedSite(site);
        setUnitsLoading(true);
        try {
            const res = await apiClient<any>(`/dps-schedule/${site.id}/units`, { method: 'GET', withAuth: true });
            console.log('[DPS Site Units]:', res.units);
            setUnits(res.units || []);
        } catch {
            toast.error('Failed to load units');
        } finally {
            setUnitsLoading(false);
        }
    };

    const openAddUnit = async () => {
        setDeptLoading(true);
        setAddUnitOpen(true);
        setDeptSearch('');
        setSelectedDepts({});
        setCustomUnitName('');
        setCustomUnitType('');
        setCustomUnitFormType('planning');
        try {
            const res = await apiClient<any>('/organization/departments', { method: 'GET', withAuth: true });
            // API may return array directly (legacy) or { departments: [...] }
            const depts = Array.isArray(res) ? res : (res?.departments || []);
            setDepartments(depts.filter((d: any) => d.status === 'active' || !d.status));
        } catch {
            toast.error('Failed to load departments');
        } finally {
            setDeptLoading(false);
        }
    };

    // A department is "already planned" once a unit of the same name exists here.
    const addedDeptNames = useMemo(
        () => new Set(units.map(u => (u.name || '').trim().toLowerCase())),
        [units]
    );

    const toggleDept = (dept: Department) => {
        setSelectedDepts(prev => {
            const next = { ...prev };
            const key = String(dept.id);
            if (next[key]) delete next[key];
            else next[key] = { name: dept.name, formType: 'planning' };
            return next;
        });
    };

    const setDeptFormType = (deptId: number, formType: 'planning' | 'cbd') => {
        setSelectedDepts(prev => {
            const key = String(deptId);
            if (!prev[key]) return prev;
            return { ...prev, [key]: { ...prev[key], formType } };
        });
    };

    const visibleDepartments = useMemo(() => {
        const q = deptSearch.toLowerCase().trim();
        if (!q) return departments;
        return departments.filter(d => d.name?.toLowerCase().includes(q));
    }, [departments, deptSearch]);

    const selectableDepartments = useMemo(
        () => visibleDepartments.filter(d => !addedDeptNames.has((d.name || '').trim().toLowerCase())),
        [visibleDepartments, addedDeptNames]
    );

    const allVisibleSelected = selectableDepartments.length > 0 &&
        selectableDepartments.every(d => selectedDepts[String(d.id)]);

    const toggleSelectAll = () => {
        if (allVisibleSelected) {
            setSelectedDepts(prev => {
                const next = { ...prev };
                selectableDepartments.forEach(d => { delete next[String(d.id)]; });
                return next;
            });
        } else {
            setSelectedDepts(prev => {
                const next = { ...prev };
                selectableDepartments.forEach(d => {
                    if (!next[String(d.id)]) next[String(d.id)] = { name: d.name, formType: 'planning' };
                });
                return next;
            });
        }
    };

    const selectedCount = Object.keys(selectedDepts).length;

    const handleAddUnits = async () => {
        const payload = Object.values(selectedDepts).map(sel => ({
            name: sel.name,
            type: sel.name,
            form_type: sel.formType
        }));

        const customName = customUnitName.trim();
        if (customName) {
            if (!customUnitType) {
                toast.error('Pick a department type for the custom entry');
                return;
            }
            payload.push({ name: customName, type: customUnitType, form_type: customUnitFormType });
        }

        if (payload.length === 0) {
            toast.error('Select at least one department');
            return;
        }

        setSavingUnit(true);
        try {
            const res = await apiClient<any>(`/dps-schedule/${selectedSite.id}/units/bulk`, {
                method: 'POST',
                body: { units: payload },
                withAuth: true
            });
            const createdCount = res?.created?.length ?? payload.length;
            const skipped = res?.skipped || [];
            toast.success(`${createdCount} department${createdCount === 1 ? '' : 's'} added`);
            if (skipped.length > 0) {
                toast(`Skipped ${skipped.length}: ${skipped.map((s: any) => s.name).join(', ')}`, { icon: '⚠️' });
            }
            setAddUnitOpen(false);
            const unitsRes = await apiClient<any>(`/dps-schedule/${selectedSite.id}/units`, { method: 'GET', withAuth: true });
            setUnits(unitsRes.units || []);
        } catch {
            toast.error('Failed to add departments');
        } finally {
            setSavingUnit(false);
        }
    };

    const handleDeleteUnit = async (unitId: number) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Delete Department',
            message: 'Are you sure you want to delete this department? This will also remove all associated schedules and data. This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await apiClient(`/dps-schedule/${selectedSite.id}/units/${unitId}`, { method: 'DELETE', withAuth: true });
                    setUnits(prev => prev.filter(u => u.id !== unitId));
                    toast.success('Department deleted');
                } catch {
                    toast.error('Failed to delete department');
                } finally {
                    closeConfirmation();
                }
            }
        });
    };

    const openConfig = async (site: any) => {
        setConfigSite(site);
        try {
            const [confRes, empRes] = await Promise.all([
                apiClient<any>(`/dps-schedule/${site.id}/config`, { method: 'GET', withAuth: true }),
                apiClient<any>(`/organization/employees?status=active`, { method: 'GET', withAuth: true })
            ]);
            const config = confRes.config || { towers: [], areas: [] };
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

            if (config.towers) {
                config.towers = config.towers.map((t: any) => ({
                    ...t,
                    startDate: formatDate(t.startDate),
                    endDate: formatDate(t.endDate)
                }));
            }
            setSiteConfig(config);
            setEmployees(Array.isArray(empRes) ? empRes : (empRes?.employees || empRes?.data || []));
        } catch {
            toast.error('Failed to load configuration');
        }
        setConfigModalOpen(true);
    };

    const saveSiteConfigFn = async () => {
        if (!configSite || !siteConfig) return;
        setSavingConfig(true);
        try {
            const cleanTowers = (siteConfig.towers || []).map((t: any) => ({
                ...t,
                name: t.name?.trim() || '',
                startDate: t.startDate?.trim() || '',
                endDate: t.endDate?.trim() || ''
            }));
            const cleanAreas = (siteConfig.areas || []).map((a: any) => ({
                ...a,
                name: a.name?.trim() || '',
                subNames: (a.subNames || []).map((s: string) => s?.trim() || '')
            }));
            const cleanStaff = (siteConfig.staffList || []).map((s: any) => ({
                ...s,
                name: s.name?.trim() || ''
            }));
            const cleanLabor = (siteConfig.laborTypes || []).map((l: any) => ({
                ...l,
                name: l.name?.trim() || ''
            }));
            const cleanEquipments = (siteConfig.equipments || []).map((e: any) => ({
                ...e,
                name: e.name?.trim() || ''
            }));

            await apiClient(`/dps-schedule/${configSite.id}/config`, {
                method: 'POST',
                body: {
                    towers: cleanTowers,
                    areas: cleanAreas,
                    staffList: cleanStaff,
                    laborTypes: cleanLabor,
                    equipments: cleanEquipments,
                    cbd_assignees: siteConfig.cbd_assignees || [],
                    cbd_reviewers: siteConfig.cbd_reviewers || [],
                    planning_assignees: siteConfig.planning_assignees || [],
                    planning_reviewers: siteConfig.planning_reviewers || [],
                    material_responsible: siteConfig.material_responsible || [],
                    equipment_responsible: siteConfig.equipment_responsible || [],
                    totalConcretePlanned: siteConfig.totalConcretePlanned || 0,
                    concreteCumulativeTillDate: siteConfig.concreteCumulativeTillDate || 0
                },
                withAuth: true
            });
            toast.success('Configuration saved!');
            setConfigModalOpen(false);
        } catch {
            toast.error('Failed to save configuration');
        } finally {
            setSavingConfig(false);
        }
    };

    const filteredSites = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return sites;
        return sites.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.code?.toLowerCase().includes(q) ||
            s.city?.toLowerCase().includes(q)
        );
    }, [sites, searchQuery]);

    const stats = useMemo(() => ({
        totalSites: sites.length,
        activeSchedules: sites.filter(s => s.has_active_schedule).length,
        citiesCovered: new Set(sites.map(s => s.city).filter(Boolean)).size,
        pendingPlans: sites.filter(s => !s.has_active_schedule).length,
    }), [sites]);

    // ── Unit Selection View ──────────────────────────────────────────────────
    if (selectedSite) {
        return (
            <div className="max-w-7xl mx-auto p-5 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`${basePath}/schedule`)}
                        className="p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                        title="Back to sites"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">{selectedSite.name}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Each department plans one cycle at a time — usually a month. While a plan is active,
                            a daily report is generated for its assignees every day so progress is recorded
                            against that plan.
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => openConfig(selectedSite)}
                            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <Settings size={16} />
                            Site Config
                        </button>
                        <button
                            onClick={() => setMasterConfigOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 border border-orange-200 bg-orange-50 rounded text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                        >
                            <Globe size={16} />
                            Master Lists
                        </button>
                        <button
                            onClick={openAddUnit}
                            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                            Add Department
                        </button>
                    </div>
                </div>

                {/* Units Grid */}
                {unitsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-36 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                ) : units.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 rounded">
                        <Users className="w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-base font-bold text-gray-500 mb-1">No departments yet</h3>
                        <p className="text-sm text-gray-400 mb-6">Add a department to start planning DPR for this site</p>
                        <button
                            onClick={openAddUnit}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                            Add First Department
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {units.map(unit => (
                            <div key={unit.id} className="bg-white border border-gray-200 rounded p-5 flex flex-col gap-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                            {getDeptIcon(unit.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-900 text-sm">{unit.name}</p>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest ${unit.form_type === 'cbd' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {unit.form_type || 'planning'}
                                                </span>
                                                {unit.has_active_planning === 1 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest bg-green-100 text-green-700 border border-green-200">
                                                        Active Plan
                                                    </span>
                                                )}
                                                {unit.has_active_cbd === 1 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest bg-orange-100 text-orange-700 border border-orange-200">
                                                        Active CBD
                                                    </span>
                                                )}
                                                {(() => {
                                                    const nextStart = unit.form_type === 'cbd' ? unit.next_cbd_start : unit.next_planning_start;
                                                    if (!nextStart) return null;
                                                    return (
                                                        <span
                                                            title="A plan is prepared and will take over on its start date"
                                                            className="text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                        >
                                                            Next {new Date(nextStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">{unit.type}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteUnit(unit.id)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                {(() => {
                                    // "Create Plan" always starts a fresh cycle; opening the
                                    // running one is a separate action. The old single button
                                    // did both depending on state, so you could never tell
                                    // which one you were about to get.
                                    const hasPlan = unit.form_type === 'cbd'
                                        ? unit.has_active_cbd === 1
                                        : unit.has_active_planning === 1;
                                    return (
                                        <div className="flex flex-col gap-2">
                                            {hasPlan ? (
                                                <>
                                                    <button
                                                        onClick={() => router.push(planPath(selectedSite.id, unit))}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                                                    >
                                                        Open Active Plan
                                                        <ArrowRight size={14} />
                                                    </button>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={() => router.push(schedulesPath(selectedSite.id, unit))}
                                                            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded text-xs font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
                                                        >
                                                            <CalendarRange size={13} />
                                                            Schedules
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(planPath(selectedSite.id, unit, '&new=1'))}
                                                            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded text-xs font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
                                                        >
                                                            <Plus size={13} />
                                                            New Plan
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => router.push(planPath(selectedSite.id, unit, '&new=1'))}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                        Create Plan
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(schedulesPath(selectedSite.id, unit))}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
                                                    >
                                                        <CalendarRange size={14} />
                                                        Schedules
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Departments Picker */}
                {addUnitOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-3xl max-h-[88vh] flex flex-col border border-slate-200 shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Add Departments</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Every department in your organization is listed here. Tick the ones this site should plan DPR for.
                                    </p>
                                </div>
                                <button onClick={() => setAddUnitOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50/60">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={deptSearch}
                                        onChange={e => setDeptSearch(e.target.value)}
                                        placeholder="Search departments..."
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={toggleSelectAll}
                                    disabled={selectableDepartments.length === 0}
                                    className="px-3 py-2 border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 disabled:hover:border-slate-200 transition-colors whitespace-nowrap"
                                >
                                    {allVisibleSelected ? 'Clear all' : 'Select all'}
                                </button>
                                <span className="text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                                    {selectedCount} selected
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {deptLoading ? (
                                    <div className="p-6 space-y-2">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-slate-100 animate-pulse" />)}
                                    </div>
                                ) : visibleDepartments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <Users className="w-10 h-10 text-slate-200 mb-3" />
                                        <p className="text-sm font-semibold text-slate-500">No departments found</p>
                                        <p className="text-xs text-slate-400 mt-1">Add one below, or create it in Organization settings.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {visibleDepartments.map(dept => {
                                            const key = String(dept.id);
                                            const alreadyAdded = addedDeptNames.has((dept.name || '').trim().toLowerCase());
                                            const selection = selectedDepts[key];
                                            return (
                                                <div
                                                    key={key}
                                                    onClick={() => { if (!alreadyAdded) toggleDept(dept); }}
                                                    className={`px-6 py-3 flex items-center gap-4 transition-colors ${alreadyAdded
                                                        ? 'bg-slate-50/60 cursor-not-allowed'
                                                        : selection
                                                            ? 'bg-blue-50/50 cursor-pointer'
                                                            : 'hover:bg-slate-50 cursor-pointer'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${alreadyAdded
                                                        ? 'border-slate-200 bg-slate-100'
                                                        : selection
                                                            ? 'border-blue-600 bg-blue-600'
                                                            : 'border-slate-300 bg-white'
                                                        }`}>
                                                        {(selection || alreadyAdded) && (
                                                            <svg viewBox="0 0 12 12" className={`w-3 h-3 ${alreadyAdded ? 'text-slate-400' : 'text-white'}`} fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M2.5 6.5L5 9l4.5-5" strokeLinecap="square" />
                                                            </svg>
                                                        )}
                                                    </div>

                                                    <div className="p-1.5 bg-slate-100 text-slate-500 flex-shrink-0">
                                                        {getDeptIcon(dept.name)}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-900 truncate">{dept.name}</p>
                                                        {dept.description && (
                                                            <p className="text-xs text-slate-400 truncate mt-0.5">{dept.description}</p>
                                                        )}
                                                    </div>

                                                    {alreadyAdded ? (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-200 px-2 py-1 flex-shrink-0">
                                                            Added
                                                        </span>
                                                    ) : selection ? (
                                                        <div
                                                            onClick={e => e.stopPropagation()}
                                                            className="flex border border-slate-200 flex-shrink-0"
                                                        >
                                                            {(['planning', 'cbd'] as const).map(ft => (
                                                                <button
                                                                    key={ft}
                                                                    onClick={() => setDeptFormType(dept.id, ft)}
                                                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${selection.formType === ft
                                                                        ? 'bg-slate-900 text-white'
                                                                        : 'bg-white text-slate-400 hover:text-slate-700'
                                                                        }`}
                                                                >
                                                                    {ft}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Escape hatch for a department that only exists on this site */}
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or add a custom unit</p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={customUnitName}
                                        onChange={e => setCustomUnitName(e.target.value)}
                                        placeholder="e.g. Civil — Block A"
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors"
                                    />
                                    <select
                                        value={customUnitType}
                                        onChange={e => setCustomUnitType(e.target.value)}
                                        className="sm:w-44 px-3 py-2 bg-white border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors"
                                    >
                                        <option value="">Type...</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                    <div className="flex border border-slate-200">
                                        {(['planning', 'cbd'] as const).map(ft => (
                                            <button
                                                key={ft}
                                                onClick={() => setCustomUnitFormType(ft)}
                                                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${customUnitFormType === ft
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-white text-slate-400 hover:text-slate-700'
                                                    }`}
                                            >
                                                {ft}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Planning = date-wise & monthly targets · CBD = construction-based development
                                </p>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setAddUnitOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddUnits}
                                        disabled={savingUnit || (selectedCount === 0 && !customUnitName.trim())}
                                        className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors"
                                    >
                                        {savingUnit ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                                        Add {selectedCount + (customUnitName.trim() ? 1 : 0) || ''} Department{(selectedCount + (customUnitName.trim() ? 1 : 0)) === 1 ? '' : 's'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Site Config Modal */}
                {configModalOpen && (
                    <DpsConfigForm
                        siteName={configSite?.name}
                        siteConfig={siteConfig!}
                        setSiteConfig={setSiteConfig}
                        savingConfig={savingConfig}
                        onSave={saveSiteConfigFn}
                        onClose={() => setConfigModalOpen(false)}
                        employees={employees}
                    />
                )}

                {/* Master Config Modal */}
                {masterConfigOpen && (
                    <DpsMasterConfigForm
                        onClose={() => setMasterConfigOpen(false)}
                    />
                )}

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

    return (
        <div className="max-w-7xl mx-auto p-5 space-y-4">
            {/* Header */}
            <div className="bg-white rounded border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">DPR Planning</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Pick a site, then plan each department's daily targets.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Master lists are org-wide, so they belong here rather than
                            two levels down inside a single site's department view. */}
                        <button
                            onClick={() => setMasterConfigOpen(true)}
                            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm font-medium text-gray-600"
                            title="Staff roles, labour types and equipment shared across every site"
                        >
                            <Globe size={15} />
                            Master Lists
                        </button>
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm font-medium"
                        >
                            <Filter size={15} />
                            Filters
                            {filtersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                    </div>
                </div>
                {filtersExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search sites..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 w-full border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <button onClick={fetchSites} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors">Refresh</button>
                        <button onClick={() => setSearchQuery('')} className="px-4 py-1.5 border border-gray-300 text-gray-600 rounded text-sm font-medium hover:bg-gray-50 transition-colors">Clear</button>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Sites', value: stats.totalSites, icon: <Building className="w-5 h-5 text-violet-600" />, bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-900', sub: 'text-violet-600' },
                    { label: 'Active Plans', value: stats.activeSchedules, icon: <ClipboardCheck className="w-5 h-5 text-green-600" />, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-900', sub: 'text-green-600' },
                    { label: 'Cities', value: stats.citiesCovered, icon: <MapPin className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', sub: 'text-blue-600' },
                    { label: 'Pending Plans', value: stats.pendingPlans, icon: <LayoutDashboard className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', sub: 'text-amber-600' },
                ].map(card => (
                    <div key={card.label} className={`${card.bg} rounded px-3 py-2 text-sm border ${card.border}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-xs font-medium ${card.sub} uppercase tracking-wider`}>{card.label}</p>
                                <p className={`text-2xl font-bold ${card.text} mt-1`}>{card.value}</p>
                            </div>
                            <div className="p-2 bg-white rounded shadow-sm">{card.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Site Details</th>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-32 animate-pulse" /></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-16 animate-pulse" /></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24 animate-pulse" /></td>
                                    <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded w-20 animate-pulse" /></td>
                                    <td className="px-4 py-3"><div className="h-8 bg-gray-100 rounded w-28 animate-pulse" /></td>
                                </tr>
                            ))
                        ) : filteredSites.length > 0 ? filteredSites.map(site => (
                            <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Building className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">{site.name}</div>
                                            <div className="text-xs text-gray-400">ID: {site.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-700">{site.code || '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{site.city || '—'}</td>
                                <td className="px-4 py-3">
                                    {site.has_active_schedule
                                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase">
                                            Active {site.active_version ? `v${site.active_version}` : ''}
                                        </span>
                                        : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">No Plan</span>
                                    }
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openSiteUnits(site)}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                        >
                                            Plan DPR
                                            <ArrowRight size={13} />
                                        </button>
                                        <button
                                            onClick={() => openConfig(site)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 transition-colors"
                                            title="Site Configuration"
                                        >
                                            <Settings size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-20 text-center text-gray-400">
                                    <Building className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                                    <p className="text-sm font-medium">No sites match your filters</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Config Modal */}
            {configModalOpen && (
                <DpsConfigForm
                    siteName={configSite?.name}
                    siteConfig={siteConfig!}
                    setSiteConfig={setSiteConfig}
                    savingConfig={savingConfig}
                    onSave={saveSiteConfigFn}
                    onClose={() => setConfigModalOpen(false)}
                    employees={employees}
                />
            )}

            {/* Master Config Modal */}
            {masterConfigOpen && (
                <DpsMasterConfigForm
                    onClose={() => setMasterConfigOpen(false)}
                />
            )}

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

