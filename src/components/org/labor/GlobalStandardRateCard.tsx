"use client";

import React, { useState, useEffect } from "react";
import { Save, Loader2, Globe, ChevronDown, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Category, Subcategory, RateRow, StandardRate } from "@/types/labor";

interface GlobalStandardRateCardProps {
    categories: Category[];
    subcategories: Subcategory[];
}

export default function GlobalStandardRateCard({ categories, subcategories }: GlobalStandardRateCardProps) {
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true); // Default open
    const [rows, setRows] = useState<RateRow[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [standardRates, setStandardRates] = useState<StandardRate[]>([]);

    useEffect(() => {
        if (expanded) {
            fetchStandardRates();
        }
    }, [expanded]);

    // Build Rows
    useEffect(() => {
        if (categories.length > 0) {
            const newRows: RateRow[] = [];
            categories.forEach(cat => {
                newRows.push(buildRow(cat, null));
                const catSubcats = subcategories.filter(sc => sc.category_id === cat.id);
                catSubcats.forEach(sub => {
                    newRows.push(buildRow(cat, sub));
                });
            });
            setRows(newRows);
        }
    }, [standardRates, categories, subcategories]);

    const fetchStandardRates = async () => {
        setLoading(true);
        try {
            const res = await apiClient<{ rates: StandardRate[] }>("/labor/rates/standard", { method: "GET" });
            if (res.rates) {
                setStandardRates(res.rates);
            }
        } catch (error) {
            console.error("Error fetching standard rates", error);
        } finally {
            setLoading(false);
        }
    };

    const buildRow = (cat: Category, sub: Subcategory | null): RateRow => {
        const existing = standardRates.find(r =>
            r.category_id === cat.id &&
            (sub ? r.subcategory_id === sub.id : !r.subcategory_id)
        );

        return {
            key: `${cat.id}-${sub ? sub.id : 'gen'}`,
            category_id: cat.id,
            subcategory_id: sub ? sub.id : null,
            category_name: cat.name,
            subcategory_name: sub ? sub.name : undefined,
            day_rate: existing ? existing.day_rate : "",
            night_rate: existing ? existing.night_rate : "",
            notes: ""
        };
    };

    const handleRateChange = (index: number, field: keyof RateRow, value: any) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: value };
        setRows(newRows);
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const ratesToSave = rows.filter(row => row.day_rate || row.night_rate).map(row => ({
            category_id: row.category_id,
            subcategory_id: row.subcategory_id,
            day_rate: row.day_rate || 0,
            night_rate: row.night_rate || 0,
            effective_from: new Date().toISOString().split('T')[0],
            effective_to: null
        }));

        if (ratesToSave.length === 0) {
            alert("No rates entered to save.");
            return;
        }

        setSubmitting(true);
        try {
            await apiClient("/labor/rates/standard/bulk", {
                method: "POST",
                body: JSON.stringify({ rates: ratesToSave })
            });
            alert("Global standard rates saved successfully!");
            fetchStandardRates();
        } catch (error) {
            console.error("Error saving standard rates", error);
            alert("Failed to save standard rates");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 border-l-4 border-l-black">
            <div
                className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                    <div className="p-2 bg-gray-200 rounded-lg">
                        <Globe size={18} className="text-gray-700" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Global Standard Rates</h3>
                        <p className="text-xs text-gray-500">Default rates for the organization</p>
                    </div>
                </div>
                {expanded && (
                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        Save Global Rates
                    </button>
                )}
            </div>

            {expanded && (
                <div className="border-t border-gray-200">
                    {loading ? (
                        <div className="p-8 flex justify-center text-gray-400">
                            <Loader2 className="animate-spin" size={24} />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Category / Subcategory</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[150px]">Day Rate (₹)</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[150px]">Night Rate (₹)</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {rows.map((row, idx) => (
                                    <tr key={row.key} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-medium text-gray-900">{row.category_name}</div>
                                            {row.subcategory_name && (
                                                <div className="text-gray-500 text-xs mt-0.5 ml-2">• {row.subcategory_name}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {row.subcategory_id ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="w-full h-8 px-2 rounded border border-gray-300 focus:ring-black focus:border-black text-sm"
                                                    value={row.day_rate}
                                                    onChange={(e) => handleRateChange(idx, 'day_rate', e.target.value)}
                                                />
                                            ) : (
                                                <span className="text-gray-300 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {row.subcategory_id ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="w-full h-8 px-2 rounded border border-gray-300 focus:ring-black focus:border-black text-sm"
                                                    value={row.night_rate}
                                                    onChange={(e) => handleRateChange(idx, 'night_rate', e.target.value)}
                                                />
                                            ) : (
                                                <span className="text-gray-300 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {row.subcategory_id ? (
                                                standardRates.some(r => r.category_id === row.category_id && r.subcategory_id === row.subcategory_id) ? (
                                                    <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                                                ) : (
                                                    <span className="text-gray-400">Not Set</span>
                                                )
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
