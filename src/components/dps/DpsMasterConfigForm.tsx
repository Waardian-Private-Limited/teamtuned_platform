"use client";

import React, { useState, useEffect } from 'react';
import {
    X,
    Plus,
    Trash2,
    Save,
    RefreshCw,
    Users,
    HardHat,
    Wrench
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

interface Staff {
    name: string;
    required: number;
}

interface LaborType {
    name: string;
}

interface Equipment {
    name: string;
}

interface MasterConfig {
    staffList: Staff[];
    laborTypes: LaborType[];
    equipments: Equipment[];
}

interface DpsMasterConfigFormProps {
    onClose: () => void;
}

export function DpsMasterConfigForm({ onClose }: DpsMasterConfigFormProps) {
    const [config, setConfig] = useState<MasterConfig>({
        staffList: [],
        laborTypes: [],
        equipments: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMasterConfig();
    }, []);

    const fetchMasterConfig = async () => {
        setLoading(true);
        try {
            const res = await apiClient<any>('/dps-schedule/master-config', { method: 'GET', withAuth: true });
            if (res.config) {
                setConfig({
                    staffList: res.config.staffList || [],
                    laborTypes: res.config.laborTypes || [],
                    equipments: res.config.equipments || []
                });
            }
        } catch (error) {
            toast.error('Failed to load master configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient('/dps-schedule/master-config', {
                method: 'POST',
                body: config,
                withAuth: true
            });
            toast.success('Master configuration saved!');
            onClose();
        } catch (error) {
            toast.error('Failed to save master configuration');
        } finally {
            setSaving(false);
        }
    };

    const addStaff = () => setConfig({ ...config, staffList: [...config.staffList, { name: '', required: 1 }] });
    const updateStaff = (i: number, f: keyof Staff, v: any) => {
        const s = [...config.staffList];
        s[i] = { ...s[i], [f]: v };
        setConfig({ ...config, staffList: s });
    };
    const removeStaff = (i: number) => setConfig({ ...config, staffList: config.staffList.filter((_, idx) => idx !== i) });

    const addLaborType = () => setConfig({ ...config, laborTypes: [...config.laborTypes, { name: '' }] });
    const updateLaborType = (i: number, v: string) => {
        const l = [...config.laborTypes];
        l[i].name = v;
        setConfig({ ...config, laborTypes: l });
    };
    const removeLaborType = (i: number) => setConfig({ ...config, laborTypes: config.laborTypes.filter((_, idx) => idx !== i) });

    const addEquipment = () => setConfig({ ...config, equipments: [...config.equipments, { name: '' }] });
    const updateEquipment = (i: number, v: string) => {
        const e = [...config.equipments];
        e[i].name = v;
        setConfig({ ...config, equipments: e });
    };
    const removeEquipment = (i: number) => setConfig({ ...config, equipments: config.equipments.filter((_, idx) => idx !== i) });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-2 text-sm bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/30">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Master Configuration</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Define global staff roles, labor types, and equipments</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                            <p className="text-sm text-gray-500">Loading master config...</p>
                        </div>
                    ) : (
                        <>
                            {/* Staff List */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-orange-600" />
                                        <h4 className="font-bold text-gray-800">Master Staff Roles</h4>
                                    </div>
                                    <button onClick={addStaff} className="flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded text-xs font-bold transition-all">
                                        <Plus size={13} /> Add Role
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {config.staffList.map((staff, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-100">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={staff.name}
                                                    onChange={e => updateStaff(idx, 'name', e.target.value)}
                                                    placeholder="e.g. Site Engineer"
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:border-orange-400 outline-none"
                                                />
                                            </div>
                                            <div className="w-20">
                                                <input
                                                    type="number"
                                                    value={staff.required}
                                                    onChange={e => updateStaff(idx, 'required', parseInt(e.target.value) || 0)}
                                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-center"
                                                />
                                            </div>
                                            <button onClick={() => removeStaff(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Labor Types */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <div className="flex items-center gap-2">
                                        <HardHat size={16} className="text-amber-600" />
                                        <h4 className="font-bold text-gray-800">Master Labor Types</h4>
                                    </div>
                                    <button onClick={addLaborType} className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-xs font-bold transition-all">
                                        <Plus size={13} /> Add Labor
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {config.laborTypes.map((labor, idx) => (
                                        <div key={idx} className="relative group">
                                            <input
                                                type="text"
                                                value={labor.name}
                                                onChange={e => updateLaborType(idx, e.target.value)}
                                                placeholder="Mason, Helper..."
                                                className="w-full pl-3 pr-8 py-1.5 border border-gray-200 rounded text-sm focus:border-amber-400 outline-none"
                                            />
                                            <button onClick={() => removeLaborType(idx)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Equipments */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Wrench size={16} className="text-blue-600" />
                                        <h4 className="font-bold text-gray-800">Master Equipments</h4>
                                    </div>
                                    <button onClick={addEquipment} className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition-all">
                                        <Plus size={13} /> Add Equipment
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {config.equipments.map((eq, idx) => (
                                        <div key={idx} className="relative group">
                                            <input
                                                type="text"
                                                value={eq.name}
                                                onChange={e => updateEquipment(idx, e.target.value)}
                                                placeholder="Concrete Pump, JW..."
                                                className="w-full pl-3 pr-8 py-1.5 border border-gray-200 rounded text-sm focus:border-blue-400 outline-none"
                                            />
                                            <button onClick={() => removeEquipment(idx)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50/30">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                        Save Master Config
                    </button>
                </div>
            </div>
        </div>
    );
}
