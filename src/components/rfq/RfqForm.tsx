"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useInventoryStore } from "../inventory/InventoryStoreContext";
import { Plus, Trash2, Save, Send, Users, UserPlus, Sparkles } from "lucide-react";
import ItemSearchModal from "../inventory/grn/ItemSearchModal";
import VendorSelectionModal from "./VendorSelectionModal";
import AddTempVendorModal from "./AddTempVendorModal";
import { showSuccess, showError } from "@/lib/toast";

interface RfqItem {
    item_id: number;
    item_name: string;
    item_code: string;
    uom: string;
    required_qty: number;
    specification: string;
}

interface Vendor {
    id: number;
    vendor_name: string;
    vendor_code: string;
    email: string;
    phone: string;
    contact_person: string;
    is_temporary?: boolean;
    relevance_score?: number;
}

export default function RfqForm() {
    const router = useRouter();
    const { selectedStore } = useInventoryStore();

    // Header fields
    const [siteId, setSiteId] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState("");
    const [purpose, setPurpose] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");

    // Items (now first)
    const [items, setItems] = useState<RfqItem[]>([]);
    const [showItemModal, setShowItemModal] = useState(false);

    // Vendors
    const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
    const [vendorDetails, setVendorDetails] = useState<Vendor[]>([]);
    const [suggestedVendors, setSuggestedVendors] = useState<Vendor[]>([]);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showTempVendorModal, setShowTempVendorModal] = useState(false);

    // Sites
    const [sites, setSites] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSites();
    }, []);

    // Fetch vendor suggestions when items change
    useEffect(() => {
        if (items.length > 0) {
            fetchSuggestedVendors();
        } else {
            setSuggestedVendors([]);
        }
    }, [items]);

    const fetchSites = async () => {
        try {
            const res = await apiClient<{ sites: any[] }>("/sites", {
                method: "GET",
                withAuth: true,
            });
            setSites(res?.sites || []);
        } catch (err) {
            console.error("Failed to fetch sites:", err);
        }
    };

    const fetchSuggestedVendors = async () => {
        try {
            const itemIds = items.map((item) => item.item_id);
            const res = await apiClient<{ vendors: Vendor[] }>("/rfq/suggest-vendors", {
                method: "POST",
                withAuth: true,
                body: { item_ids: itemIds },
            });
            setSuggestedVendors(res?.vendors || []);
        } catch (err) {
            console.error("Failed to fetch suggested vendors:", err);
        }
    };

    const fetchVendorDetails = async (vendorIds: number[]) => {
        try {
            const res = await apiClient<{ vendors: Vendor[] }>("/vendors", {
                method: "GET",
                withAuth: true,
            });
            const allVendors = res?.vendors || [];
            const selected = allVendors.filter((v) => vendorIds.includes(v.id));
            setVendorDetails(selected);
        } catch (err) {
            console.error("Failed to fetch vendor details:", err);
        }
    };

    const handleSelectItem = (item: any) => {
        if (items.some((i) => i.item_id === item.id)) {
            showError("Item already added");
            return;
        }

        const newItem: RfqItem = {
            item_id: item.id,
            item_name: item.item_name,
            item_code: item.item_code,
            uom: item.uom,
            required_qty: 1,
            specification: "",
        };

        setItems([...items, newItem]);
        setShowItemModal(false);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof RfqItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setItems(updatedItems);
    };

    const handleVendorSelection = (vendorIds: number[]) => {
        setSelectedVendors(vendorIds);
        fetchVendorDetails(vendorIds);
    };

    const handleTempVendorCreated = (vendor: Vendor) => {
        setSelectedVendors([...selectedVendors, vendor.id]);
        setVendorDetails([...vendorDetails, vendor]);
    };

    const handleQuickSelectVendor = (vendorId: number) => {
        if (!selectedVendors.includes(vendorId)) {
            const newSelection = [...selectedVendors, vendorId];
            setSelectedVendors(newSelection);
            fetchVendorDetails(newSelection);
        }
    };

    const handleRemoveVendor = (vendorId: number) => {
        setSelectedVendors(selectedVendors.filter((id) => id !== vendorId));
        setVendorDetails(vendorDetails.filter((v) => v.id !== vendorId));
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

        if (selectedVendors.length === 0) {
            showError("Please select at least one vendor");
            return;
        }

        try {
            setLoading(true);

            await apiClient("/rfq", {
                method: "POST",
                withAuth: true,
                body: {
                    site_id: siteId,
                    store_id: selectedStore.id,
                    due_date: dueDate || null,
                    purpose,
                    attachment_url: attachmentUrl,
                    items: items.map((item) => ({
                        item_id: item.item_id,
                        required_qty: item.required_qty,
                        specification: item.specification,
                    })),
                    vendors: selectedVendors,
                },
            });

            showSuccess("RFQ saved as draft successfully");
            router.back();
        } catch (err: any) {
            console.error("Failed to save RFQ:", err);
            showError(err?.message || "Failed to save RFQ");
        } finally {
            setLoading(false);
        }
    };

    const handleSendRfq = async () => {
        if (!selectedStore) {
            showError("Please select a store first");
            return;
        }

        if (items.length === 0) {
            showError("Please add at least one item");
            return;
        }

        if (selectedVendors.length === 0) {
            showError("Please select at least one vendor");
            return;
        }

        try {
            setLoading(true);

            const createRes = await apiClient<{ rfqId: number }>("/rfq", {
                method: "POST",
                withAuth: true,
                body: {
                    site_id: siteId,
                    store_id: selectedStore.id,
                    due_date: dueDate || null,
                    purpose,
                    attachment_url: attachmentUrl,
                    items: items.map((item) => ({
                        item_id: item.item_id,
                        required_qty: item.required_qty,
                        specification: item.specification,
                    })),
                    vendors: selectedVendors,
                },
            });

            await apiClient(`/rfq/${createRes.rfqId}/send`, {
                method: "POST",
                withAuth: true,
            });

            showSuccess("RFQ sent to vendors successfully");
            router.back();
        } catch (err: any) {
            console.error("Failed to send RFQ:", err);
            showError(err?.message || "Failed to send RFQ");
        } finally {
            setLoading(false);
        }
    };

    const tempVendorCount = vendorDetails.filter((v) => v.is_temporary).length;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Create RFQ</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
                {/* Section A: Header */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">RFQ Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Site
                            </label>
                            <select
                                value={siteId || ""}
                                onChange={(e) => setSiteId(Number(e.target.value) || null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select Site</option>
                                {sites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Store <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={selectedStore?.name || ""}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                placeholder="Select store from sidebar"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Purpose
                            </label>
                            <input
                                type="text"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Purpose of RFQ"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attachment URL
                            </label>
                            <input
                                type="text"
                                value={attachmentUrl}
                                onChange={(e) => setAttachmentUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="URL to specifications, drawings, etc."
                            />
                        </div>
                    </div>
                </div>

                {/* Section B: Items Table (NOW FIRST) */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">
                            Items <span className="text-red-500">*</span>
                        </h2>
                        <button
                            onClick={() => setShowItemModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add Item
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                            No items added yet. Click "Add Item" to get started.
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Item
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            UOM
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Required Qty
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Specification
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {item.item_name}
                                                </div>
                                                <div className="text-xs text-gray-500">{item.item_code}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{item.uom}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.required_qty}
                                                    onChange={(e) =>
                                                        handleItemChange(
                                                            index,
                                                            "required_qty",
                                                            Number(e.target.value)
                                                        )
                                                    }
                                                    min="0"
                                                    step="0.01"
                                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={item.specification}
                                                    onChange={(e) =>
                                                        handleItemChange(index, "specification", e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Specifications or notes"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Section C: Vendor Selection (NOW SECOND, with suggestions) */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">
                        Select Vendors <span className="text-red-500">*</span>
                    </h2>

                    {/* Suggested Vendors */}
                    {suggestedVendors.length > 0 && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="text-blue-600" size={20} />
                                <h3 className="text-sm font-semibold text-blue-900">
                                    Suggested Vendors (Based on Items)
                                </h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {suggestedVendors.slice(0, 5).map((vendor) => (
                                    <button
                                        key={vendor.id}
                                        onClick={() => handleQuickSelectVendor(vendor.id)}
                                        disabled={selectedVendors.includes(vendor.id)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedVendors.includes(vendor.id)
                                                ? "bg-green-100 text-green-700 border border-green-300"
                                                : "bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                                            }`}
                                    >
                                        {vendor.vendor_name}
                                        <span className="ml-2 text-xs">
                                            ({vendor.relevance_score}% match)
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected Vendors */}
                    {vendorDetails.length > 0 && (
                        <div className="mb-4 space-y-2">
                            {vendorDetails.map((vendor) => (
                                <div
                                    key={vendor.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-gray-900">
                                                {vendor.vendor_name}
                                            </div>
                                            {vendor.is_temporary && (
                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                                                    Temporary
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {vendor.vendor_code} • {vendor.email}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveVendor(vendor.id)}
                                        className="text-red-600 hover:text-red-800 p-2"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowVendorModal(true)}
                            className="flex-1 px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 font-medium"
                        >
                            <Users size={20} />
                            Browse All Vendors
                        </button>
                        <button
                            onClick={() => setShowTempVendorModal(true)}
                            className="flex-1 px-4 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 flex items-center justify-center gap-2 font-medium"
                        >
                            <UserPlus size={20} />
                            Add Temporary Vendor
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 mt-3">
                        Selected: {selectedVendors.length} vendor(s)
                        {tempVendorCount > 0 && ` (${tempVendorCount} temporary)`}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => router.back()}
                        disabled={loading}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        disabled={loading}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save size={20} />
                        Save as Draft
                    </button>
                    <button
                        onClick={handleSendRfq}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        <Send size={20} />
                        Send RFQ
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showItemModal && (
                <ItemSearchModal
                    onClose={() => setShowItemModal(false)}
                    onSelect={handleSelectItem}
                />
            )}

            {showVendorModal && (
                <VendorSelectionModal
                    onClose={() => setShowVendorModal(false)}
                    onSelect={handleVendorSelection}
                    selectedVendors={selectedVendors}
                    suggestedVendors={suggestedVendors}
                />
            )}

            {showTempVendorModal && (
                <AddTempVendorModal
                    onClose={() => setShowTempVendorModal(false)}
                    onVendorCreated={handleTempVendorCreated}
                />
            )}
        </div>
    );
}
