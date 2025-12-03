"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { Search, Plus, Filter, Eye, Edit, Send, X, CheckCircle, XCircle, FileText, Trophy } from "lucide-react";
import PrStatusBadge from "./PrStatusBadge";
import PrPriorityBadge from "./PrPriorityBadge";

interface PurchaseRequest {
    id: number;
    pr_number: string;
    status: string;
    priority: string;
    total_estimated_amount: number;
    store_name: string;
    site_name: string;
    requester_first_name: string;
    requester_last_name: string;
    created_at: string;
    expected_delivery?: string;
    restock_mode?: string;
    quotation_id?: number | null;
    rfq_id?: number | null;
    attachments_count?: number;
    computed_rfq_id?: number | null;
}

export default function PrList() {
    const router = useRouter();
    const [prs, setPrs] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [myPrsOnly, setMyPrsOnly] = useState(false);

    const fetchPrs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });

            if (search) params.append("search", search);
            if (statusFilter) params.append("status", statusFilter);
            if (priorityFilter) params.append("priority", priorityFilter);
            if (myPrsOnly) params.append("my_prs", "true");

            const res = await apiClient<{
                prs: PurchaseRequest[];
                pagination: { page: number; total: number; totalPages: number };
            }>(`/pr?${params.toString()}`, { method: "GET", withAuth: true });

            setPrs(res?.prs || []);
            setTotal(res?.pagination?.total || 0);
            setTotalPages(res?.pagination?.totalPages || 1);
        } catch (err) {
            console.error("Failed to fetch PRs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrs();
    }, [page, statusFilter, priorityFilter, myPrsOnly]);

    const handleSearch = () => {
        setPage(1);
        fetchPrs();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Purchase Requests</h1>
                <button
                    onClick={() => router.push(window.location.pathname.includes("org-admin") ? "/org-admin/pr/new" : "/employee/pr/new")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create PR
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search PR#, purpose, vendor..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="converted">Converted</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>

                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={myPrsOnly}
                            onChange={(e) => setMyPrsOnly(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">My PRs Only</span>
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : prs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No purchase requests found</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PR</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site/Store</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {prs.map((pr) => (
                                        <tr key={pr.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{pr.pr_number}</div>
                                                <div className="text-xs text-gray-500">{formatDate(pr.created_at)}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">{pr.site_name || "N/A"}</div>
                                                <div className="text-xs text-gray-500">{pr.store_name}</div>
                                                {pr.expected_delivery && (
                                                    <div className="text-xs text-gray-500">Due: {new Date(pr.expected_delivery).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</div>
                                                )}
                                                {pr.restock_mode && (
                                                    <div className="text-xs text-gray-500">Mode: {pr.restock_mode.replace("_", " ")}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    {pr.attachments_count && pr.attachments_count > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                            <FileText size={14} /> {pr.attachments_count}
                                                        </span>
                                                    ) : null}
                                                    {(pr.rfq_id || pr.computed_rfq_id) ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200">RFQ</span>
                                                    ) : null}
                                                    {pr.quotation_id ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200">Quotation</span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <PrPriorityBadge priority={pr.priority} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(pr.total_estimated_amount)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <PrStatusBadge status={pr.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(pr.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => router.push(`${window.location.pathname}/${pr.id}`)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="View PR"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {(pr.rfq_id || pr.computed_rfq_id) ? (
                                                        <button
                                                            onClick={() => {
                                                                const base = window.location.pathname.includes("org-admin") ? "/org-admin" : "/employee";
                                                                const id = pr.rfq_id || pr.computed_rfq_id;
                                                                router.push(`${base}/rfq/${id}`);
                                                            }}
                                                            className="text-amber-600 hover:text-amber-800"
                                                            title="Open RFQ"
                                                        >
                                                            <FileText size={18} />
                                                        </button>
                                                    ) : null}
                                                    {(pr.rfq_id || pr.computed_rfq_id) ? (
                                                        <button
                                                            onClick={() => {
                                                                const base = window.location.pathname.includes("org-admin") ? "/org-admin" : "/employee";
                                                                const id = pr.rfq_id || pr.computed_rfq_id;
                                                                router.push(`${base}/rfq/${id}/comparison`);
                                                            }}
                                                            className="text-green-600 hover:text-green-800"
                                                            title="View Comparison"
                                                        >
                                                            <Trophy size={18} />
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing {prs.length} of {total} results
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
