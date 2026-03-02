"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useInventoryStore } from "../inventory/InventoryStoreContext";
import { Plus, Trash2, Save, Send, Upload, X, Link2, XCircle, FileText } from "lucide-react";
import ItemSearchModal from "../inventory/grn/ItemSearchModal";
import VendorSearchModal from "./VendorSearchModal";
import { showSuccess, showError, showWarning } from "@/lib/toast";

interface PrItem {
    item_id: number;
    item_name?: string;
    item_code?: string;
    description: string;
    uom: string;
    qty_requested: number;
    estimated_rate: number;
    tax_percentage: number;
    tax_amount: number;
    estimated_amount: number;
    source?: 'manual' | 'quotation' | 'vendor_price_list';
    quotation_item_id?: number | null;
    vendor_id?: number | null;
    vendor_rate?: number | null;
    remarks?: string;
    is_batch_tracked: boolean;
    is_serial_tracked: boolean;
}

interface Quotation {
    id: number;
    rfq_number: string;
    vendor_name: string;
    quotation_date: string;
    total_value: number;
}

interface Attachment {
    id?: number;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
}

interface Site {
    id: number;
    site_name: string;
}

interface Vendor {
    id: number;
    vendor_name: string;
}

export default function PrForm() {
    const router = useRouter();
    const { selectedStore } = useInventoryStore();

    const [sites, setSites] = useState<Site[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [showRfqModal, setShowRfqModal] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

    // Form fields
    const [siteId, setSiteId] = useState<number | null>(null);
    const [purpose, setPurpose] = useState("");
    const [preferredVendorId, setPreferredVendorId] = useState<number | null>(null);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [priority, setPriority] = useState("normal");
    const [expectedDelivery, setExpectedDelivery] = useState("");
    const [restockMode, setRestockMode] = useState("main_warehouse");
    const [linkingActive, setLinkingActive] = useState(false);
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
    const [rfqComparisons, setRfqComparisons] = useState<any | null>(null);
    const [selectedQuotationIds, setSelectedQuotationIds] = useState<number[]>([]);
    const [winnerQuotationId, setWinnerQuotationId] = useState<number | null>(null);
    const [winnerVendorId, setWinnerVendorId] = useState<number | null>(null);
    const [items, setItems] = useState<PrItem[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [linkedQuotation, setLinkedQuotation] = useState<Quotation | null>(null);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    useEffect(() => {
        fetchSites();
        fetchQuotations();
    }, []);

    const fetchSites = async () => {
        try {
            const res = await apiClient<{ sites: Site[] }>("/sites", {
                method: "GET",
                withAuth: true,
            });
            setSites(res?.sites || []);
        } catch (err) {
            console.error("Failed to fetch sites:", err);
        }
    };

    const fetchQuotations = async () => {
        try {
            // Fetch submitted/approved quotations
            const res = await apiClient<any>("/rfq/vendor-quotations?status=submitted", {
                method: "GET",
                withAuth: true,
            });

            if (res?.quotations) {
                const formattedQuotations: Quotation[] = res.quotations.map((q: any) => ({
                    id: q.id,
                    rfq_number: q.rfq_number || `Q-${q.id}`,
                    vendor_name: q.vendor_name || 'Unknown Vendor',
                    quotation_date: q.quotation_date || q.created_at,
                    total_value: Number(q.total_value || 0)
                }));
                setQuotations(formattedQuotations);
            }
        } catch (err) {
            console.error("Failed to fetch quotations:", err);
        }
    };

    const fetchRfqs = async () => {
        try {
            const res = await apiClient<any>("/rfq", { method: "GET", withAuth: true });
            setRfqs(res?.rfqs || []);
        } catch (err) {
            console.error("Failed to fetch RFQs:", err);
        }
    };

    const fetchRfqComparison = async (rfqId: number) => {
        try {
            const res = await apiClient<any>(`/rfq/${rfqId}/comparison`, { method: "GET", withAuth: true });
            setRfqComparisons(res || null);
        } catch (err) {
            console.error("Failed to fetch RFQ comparison:", err);
        }
    };

    useEffect(() => {
        if (showRfqModal && rfqs.length === 0) fetchRfqs();
    }, [showRfqModal]);

    const handleSelectVendor = (vendor: Vendor) => {
        if (currentItemIndex !== null) {
            // Assigning vendor to specific item
            updateItem(currentItemIndex, "vendor_id", vendor.id);
            setCurrentItemIndex(null);
        } else {
            // Setting preferred vendor for PR
            setSelectedVendor(vendor);
            setPreferredVendorId(vendor.id);
        }
        setShowVendorModal(false);
    };

    const handleSelectItem = (item: any) => {
        // Check if item already exists
        if (items.some((i) => i.item_id === item.id)) {
            showError("Item already added");
            return;
        }

        const newItem: PrItem = {
            item_id: item.id,
            item_name: item.item_name,
            item_code: item.item_code,
            description: "",
            uom: item.uom || "",
            qty_requested: 1,
            estimated_rate: 0,
            tax_percentage: 0,
            tax_amount: 0,
            estimated_amount: 0,
            is_batch_tracked: item.is_batch_tracked || false,
            is_serial_tracked: item.is_serial_tracked || false,
        };

        setItems([...items, newItem]);
        setShowItemModal(false);
    };

    const handleLinkQuotation = async (quotation: Quotation) => {
        try {
            setLoading(true);

            // Fetch full quotation details with items
            const res = await apiClient<any>(`/rfq/vendor-quotations/${quotation.id}`, {
                method: "GET",
                withAuth: true,
            });

            if (res?.quotation && res.quotation.items) {
                // Auto-populate items from quotation
                const quotationItems: PrItem[] = res.quotation.items.map((qItem: any) => ({
                    item_id: qItem.item_id,
                    item_name: qItem.item_name,
                    item_code: qItem.item_code,
                    description: qItem.specification || "",
                    uom: qItem.uom || "",
                    qty_requested: Number(qItem.offered_qty || 0),
                    estimated_rate: Number(qItem.rate || 0),
                    tax_percentage: Number(qItem.tax_percentage || 0),
                    tax_amount: Number(qItem.tax_amount || 0),
                    estimated_amount: Number(qItem.total || 0),
                    source: 'quotation',
                    quotation_item_id: qItem.id,
                    vendor_id: res.quotation.vendor_id || null,
                    vendor_rate: Number(qItem.rate || 0),
                    remarks: "",
                    is_batch_tracked: qItem.is_batch_tracked || false,
                    is_serial_tracked: qItem.is_serial_tracked || false,
                }));

                setItems(quotationItems);
                setLinkedQuotation(quotation);
                setShowQuotationModal(false);
                showSuccess("Quotation linked successfully. Items auto-populated.");
            }
        } catch (err) {
            console.error("Failed to link quotation:", err);
            showError("Failed to link quotation");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveQuotation = () => {
        setLinkedQuotation(null);
        setLinkingActive(false);
        setSelectedRfqId(null);
        setSelectedQuotationIds([]);
        setWinnerQuotationId(null);
        // Convert all items to manual source
        const updatedItems = items.map(item => ({
            ...item,
            source: 'manual' as const,
            quotation_item_id: null
        }));
        setItems(updatedItems);
        showWarning("Quotation unlinked. Items converted to manual mode.");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (files.length > 10) {
            showError("Maximum 10 files allowed");
            return;
        }

        try {
            setUploadingFiles(true);
            const formData = new FormData();

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    showError(`File ${file.name} exceeds 5MB limit`);
                    continue;
                }
                formData.append('files', file);
            }

            const response = await apiClient<any>('/files/org-upload/pr_attachments', {
                method: 'POST',
                withAuth: true,
                body: formData
            });

            const uploadedFiles: Attachment[] = (response.files || []).map((f: any) => ({
                file_name: f.originalname || f.file_name,
                file_url: f.location || f.file_url,
                file_type: f.mimetype || f.file_type,
                file_size: f.size || f.file_size
            }));

            setAttachments([...attachments, ...uploadedFiles]);
            showSuccess(`${uploadedFiles.length} file(s) uploaded successfully`);
        } catch (err) {
            console.error("File upload error:", err);
            showError("Failed to upload files");
        } finally {
            setUploadingFiles(false);
            // Reset input
            e.target.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof PrItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        // Recalculate amounts
        const item = updatedItems[index];
        const rate = Number(item.estimated_rate || 0);
        const qty = Number(item.qty_requested || 0);
        const taxPct = Number(item.tax_percentage || 0);

        const baseAmount = rate * qty;
        const taxAmount = (baseAmount * taxPct) / 100;
        const totalAmount = baseAmount + taxAmount;

        updatedItems[index].tax_amount = taxAmount;
        updatedItems[index].estimated_amount = totalAmount;

        setItems(updatedItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let total = 0;

        items.forEach((item) => {
            const baseAmount = Number(item.estimated_rate || 0) * Number(item.qty_requested || 0);
            subtotal += baseAmount;
            totalTax += Number(item.tax_amount || 0);
            total += Number(item.estimated_amount || 0);
        });

        return { subtotal, totalTax, total };
    };

    const handleSaveDraft = async () => {
        if (!selectedStore) {
            showError("Please select a store first");
            return;
        }

        if (items.length === 0) {
            showError("Please add at least one item");
            return;
        }

        try {
            setLoading(true);
            await apiClient("/pr", {
                method: "POST",
                withAuth: true,
                body: {
                    site_id: siteId,
                    store_id: selectedStore.id,
                    purpose,
                    preferred_vendor_id: preferredVendorId,
                    priority,
                    expected_delivery: expectedDelivery || null,
                    restock_mode: restockMode,
                    quotation_id: linkedQuotation?.id || null,
                    items: items.map((item) => ({
                        item_id: item.item_id,
                        description: item.description,
                        uom: item.uom,
                        qty_requested: item.qty_requested,
                        estimated_rate: item.estimated_rate,
                        tax_percentage: item.tax_percentage,
                        source: item.source,
                        quotation_item_id: item.quotation_item_id,
                        vendor_id: item.vendor_id,
                        vendor_rate: item.vendor_rate,
                        remarks: item.remarks,
                        is_batch_tracked: item.is_batch_tracked,
                        is_serial_tracked: item.is_serial_tracked,
                    })),
                },
            });

            showSuccess("PR saved as draft successfully");
            router.back();
        } catch (err: any) {
            console.error("Failed to save PR:", err);
            showError(err?.message || "Failed to save PR");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedStore) {
            showError("Please select a store first");
            return;
        }

        if (items.length === 0) {
            showError("Please add at least one item");
            return;
        }

        try {
            setLoading(true);
            const createRes = await apiClient<{ prId: number }>("/pr", {
                method: "POST",
                withAuth: true,
                body: {
                    site_id: siteId,
                    store_id: selectedStore.id,
                    purpose,
                    preferred_vendor_id: preferredVendorId,
                    priority,
                    expected_delivery: expectedDelivery || null,
                    restock_mode: restockMode,
                    quotation_id: winnerQuotationId || null,
                    items: items.map((item) => ({
                        item_id: item.item_id,
                        description: item.description,
                        uom: item.uom,
                        qty_requested: item.qty_requested,
                        estimated_rate: item.estimated_rate,
                        tax_percentage: item.tax_percentage,
                        source: item.source,
                        quotation_item_id: item.quotation_item_id,
                        vendor_id: item.vendor_id,
                        vendor_rate: item.vendor_rate,
                        remarks: item.remarks,
                        is_batch_tracked: item.is_batch_tracked,
                        is_serial_tracked: item.is_serial_tracked,
                    })),
                },
            });

            // Link winner quotation if selected
            if (winnerQuotationId) {
                try {
                    await apiClient(`/pr/${createRes.prId}/attach-quotation`, {
                        method: "POST",
                        withAuth: true,
                        body: { quotation_id: winnerQuotationId }
                    });
                } catch (e) {
                    console.error("Failed to attach quotation:", e);
                }
            }

            // Mark RFQ winner if selected
            if (selectedRfqId && winnerVendorId) {
                try {
                    await apiClient(`/rfq/${selectedRfqId}/select-winner`, {
                        method: "POST",
                        withAuth: true,
                        body: { vendor_id: winnerVendorId, remarks: "Linked from PR" }
                    });
                } catch (e) {
                    console.error("Failed to mark RFQ winner:", e);
                }
            }

            // Submit the PR
            await apiClient(`/pr/${createRes.prId}/submit`, {
                method: "POST",
                withAuth: true,
            });

            showSuccess("PR submitted successfully");
            router.back();
        } catch (err: any) {
            console.error("Failed to submit PR:", err);
            showError(err?.message || "Failed to submit PR");
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Create Purchase Request</h1>
                <button
                    onClick={() => router.back()}
                    className="text-gray-600 hover:text-gray-800"
                >
                    Cancel
                </button>
            </div>

            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">PR Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Store <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={selectedStore?.name || "No store selected"}
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Select store from Store Selection page
                        </p>
                    </div>

                    {selectedStore?.is_main_store ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
                            <select
                                value={siteId || ""}
                                onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select Site (Optional)</option>
                                {sites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.site_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Delivery Date
                        </label>
                        <input
                            type="date"
                            value={expectedDelivery}
                            onChange={(e) => setExpectedDelivery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {(!linkingActive && (restockMode === 'direct_purchase' || restockMode === 'hybrid')) ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Vendor</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={selectedVendor?.vendor_name || ""}
                                    placeholder="Click to select vendor"
                                    disabled
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowVendorModal(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Select
                                </button>
                                {selectedVendor && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedVendor(null);
                                            setPreferredVendorId(null);
                                        }}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {selectedStore?.is_main_store ? null : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Restock Mode <span className="text-red-500">*</span></label>
                            <select
                                value={restockMode}
                                onChange={(e) => setRestockMode(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="main_warehouse">Main Warehouse</option>
                                <option value="direct_purchase">Direct Purchase</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Purpose / Justification
                        </label>
                        <textarea
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter the reason for this purchase request..."
                        />
                    </div>
                </div>
            </div>


            {/* Quotation Linking Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Quotation Linking (Optional)</h2>
                    {!linkingActive && (
                        <button
                            onClick={() => { setShowRfqModal(true); setLinkingActive(true); }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Link2 size={20} />
                            Link RFQ
                        </button>
                    )}
                </div>

                {winnerQuotationId ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-blue-900">RFQ Linked</p>
                                <p className="text-sm text-blue-700 mt-1">Winner quotation selected</p>
                            </div>
                            <button
                                onClick={handleRemoveQuotation}
                                className="text-red-600 hover:text-red-800"
                                title="Remove quotation link"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-600">
                        No RFQ linked. Items will be entered manually or you can link an RFQ to auto-populate items from vendor quotations.
                    </p>
                )}
            </div>

            {/* File Attachments Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Attachments</h2>
                <div className="mb-4">
                    <label className="block">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                            <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                            <p className="text-sm text-gray-600">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                PDF, DOC, DOCX, PNG, JPG (Max 5MB per file, up to 10 files)
                            </p>
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploadingFiles}
                            />
                        </div>
                    </label>
                </div>

                {attachments.length > 0 && (
                    <div className="space-y-2">
                        {attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-gray-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                                        <p className="text-xs text-gray-500">
                                            {file.file_type} • {(file.file_size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeAttachment(index)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Items Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Items</h2>
                    <button
                        onClick={() => setShowItemModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Item
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No items added. Click "Add Item" to get started.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Amt</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                                            <div className="text-xs text-gray-500">{item.item_code}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateItem(index, "description", e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                placeholder="Optional"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm">{item.uom}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={item.qty_requested}
                                                onChange={(e) => updateItem(index, "qty_requested", Number(e.target.value))}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={item.estimated_rate}
                                                onChange={(e) => updateItem(index, "estimated_rate", Number(e.target.value))}
                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={item.tax_percentage}
                                                onChange={(e) => updateItem(index, "tax_percentage", Number(e.target.value))}
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            ₹{item.tax_amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium">
                                            ₹{item.estimated_amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                <tr>
                                    <td colSpan={6} className="px-4 py-3 text-right font-medium">Subtotal:</td>
                                    <td className="px-4 py-3 font-medium">₹{totals.subtotal.toFixed(2)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                                <tr>
                                    <td colSpan={6} className="px-4 py-3 text-right font-medium">Total Tax:</td>
                                    <td className="px-4 py-3 font-medium">₹{totals.totalTax.toFixed(2)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                                <tr>
                                    <td colSpan={6} className="px-4 py-3 text-right font-bold text-lg">Grand Total:</td>
                                    <td className="px-4 py-3 font-bold text-lg">₹{totals.total.toFixed(2)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
                <button
                    onClick={handleSaveDraft}
                    disabled={loading}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={20} />
                    Save as Draft
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    <Send size={20} />
                    Submit for Approval
                </button>
            </div>

            {/* Item Search Modal */}
            {showItemModal && (
                <ItemSearchModal
                    onClose={() => setShowItemModal(false)}
                    onSelect={handleSelectItem}
                />
            )}

            {/* Vendor Search Modal */}
            {showVendorModal && (
                <VendorSearchModal
                    onClose={() => setShowVendorModal(false)}
                    onSelect={handleSelectVendor}
                />
            )}

            {showRfqModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Link RFQ</h2>
                            <button onClick={() => setShowRfqModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        {!selectedRfqId ? (
                            <div className="space-y-3">
                                {rfqs.map((r) => (
                                    <div key={r.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedRfqId(r.id); fetchRfqComparison(r.id); }}>
                                        <div className="flex justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{r.rfq_number}</p>
                                                <p className="text-sm text-gray-600">Site: {r.site_name} • Store: {r.store_name}</p>
                                            </div>
                                            <div className="text-right text-sm text-gray-600">Status: {r.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Vendor Submissions</h3>
                                <div className="space-y-2">
                                    {(rfqComparisons?.comparison || []).map((v: any) => (
                                        <div key={v.vendor_id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-900">{v.vendor_name}</p>
                                                    <p className="text-sm text-gray-600">Response: {v.response_status || 'pending'}</p>
                                                </div>
                                                {v.quotation ? (
                                                    <div className="text-right">
                                                        <label className="inline-flex items-center gap-2 text-sm">
                                                            <input type="checkbox" checked={selectedQuotationIds.includes(v.quotation.id)} onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setSelectedQuotationIds(prev => checked ? [...prev, v.quotation.id] : prev.filter(id => id !== v.quotation.id));
                                                            }} />
                                                            Select
                                                        </label>
                                                        <div className="mt-1 font-semibold">₹{Number(v.quotation.total_value || 0).toFixed(2)}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-right text-sm text-gray-500">No quotation</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {selectedQuotationIds.length > 0 && (
                                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                        <p className="font-medium mb-2">Choose Winner</p>
                                        <div className="space-y-2">
                                            {(rfqComparisons?.comparison || []).filter((v: any) => v.quotation && selectedQuotationIds.includes(v.quotation.id)).map((v: any) => (
                                                <label key={v.quotation.id} className="flex items-center gap-2 text-sm">
                                                    <input type="radio" name="winner" checked={winnerQuotationId === v.quotation.id} onChange={() => setWinnerQuotationId(v.quotation.id)} />
                                                    <span>{v.vendor_name} • ₹{Number(v.quotation.total_value || 0).toFixed(2)}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                                                onClick={() => {
                                                    const candidates = (rfqComparisons?.comparison || []).filter((v: any) => v.quotation && selectedQuotationIds.includes(v.quotation.id));
                                                    let chosen = winnerQuotationId;
                                                    if (!chosen && candidates.length) {
                                                        chosen = candidates.reduce((min: any, v: any) => (Number(v.quotation.total_value || 0) < Number(min.quotation.total_value || 0) ? v : min)).quotation.id;
                                                        setWinnerQuotationId(chosen);
                                                    }
                                                    const winVendor = candidates.find((v: any) => v.quotation.id === chosen);
                                                    if (winVendor && winVendor.quotation && Array.isArray(winVendor.quotation.items)) {
                                                        const itemMap = new Map<number, any>();
                                                        (rfqComparisons?.items || []).forEach((it: any) => itemMap.set(Number(it.item_id), it));
                                                        const quotationItems: PrItem[] = winVendor.quotation.items.map((qItem: any) => {
                                                            const base = itemMap.get(Number(qItem.item_id)) || {};
                                                            return {
                                                                item_id: Number(qItem.item_id),
                                                                item_name: base.item_name || '',
                                                                item_code: base.item_code || '',
                                                                description: base.specification || '',
                                                                uom: base.uom || '',
                                                                qty_requested: Number(qItem.offered_qty || 0),
                                                                estimated_rate: Number(qItem.rate || 0),
                                                                tax_percentage: Number(qItem.tax_percentage || 0),
                                                                tax_amount: Number(qItem.tax_amount || 0),
                                                                estimated_amount: Number(qItem.total || 0),
                                                                source: 'quotation',
                                                                quotation_item_id: Number(qItem.id),
                                                                vendor_id: Number(winVendor.vendor_id || 0) || null,
                                                                vendor_rate: Number(qItem.rate || 0),
                                                                remarks: '',
                                                                is_batch_tracked: false,
                                                                is_serial_tracked: false,
                                                            } as PrItem;
                                                        });
                                                        setWinnerVendorId(Number(winVendor.vendor_id || 0) || null);
                                                        setItems(quotationItems);
                                                        setShowRfqModal(false);
                                                    }
                                                }}
                                            >
                                                Apply to PR Items
                                            </button>
                                            <button className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg" onClick={() => { setSelectedQuotationIds([]); setWinnerQuotationId(null); }}>
                                                Clear Selection
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
