"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { Loader2, Search, FileText, CheckCircle, XCircle, X, Shield } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { format } from "date-fns";

import { useAuth } from "@/context/AuthContext";
interface Request {
    id: number;
    employee_id: number;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
    department_name: string;
    requested_amount: string;
    approved_amount: string;
    repayment_months: number;
    reason: string;
    status: string;
    created_at: string;
}

export default function AccountsList() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    // Disbursement Form State
    const [paymentMode, setPaymentMode] = useState("transfer");
    const [transactionId, setTransactionId] = useState("");
    const [chequeNumber, setChequeNumber] = useState("");
    const [collectedBy, setCollectedBy] = useState("");
    const [disbursementDate, setDisbursementDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [attachment, setAttachment] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Permission state
    const [userRole, setUserRole] = useState<string | null>(null); const [checkingPerms, setCheckingPerms] = useState(true);

    const { role, permissions, employee } = useAuth();



    useEffect(() => {
        (async () => {
            try {
                // Session fetch removed (using useAuth)
                const session = { authenticated: true, role: role, employee: { permissions } };
                if (session?.authenticated) {
                    setUserRole(session.role);
                    // setPermissions(session.employee?.permissions || []);

                    if ((session.role || "").toLowerCase() === "orgadmin") {
                        setAccessDenied(false); // OrgAdmin always has access
                        setCheckingPerms(false);
                    }
                }
            } catch (_) { } finally {
                setCheckingPerms(false);
            }
        })();
    }, []);

    const isOrgAdmin = (userRole || "").toLowerCase() === "orgadmin";
    const canView = isOrgAdmin || permissions.includes("SALADV_PAY");
    // Disbursement requires SALADV_PAY specifically, but viewing the list might be allowed for both?
    // Actually the page is for disbursement. So maybe restrict actions if only POLICY?
    // For now, I'll block the whole page if neither.
    // If they have POLICY but not PAY, can they disburse? Probably not.
    // But the Sidebar check was OR. So I'll stick to OR for viewing.
    // I might want to block "Disburse" button if `!canPay`.

    const canPay = isOrgAdmin || permissions.includes("SALADV_PAY");

    const fetchRequests = async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const res = await apiClient<any>(`/salary-advance/disbursement-list?page=${page}&limit=20`, {
                method: "GET",
                withAuth: true,
            });
            setRequests(res.requests || []);
            setTotalPages(res.totalPages || 1);
        } catch (error: any) {
            console.error("Failed to fetch requests:", error);
            if (error?.message?.toLowerCase().includes("access denied") || error?.status === 403) {
                setAccessDenied(true);
            } else {
                showError("Failed to load requests");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!checkingPerms && canView) {
            fetchRequests();
        }
    }, [page, checkingPerms, canView]);

    const handleDisburseClick = (req: Request) => {
        if (!canPay) {
            showError("You do not have permission to disburse funds.");
            return;
        }
        setSelectedRequest(req);
        setPaymentMode("transfer");
        setTransactionId("");
        setChequeNumber("");
        setCollectedBy("");
        setDisbursementDate(format(new Date(), "yyyy-MM-dd"));
        setAttachment(null);
        setIsDisburseModalOpen(true);
    };

    const handleDisburseSubmit = async () => {
        if (!selectedRequest) return;

        setSubmitting(true);
        try {
            // Upload attachment if exists
            let attachmentPath = "";
            if (attachment) {
                const formData = new FormData();
                formData.append("file", attachment);
                const uploadRes = await apiClient<any>("/upload", {
                    method: "POST",
                    body: formData,
                    withAuth: true,
                });
                attachmentPath = uploadRes.url || uploadRes.path;
            }

            const payload = {
                payment_mode: paymentMode,
                transaction_id: transactionId,
                cheque_number: chequeNumber,
                collected_by: collectedBy,
                disbursement_date: disbursementDate,
                attachment: attachmentPath,
            };

            await apiClient(`/salary-advance/requests/${selectedRequest.id}/disburse`, {
                method: "POST",
                body: payload,
                withAuth: true,
            });

            showSuccess("Disbursed successfully");
            setIsDisburseModalOpen(false);
            fetchRequests();
        } catch (error) {
            console.error("Disbursement failed:", error);
            showError("Failed to disburse");
        } finally {
            setSubmitting(false);
        }
    };

    if (checkingPerms) return <div className="p-8 text-center text-gray-500">Checking access...</div>;

    if (!canView || accessDenied) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-gray-500">
                <Shield size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                <p className="mt-2">You do not have permission to view salary advance accounts.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Salary Advance Disbursement</h1>
                <button
                    onClick={fetchRequests}
                    disabled={loading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500">Employee</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Department</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Approved Amount</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Tenure</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Approved Date</th>
                                <th className="px-6 py-3 font-medium text-gray-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No requests ready for disbursement
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {req.first_name} {req.last_name}
                                                </div>
                                                <div className="text-xs text-gray-500">{req.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{req.department_name || "-"}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ₹{Number(req.approved_amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{req.repayment_months} Months</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(req.created_at), "MMM d, yyyy")}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                                                onClick={() => handleDisburseClick(req)}
                                            >
                                                Disburse
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <button
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span className="py-1.5 px-3 text-sm text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Disburse Modal */}
            {isDisburseModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Disburse Salary Advance</h2>
                            <button
                                onClick={() => setIsDisburseModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Employee:</span>
                                    <span className="font-medium text-gray-900">{selectedRequest.first_name} {selectedRequest.last_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Amount:</span>
                                    <span className="font-medium text-gray-900">₹{Number(selectedRequest.approved_amount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tenure:</span>
                                    <span className="font-medium text-gray-900">{selectedRequest.repayment_months} Months</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Disbursement Date</label>
                                <input
                                    type="date"
                                    value={disbursementDate}
                                    onChange={(e) => setDisbursementDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                                <select
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="transfer">Bank Transfer</option>
                                    <option value="upi">UPI</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>

                            {(paymentMode === "transfer" || paymentMode === "upi") && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Transaction ID / Reference</label>
                                    <input
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Enter transaction reference"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}

                            {paymentMode === "cheque" && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Cheque Number</label>
                                    <input
                                        value={chequeNumber}
                                        onChange={(e) => setChequeNumber(e.target.value)}
                                        placeholder="Enter cheque number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}

                            {paymentMode === "cash" && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Collected By</label>
                                    <input
                                        value={collectedBy}
                                        onChange={(e) => setCollectedBy(e.target.value)}
                                        placeholder="Name of person collecting cash"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={() => setIsDisburseModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisburseSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {submitting ? "Processing..." : "Confirm Disbursement"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
