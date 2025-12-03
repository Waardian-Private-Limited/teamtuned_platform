"use client";
import React, { useState, useEffect } from "react";
import { X, Search, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Vendor {
    id: number;
    vendor_name: string;
    vendor_code: string;
    email: string;
    phone: string;
    contact_person: string;
    is_temporary?: boolean;
    relevance_score?: number;
    supplied_items?: string;
}

interface VendorSelectionModalProps {
    onClose: () => void;
    onSelect: (vendors: number[]) => void;
    selectedVendors: number[];
    suggestedVendors?: Vendor[];
}

export default function VendorSelectionModal({
    onClose,
    onSelect,
    selectedVendors,
    suggestedVendors = [],
}: VendorSelectionModalProps) {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [tempSelected, setTempSelected] = useState<number[]>(selectedVendors);

    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetchVendors();
    }, []);

    useEffect(() => {
        filterVendors();
    }, [searchTerm, vendors]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const res = await apiClient<{ vendors: Vendor[] }>("/vendors", {
                method: "GET",
                withAuth: true,
            });
            setVendors(res?.vendors || []);
        } catch (err) {
            console.error("Failed to fetch vendors:", err);
        } finally {
            setLoading(false);
        }
    };

    const filterVendors = () => {
        if (!searchTerm) {
            setFilteredVendors(vendors);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = vendors.filter(
            (v) =>
                v.vendor_name.toLowerCase().includes(term) ||
                v.vendor_code.toLowerCase().includes(term) ||
                v.email.toLowerCase().includes(term) ||
                (v.contact_person && v.contact_person.toLowerCase().includes(term))
        );
        setFilteredVendors(filtered);
        setCurrentPage(1);
    };

    const toggleVendor = (vendorId: number) => {
        if (tempSelected.includes(vendorId)) {
            setTempSelected(tempSelected.filter((id) => id !== vendorId));
        } else {
            setTempSelected([...tempSelected, vendorId]);
        }
    };

    const handleApply = () => {
        onSelect(tempSelected);
        onClose();
    };

    // Pagination
    const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedVendors = filteredVendors.slice(startIndex, endIndex);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Select Vendors</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {tempSelected.length} vendor(s) selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, code, email, or contact person..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Suggested Vendors */}
                {suggestedVendors.length > 0 && (
                    <div className="p-6 bg-blue-50 border-b border-blue-100">
                        <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <UserPlus size={16} />
                            Suggested Vendors (Based on Items)
                        </h3>
                        <div className="space-y-2">
                            {suggestedVendors.slice(0, 5).map((vendor) => (
                                <label
                                    key={vendor.id}
                                    className="flex items-start gap-3 p-3 bg-white hover:bg-blue-50 rounded-lg cursor-pointer border border-blue-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={tempSelected.includes(vendor.id)}
                                        onChange={() => toggleVendor(vendor.id)}
                                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-gray-900">
                                                {vendor.vendor_name}
                                            </div>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                                {vendor.relevance_score}% match
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {vendor.vendor_code} • {vendor.email}
                                        </div>
                                        {vendor.supplied_items && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Previously supplied: {vendor.supplied_items}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vendor List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading vendors...</div>
                    ) : paginatedVendors.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {searchTerm ? "No vendors found matching your search" : "No vendors available"}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {paginatedVendors.map((vendor) => (
                                <label
                                    key={vendor.id}
                                    className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={tempSelected.includes(vendor.id)}
                                        onChange={() => toggleVendor(vendor.id)}
                                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
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
                                            {vendor.vendor_code} • {vendor.contact_person} • {vendor.email}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredVendors.length)} of{" "}
                            {filteredVendors.length}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(
                                        (page) =>
                                            page === 1 ||
                                            page === totalPages ||
                                            Math.abs(page - currentPage) <= 1
                                    )
                                    .map((page, index, array) => (
                                        <React.Fragment key={page}>
                                            {index > 0 && array[index - 1] !== page - 1 && (
                                                <span className="px-2 text-gray-400">...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`px-3 py-1 rounded-lg ${currentPage === page
                                                        ? "bg-blue-600 text-white"
                                                        : "border border-gray-300 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        Apply Selection ({tempSelected.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
