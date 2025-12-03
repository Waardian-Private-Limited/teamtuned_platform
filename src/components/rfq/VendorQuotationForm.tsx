"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Save, Send, X, CheckCircle, XCircle, Upload, Trash2, Plus } from "lucide-react";
import { showSuccess, showError, showWarning } from "@/lib/toast";
import { apiClient } from "@/lib/apiClient";

interface RfqItem {
    id: number;
    item_id: number;
    item_name: string;
    item_code: string;
    uom: string;
    required_qty: number;
    specification: string;
}

interface QuotationItem {
    item_id: number;
    offered_qty: number;
    rate: number;
    discount: number;
    tax_percentage: number;
    tax_amount: number;
    total: number;
}

interface Attachment {
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
}

interface Charge {
    charge_name: string;
    charge_type: 'percentage' | 'fixed';
    percentage: number | null;
    amount: number;
}

export default function VendorQuotationForm() {
    const searchParams = useSearchParams();
    const params = useParams() as any;
    const tokenFromPath = params && typeof params.token === 'string' ? params.token : null;
    const tokenParam = searchParams?.get("token");
    const rawQuery = searchParams ? searchParams.toString() : "";
    const token = tokenFromPath || tokenParam || (rawQuery && !rawQuery.includes("=") ? rawQuery : null);

    const [loading, setLoading] = useState(true);
    const [rfq, setRfq] = useState<any>(null);
    const [vendor, setVendor] = useState<any>(null);
    const [responseStatus, setResponseStatus] = useState("");

    // Form fields
    const [quotationDate, setQuotationDate] = useState("");
    const [validTill, setValidTill] = useState("");
    const [deliveryDays, setDeliveryDays] = useState("");
    const [remarks, setRemarks] = useState("");
    const [submitterName, setSubmitterName] = useState("");
    const [submitterContact, setSubmitterContact] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [items, setItems] = useState<QuotationItem[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [charges, setCharges] = useState<Charge[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    const [submitted, setSubmitted] = useState(false);
    const [showReadonly, setShowReadonly] = useState(false);

    useEffect(() => {
        if (token) {
            fetchRfqData();
        } else {
            setLoading(false);
        }
    }, [token]);

    // Auto-populate quotation date to today
    useEffect(() => {
        if (!quotationDate) {
            const today = new Date().toISOString().split('T')[0];
            setQuotationDate(today);
        }
    }, []);

    const fetchRfqData = async () => {
        try {
            setLoading(true);

            const data = await apiClient<any>(`/rfq/vendor/${token}`, {
                method: "GET"
            });
            setRfq(data.rfq);
            setVendor(data.vendor);
            setResponseStatus(data.response_status);

            // Initialize items from RFQ
            const initialItems: QuotationItem[] = data.rfq.items.map((item: RfqItem) => ({
                item_id: item.item_id,
                offered_qty: item.required_qty,
                rate: 0,
                discount: 0,
                tax_percentage: 0,
                tax_amount: 0,
                total: 0,
            }));

            // If quotation exists, load it
            if (data.quotation && data.quotation.items) {
                const existingItems = data.quotation.items;
                existingItems.forEach((existing: any) => {
                    const index = initialItems.findIndex(i => i.item_id === existing.item_id);
                    if (index !== -1) {
                        initialItems[index] = existing;
                    }
                });

                setQuotationDate(data.quotation.quotation_date || "");
                setValidTill(data.quotation.valid_till || "");
                setDeliveryDays(data.quotation.delivery_days || "");
                setRemarks(data.quotation.remarks || "");
                setSubmitterName(data.quotation.submitter_name || "");
                setSubmitterContact(data.quotation.submitter_contact || "");
                setPaymentTerms(data.quotation.payment_terms || "");
                setAttachments(data.quotation.attachments || []);
                setCharges(data.quotation.charges || []);
            }

            setItems(initialItems);
            setSubmitted(data.response_status === 'submitted');
        } catch (err) {
            console.error("Failed to fetch RFQ:", err);
            showError("Failed to load RFQ data");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const calculateItemTotal = (item: QuotationItem) => {
        const subtotal = item.offered_qty * item.rate;
        const afterDiscount = subtotal - item.discount;
        const taxAmount = (afterDiscount * item.tax_percentage) / 100;
        return afterDiscount + taxAmount;
    };

    const handleItemChange = (index: number, field: keyof QuotationItem, value: number) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        // Recalculate tax amount and total
        const item = updatedItems[index];
        const subtotal = item.offered_qty * item.rate;
        const afterDiscount = subtotal - item.discount;
        item.tax_amount = (afterDiscount * item.tax_percentage) / 100;
        item.total = calculateItemTotal(item);

        setItems(updatedItems);
    };

    const getSubtotal = () => {
        return items.reduce((sum, item) => {
            const itemSubtotal = (item.offered_qty * item.rate) - item.discount;
            return sum + itemSubtotal;
        }, 0);
    };

    const getTaxTotal = () => {
        return items.reduce((sum, item) => sum + item.tax_amount, 0);
    };

    const getChargesTotal = () => {
        return charges.reduce((sum, charge) => sum + charge.amount, 0);
    };

    const getTotalValue = () => {
        return getSubtotal() + getTaxTotal() + getChargesTotal();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploadingFiles(true);
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/vendor-upload/${token}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setAttachments([...attachments, ...data.files]);
            showSuccess(`${files.length} file(s) uploaded successfully`);
        } catch (err) {
            console.error("File upload error:", err);
            showError("Failed to upload files");
        } finally {
            setUploadingFiles(false);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const addCharge = () => {
        setCharges([...charges, {
            charge_name: "",
            charge_type: 'fixed',
            percentage: null,
            amount: 0
        }]);
    };

    const removeCharge = (index: number) => {
        setCharges(charges.filter((_, i) => i !== index));
    };

    const handleChargeChange = (index: number, field: keyof Charge, value: any) => {
        const updatedCharges = [...charges];
        updatedCharges[index] = { ...updatedCharges[index], [field]: value };

        // If changing to percentage type, calculate amount from subtotal
        if (field === 'charge_type' && value === 'percentage') {
            const percentage = updatedCharges[index].percentage || 0;
            updatedCharges[index].amount = (getSubtotal() * percentage) / 100;
        }

        // If changing percentage value, recalculate amount
        if (field === 'percentage' && updatedCharges[index].charge_type === 'percentage') {
            updatedCharges[index].amount = (getSubtotal() * (value || 0)) / 100;
        }

        setCharges(updatedCharges);
    };

    const handleSaveDraft = async () => {
        if (!token) {
            showError("Invalid token");
            return;
        }

        try {
            setLoading(true);

            await apiClient(`/rfq/vendor/${token}/quote`, {
                method: "PUT",
                body: {
                    quotation_date: quotationDate,
                    valid_till: validTill,
                    delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
                    remarks,
                    submitter_name: submitterName,
                    submitter_contact: submitterContact,
                    payment_terms: paymentTerms,
                    items,
                    attachments,
                    charges
                },
            });

            showSuccess("Draft saved successfully");
            setResponseStatus('draft');
        } catch (err) {
            console.error("Failed to save draft:", err);
            showError("Failed to save draft");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!token) {
            showError("Invalid token");
            return;
        }

        // Validation
        const hasEmptyRates = items.some(item => !item.rate || item.rate <= 0);
        if (hasEmptyRates) {
            showError("Please enter rates for all items");
            return;
        }

        if (!submitterName || !submitterContact) {
            showError("Please provide submitter name and contact");
            return;
        }

        try {
            setLoading(true);

            await apiClient(`/rfq/vendor/${token}/quote`, {
                method: "POST",
                body: {
                    quotation_date: quotationDate,
                    valid_till: validTill,
                    delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
                    remarks,
                    submitter_name: submitterName,
                    submitter_contact: submitterContact,
                    payment_terms: paymentTerms,
                    items,
                    attachments,
                    charges
                },
            });

            showSuccess("Quotation submitted successfully");
            setSubmitted(true);
            setResponseStatus('submitted');
        } catch (err) {
            console.error("Failed to submit quotation:", err);
            showError("Failed to submit quotation");
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!token) {
            showError("Invalid token");
            return;
        }

        if (!confirm("Are you sure you want to decline this RFQ?")) {
            return;
        }

        try {
            setLoading(true);

            await apiClient(`/rfq/vendor/${token}/decline`, {
                method: "POST"
            });

            showSuccess("RFQ declined successfully");
            setResponseStatus('declined');
        } catch (err) {
            console.error("Failed to decline RFQ:", err);
            showError("Failed to decline RFQ");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading RFQ...</p>
                </div>
            </div>
        );
    }

    if (!rfq) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
                    <p className="text-gray-600">This RFQ link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    if ((submitted || responseStatus === 'submitted') && !showReadonly) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks for your response</h1>
                    <p className="text-gray-600">We are reviewing your quotation.</p>
                    <div className="mt-6">
                        <button
                            onClick={() => setShowReadonly(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            View Response
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (responseStatus === 'declined') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <XCircle size={64} className="text-gray-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">RFQ Declined</h1>
                    <p className="text-gray-600">You have declined this RFQ.</p>
                </div>
            </div>
        );
    }

    if ((submitted || responseStatus === 'submitted') && showReadonly) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Submitted Quotation</h2>
                            <span className="text-sm text-green-600 font-medium">Submitted</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Request for Quotation</h1>
                        <p className="text-lg text-gray-700">{rfq?.rfq_number}</p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Due Date:</span>{" "}
                                <span className="font-semibold text-gray-900">
                                    {rfq?.due_date ? formatDate(rfq.due_date) : "Not specified"}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Purpose:</span>{" "}
                                <span className="font-semibold text-gray-900">{rfq?.purpose || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Vendor Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{vendor?.vendor_name}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{vendor?.contact_person}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{vendor?.email}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{vendor?.phone || ""}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Quotation Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{quotationDate || ""}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Till</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{validTill || ""}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{deliveryDays || ""}</div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                            <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{remarks || ""}</div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Submitter Name</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{submitterName || ""}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Submitter Contact</label>
                                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{submitterContact || ""}</div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                            <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">{paymentTerms || ""}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Quotation Items</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offered Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rfq.items.map((rfqItem: RfqItem, index: number) => {
                                        const item = items[index];
                                        return (
                                            <tr key={rfqItem.item_id}>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">{rfqItem.item_name}</div>
                                                    <div className="text-xs text-gray-500">{rfqItem.item_code}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {rfqItem.required_qty} {rfqItem.uom}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item?.offered_qty ?? 0}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item?.rate ?? 0}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item?.discount ?? 0}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item?.tax_percentage ?? 0}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item?.total ?? 0}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Additional Charges</h2>
                        {charges.length === 0 ? (
                            <div className="text-sm text-gray-600">No additional charges</div>
                        ) : (
                            <div className="space-y-3">
                                {charges.map((c, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="text-sm text-gray-900">{c.charge_name}</div>
                                        <div className="text-sm text-gray-900">{c.charge_type}</div>
                                        <div className="text-sm text-gray-900">{c.percentage ?? '-'}</div>
                                        <div className="text-sm text-gray-900">{c.amount}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Attachments</h2>
                        {attachments.length === 0 ? (
                            <div className="text-sm text-gray-600">No attachments</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {attachments.map((a, idx) => (
                                    <a key={idx} href={a.file_url} target="_blank" rel="noreferrer" className="block p-3 border rounded-lg hover:bg-gray-50">
                                        <div className="text-sm font-medium text-gray-900">{a.file_name}</div>
                                        <div className="text-xs text-gray-500">{a.file_type} • {Math.round(a.file_size / 1024)} KB</div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Request for Quotation</h1>
                    <p className="text-lg text-gray-700">{rfq.rfq_number}</p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Due Date:</span>{" "}
                            <span className="font-semibold text-gray-900">
                                {rfq.due_date ? formatDate(rfq.due_date) : "Not specified"}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Purpose:</span>{" "}
                            <span className="font-semibold text-gray-900">{rfq.purpose || "N/A"}</span>
                        </div>
                    </div>
                </div>

                {/* Vendor Details */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Vendor Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                            <input
                                type="text"
                                value={vendor.vendor_name}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                            <input
                                type="text"
                                value={vendor.contact_person}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={vendor.email}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={vendor.phone || ""}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Submitter Information */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Submitter Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Submitter Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={submitterName}
                                onChange={(e) => setSubmitterName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Submitter Contact <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={submitterContact}
                                onChange={(e) => setSubmitterContact(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                placeholder="Phone or email"
                            />
                        </div>
                    </div>
                </div>

                {/* Quotation Details */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Quotation Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date</label>
                            <input
                                type="date"
                                value={quotationDate}
                                onChange={(e) => setQuotationDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Till</label>
                            <input
                                type="date"
                                value={validTill}
                                onChange={(e) => setValidTill(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days</label>
                            <input
                                type="number"
                                value={deliveryDays}
                                onChange={(e) => setDeliveryDays(e.target.value)}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="Number of days"
                            />
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Quotation Items</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offered Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {rfq.items.map((rfqItem: RfqItem, index: number) => {
                                    const item = items[index];
                                    return (
                                        <tr key={rfqItem.item_id}>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">{rfqItem.item_name}</div>
                                                <div className="text-xs text-gray-500">{rfqItem.item_code}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {rfqItem.required_qty} {rfqItem.uom}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.offered_qty}
                                                    onChange={(e) => handleItemChange(index, "offered_qty", parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, "rate", parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.discount}
                                                    onChange={(e) => handleItemChange(index, "discount", parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.tax_percentage}
                                                    onChange={(e) => handleItemChange(index, "tax_percentage", parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                                ₹{item.total.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Additional Charges */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Additional Charges</h2>
                        <button
                            onClick={addCharge}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Add Charge
                        </button>
                    </div>
                    {charges.length > 0 ? (
                        <div className="space-y-3">
                            {charges.map((charge, index) => (
                                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Charge Name</label>
                                        <input
                                            type="text"
                                            value={charge.charge_name}
                                            onChange={(e) => handleChargeChange(index, 'charge_name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            placeholder="e.g., Delivery Charges"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            value={charge.charge_type}
                                            onChange={(e) => handleChargeChange(index, 'charge_type', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        >
                                            <option value="fixed">Fixed</option>
                                            <option value="percentage">Percentage</option>
                                        </select>
                                    </div>
                                    {charge.charge_type === 'percentage' && (
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">%</label>
                                            <input
                                                type="number"
                                                value={charge.percentage || ''}
                                                onChange={(e) => handleChargeChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    )}
                                    <div className={charge.charge_type === 'percentage' ? "col-span-3" : "col-span-5"}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            value={charge.amount}
                                            onChange={(e) => handleChargeChange(index, 'amount', parseFloat(e.target.value) || 0)}
                                            min="0"
                                            step="0.01"
                                            disabled={charge.charge_type === 'percentage'}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-50"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <button
                                            onClick={() => removeCharge(index)}
                                            className="p-2 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No additional charges added</p>
                    )}
                </div>

                {/* Cost Summary */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Cost Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-semibold text-gray-900">₹{getSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Taxes:</span>
                            <span className="font-semibold text-gray-900">₹{getTaxTotal().toFixed(2)}</span>
                        </div>
                        {charges.length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Additional Charges:</span>
                                <span className="font-semibold text-gray-900">₹{getChargesTotal().toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex justify-between">
                                <span className="font-semibold text-gray-900">Total:</span>
                                <span className="font-bold text-lg text-gray-900">₹{getTotalValue().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Terms */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Payment Terms</h2>
                    <textarea
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Enter payment terms (e.g., Net 30, 50% advance, etc.)"
                    />
                </div>

                {/* Attachments */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Attachments</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                                    <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                    <p className="text-sm text-gray-600">
                                        {uploadingFiles ? "Uploading..." : "Click to upload files or drag and drop"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, PNG, JPG (max 5MB each)</p>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFiles}
                                        className="hidden"
                                    />
                                </div>
                            </label>
                        </div>
                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                {attachments.map((attachment, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {(attachment.file_size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeAttachment(index)}
                                            className="p-2 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Remarks */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Remarks</h2>
                    <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Any additional notes or remarks"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                    <button
                        onClick={handleDecline}
                        disabled={loading}
                        className="px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                    >
                        <X size={20} />
                        Decline RFQ
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        disabled={loading}
                        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={20} />
                        Save Draft
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        <Send size={20} />
                        Submit Quotation
                    </button>
                </div>
            </div>
        </div>
    );
}
