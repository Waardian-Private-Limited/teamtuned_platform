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
import { useRouter } from 'next/navigation';

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

    // Add Unit Modal
    const [addUnitOpen, setAddUnitOpen] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitType, setNewUnitType] = useState('');
    const [newUnitFormType, setNewUnitFormType] = useState<'planning' | 'cbd'>('planning');
    const [savingUnit, setSavingUnit] = useState(false);
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [deptLoading, setDeptLoading] = useState(false);

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

    useEffect(() => { fetchSites(); }, []);

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

    const openSiteUnits = async (site: any) => {
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

    const handleAddUnit = async () => {
        if (!newUnitName.trim() || !newUnitType || !newUnitFormType) {
            toast.error('Please fill in all fields');
            return;
        }
        setSavingUnit(true);
        try {
            await apiClient(`/dps-schedule/${selectedSite.id}/units`, {
                method: 'POST',
                body: { name: newUnitName.trim(), type: newUnitType, form_type: newUnitFormType },
                withAuth: true
            });
            toast.success('Department added!');
            setAddUnitOpen(false);
            setNewUnitName('');
            setNewUnitType('');
            setNewUnitFormType('planning');
            // Refresh units
            const res = await apiClient<any>(`/dps-schedule/${selectedSite.id}/units`, { method: 'GET', withAuth: true });
            setUnits(res.units || []);
        } catch {
            toast.error('Failed to add department');
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
                        onClick={() => setSelectedSite(null)}
                        className="p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">{selectedSite.name}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Select a department to plan DPR, or add a new one</p>
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
                            Master Config
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
                                                        Active Plan {unit.active_planning_version ? `v${unit.active_planning_version}` : ''}
                                                    </span>
                                                )}
                                                {unit.has_active_cbd === 1 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest bg-orange-100 text-orange-700 border border-orange-200">
                                                        Active CBD {unit.active_cbd_version ? `v${unit.active_cbd_version}` : ''}
                                                    </span>
                                                )}
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
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => router.push(`${basePath}/schedule/${selectedSite.id}?unitId=${unit.id}&unitName=${encodeURIComponent(unit.name)}&type=${unit.form_type || 'planning'}`)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                                    >
                                        Plan DPR
                                        <ArrowRight size={14} />
                                    </button>
                                    <button
                                        onClick={() => router.push(`${basePath}/planned-schedules/${selectedSite.id}?unitId=${unit.id}&unitName=${encodeURIComponent(unit.name)}&type=${unit.form_type || 'planning'}`)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded text-sm font-bold hover:bg-blue-50 transition-colors"
                                    >
                                        DPR Schedules
                                        <ClipboardCheck size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Unit Modal */}
                {addUnitOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-2 text-sm bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded w-full max-w-md shadow-2xl border border-gray-200">
                            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">Add Department</h3>
                                <button onClick={() => setAddUnitOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Department Name</label>
                                    <input
                                        type="text"
                                        value={newUnitName}
                                        onChange={e => setNewUnitName(e.target.value)}
                                        placeholder="e.g., Civil - Block A"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Department Type</label>
                                    <select
                                        value={newUnitType}
                                        onChange={e => setNewUnitType(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium bg-white"
                                    >
                                        <option value="">Select a type...</option>
                                        {deptLoading
                                            ? <option disabled>Loading departments...</option>
                                            : departments.map((d: { id: number; name: string }) => (
                                                <option key={d.id} value={d.name}>{d.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Form Format</label>
                                    <div className="flex gap-2 p-1 bg-gray-100 rounded">
                                        <button
                                            type="button"
                                            onClick={() => setNewUnitFormType('planning')}
                                            className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${newUnitFormType === 'planning' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Planning
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewUnitFormType('cbd')}
                                            className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${newUnitFormType === 'cbd' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            CBD
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 italic">
                                        {newUnitFormType === 'planning' ? 'Standard date-wise and monthly planning' : 'Construction-based development format'}
                                    </p>
                                </div>
                            </div>
                            <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3">
                                <button onClick={() => setAddUnitOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddUnit}
                                    disabled={savingUnit}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {savingUnit ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                                    Add Department
                                </button>
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
                        <h1 className="text-lg font-semibold text-gray-900">DPR Schedule Management</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Manage Daily Progress Reporting for all sites</p>
                    </div>
                    <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm font-medium"
                    >
                        <Filter size={15} />
                        Filters
                        {filtersExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
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

