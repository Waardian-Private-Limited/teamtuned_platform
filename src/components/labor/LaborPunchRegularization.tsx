"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { 
    Calendar, Clock, MapPin, RefreshCw, Search, Users, 
    User, Briefcase, Download, X, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { format, subDays } from "date-fns";

interface MissedPunchItem {
    summary_id: number;
    laborer_id: number;
    name: string;
    phone_number: string;
    contractor_name: string;
    category_name: string;
    subcategory_name: string;
    site_name: string;
    attendance_date: string;
    first_in_time: string;
    last_out_time: string | null;
    is_regularized: boolean | number;
    regularization_reason: string | null;
}

export default function LaborPunchRegularization() {
    const { role, permissions } = useAuth();
    
    // Default to T-1 (Yesterday)
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
    
    const [date, setDate] = useState(yesterdayStr);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<MissedPunchItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Filters
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>("null");
    
    // Modal State
    const [selectedItem, setSelectedItem] = useState<MissedPunchItem | null>(null);
    const [outTime, setOutTime] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchMissedPunches = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                date,
                search: searchQuery,
            };
            if (selectedSiteId !== "null") params.site_id = selectedSiteId;

            const res = await apiClient<any>("/labor/attendance/missed-punches", { params, withAuth: true });
            setItems(res.items || []);
        } catch (err) {
            console.error("Failed to fetch missed punches", err);
        } finally {
            setLoading(false);
        }
    }, [date, searchQuery, selectedSiteId]);

    useEffect(() => {
        fetchMissedPunches();
    }, [fetchMissedPunches]);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { withAuth: true });
                const list = res.sites || res.data || [];
                setSites(list);
            } catch (e) {}
        })();
    }, []);

    const handleRegularizeClick = (item: MissedPunchItem) => {
        setSelectedItem(item);
        // Default out time to In Time + 9 hours
        const inDate = new Date(item.first_in_time);
        const defaultOut = new Date(inDate.getTime() + 9 * 60 * 60 * 1000);
        
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const yyyy = defaultOut.getFullYear();
        const mm = String(defaultOut.getMonth() + 1).padStart(2, '0');
        const dd = String(defaultOut.getDate()).padStart(2, '0');
        const hh = String(defaultOut.getHours()).padStart(2, '0');
        const min = String(defaultOut.getMinutes()).padStart(2, '0');
        
        setOutTime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
        setReason("");
    };

    const handleSubmit = async () => {
        if (!selectedItem || !outTime) return;

        setSubmitting(true);
        try {
            await apiClient("/labor/attendance/regularize", {
                method: "POST",
                withAuth: true,
                body: {
                    summary_id: selectedItem.summary_id,
                    out_time: outTime,
                    reason
                }
            });
            setSelectedItem(null);
            fetchMissedPunches();
        } catch (err: any) {
            alert(err.message || "Failed to regularize punch");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTime = (ts: string) => {
        if (!ts) return "-";
        return new Date(ts).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-6 h-6 text-orange-600" />
                            Punch Regularization
                        </h1>
                        <p className="text-sm text-gray-500">Fix missed out-punches for laborers</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button 
                            onClick={fetchMissedPunches}
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search laborer name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="w-full md:w-64 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="null">All Sites</option>
                        {sites.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Laborer</th>
                                    <th className="px-6 py-4">Site / Contractor</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">In Time</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                                <span className="text-sm text-gray-500">Loading missed punches...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <CheckCircle2 className="w-12 h-12 text-green-400" />
                                                <p className="font-medium text-gray-900">No missed punches found</p>
                                                <p className="text-xs">All laborers for {format(new Date(date), "dd MMM yyyy")} have been punched out.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.summary_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {item.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 leading-none mb-1">{item.name}</p>
                                                        <p className="text-xs text-gray-500">{item.phone_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {item.site_name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-tight">
                                                        <Briefcase className="w-3 h-3" /> {item.contractor_name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase">
                                                    {item.category_name} {item.subcategory_name ? `/ ${item.subcategory_name}` : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    {formatDateTime(item.first_in_time)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleRegularizeClick(item)}
                                                    className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-shadow shadow-sm hover:shadow-md"
                                                >
                                                    Regularize
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Regularization Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Regularize Punch</h3>
                                <p className="text-xs text-orange-700 font-medium">{selectedItem.name}</p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">In Time</p>
                                    <p className="text-xs font-semibold text-gray-900">{formatDateTime(selectedItem.first_in_time)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Date</p>
                                    <p className="text-xs font-semibold text-gray-900">{format(new Date(selectedItem.attendance_date), "dd MMM yyyy")}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Out Time</label>
                                <input
                                    type="datetime-local"
                                    value={outTime}
                                    onChange={(e) => setOutTime(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Reason (Optional)</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter reason for regularization..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !outTime}
                                    className="flex-1 px-4 py-3 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
