"use client";

import React, { useState, useEffect } from "react";
import { Save, Loader2, ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Category, Subcategory, RateRow, Contractor } from "@/types/labor";

interface ContractorStandardRateCardProps {
    contractor: Contractor;
    subcategories: Subcategory[];
}

export default function ContractorStandardRateCard({ contractor, subcategories }: ContractorStandardRateCardProps) {
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [rows, setRows] = useState<RateRow[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [contractorRates, setContractorRates] = useState<any[]>([]);
    const [validItems, setValidItems] = useState<{ category_id: number; subcategory_id: number | null; category_name: string; subcategory_name?: string }[]>([]);

    useEffect(() => {
        if (expanded) {
            fetchData();
        }
    }, [expanded]);

    // Build rows from validItems
    useEffect(() => {
        const buildRows = () => {
            if (validItems.length === 0) {
                setRows([]);
                return;
            }

            const activeRows: RateRow[] = validItems.map(item => {
                const existing = contractorRates.find(r =>
                    r.category_id === item.category_id &&
                    (item.subcategory_id ? r.subcategory_id === item.subcategory_id : !r.subcategory_id)
                );

                // Lookup names from global props if possible, or use fallback
                const globalSub = subcategories.find(s => s.id === item.subcategory_id);
                // We don't have global categories prop, but we can try to find category name from proper source
                // For now use the name we stored in validItems (which I will add).

                return {
                    key: `${item.category_id}-${item.subcategory_id || 'gen'}`,
                    category_id: item.category_id,
                    subcategory_id: item.subcategory_id,
                    category_name: item.category_name || "Unknown",
                    subcategory_name: globalSub ? globalSub.name : item.subcategory_name,
                    day_rate: existing ? existing.day_rate : "",
                    night_rate: existing ? existing.night_rate : "",
                    notes: ""
                };
            });

            // Sort
            activeRows.sort((a, b) => {
                const catCompare = a.category_name.localeCompare(b.category_name);
                if (catCompare !== 0) return catCompare;
                // Subcategories: null first (General), then by name
                if (!a.subcategory_name && b.subcategory_name) return -1;
                if (a.subcategory_name && !b.subcategory_name) return 1;
                if (!a.subcategory_name && !b.subcategory_name) return 0;
                return (a.subcategory_name || "").localeCompare(b.subcategory_name || "");
            });

            setRows(activeRows);
        };

        buildRows();
    }, [validItems, contractorRates, subcategories]);


    const fetchData = async () => {
        setLoading(true);
        try {
            const detailsRes = await apiClient<{ contractor: any }>(`/labor/contractors/${contractor.id}`, { method: "GET" });

            if (detailsRes.contractor) {
                const c = detailsRes.contractor;
                const uniqueKeys = new Set<string>();
                const items: { category_id: number; subcategory_id: number | null; category_name: string; subcategory_name?: string }[] = [];
                const standardRatesList: any[] = [];

                const addItem = (catId: number, subId: number | null, catName: string, subName?: string) => {
                    const key = `${catId}-${subId || 'null'}`;
                    if (!uniqueKeys.has(key)) {
                        uniqueKeys.add(key);
                        items.push({
                            category_id: catId,
                            subcategory_id: subId,
                            category_name: catName,
                            subcategory_name: subName
                        });
                    }
                };

                // 1. Process explicit Category Links
                if (c.categories && Array.isArray(c.categories)) {
                    c.categories.forEach((catLink: any) => {
                        const catId = Number(catLink.category_id);
                        if (catId) {
                            const subId = catLink.subcategory_id ? Number(catLink.subcategory_id) : null;
                            addItem(catId, subId, catLink.category_name, catLink.subcategory_name);
                        }
                    });
                }

                // 2. Process Existing Rates (Standard Rates only)
                if (c.category_rates && Array.isArray(c.category_rates)) {
                    c.category_rates.forEach((rate: any) => {
                        if (!rate.site_id) { // Only standard rates
                            standardRatesList.push(rate);
                            const catId = Number(rate.category_id);
                            if (catId) {
                                const subId = rate.subcategory_id ? Number(rate.subcategory_id) : null;
                                addItem(catId, subId, rate.category_name, rate.subcategory_name);
                            }
                        }
                    });
                }

                setContractorRates(standardRatesList);
                setValidItems(items);
            }
        } catch (error) {
            console.error(`Error fetching data for ${contractor.name}`, error);
        } finally {
            setLoading(false);
        }
    };

    const buildRow = (cat: Category, sub: Subcategory | null): RateRow => {
        const existing = contractorRates.find(r =>
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
            await apiClient(`/labor/contractors/${contractor.id}/rates/bulk`, {
                method: "POST",
                body: { rates: ratesToSave }
            });
            alert(`${contractor.name} rates saved!`);
            fetchData(); // Refresh to get ensuring consistency
        } catch (error) {
            console.error("Error saving rates", error);
            alert("Failed to save rates");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
            <div
                className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                    <div>
                        <h3 className="font-semibold text-gray-900">{contractor.name}</h3>
                        <p className="text-xs text-gray-500">Click to view/edit rates</p>
                    </div>
                </div>
                {expanded && (
                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        Save Rates
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
                                {rows.length > 0 ? (
                                    rows.map((row, idx) => (
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
                                                    contractorRates.some(r => r.category_id === row.category_id && r.subcategory_id === row.subcategory_id) ? (
                                                        <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                                                    ) : (
                                                        <span className="text-gray-400">Not Set</span>
                                                    )
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <DollarSign size={24} className="text-gray-300" />
                                                <p>No categories linked to this contractor.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
