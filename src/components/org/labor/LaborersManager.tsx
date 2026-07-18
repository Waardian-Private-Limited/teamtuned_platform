"use client";

import React from "react";
import {
    Plus,
    Search,
    Eye,
    Pencil,
    Trash2,
    RefreshCw,
    X,
    HardHat,
    Phone,
    Mail,
    MapPin,
    Briefcase,
    LayoutGrid,
    Filter,
    Upload,
    Image,
    FileText,
    User,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    PowerOff,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function LaborersManager() {
    const { role, permissions } = useAuth();
    const [laborers, setLaborers] = React.useState<any[]>([]);
    const [categories, setCategories] = React.useState<any[]>([]);
    const [contractors, setContractors] = React.useState<any[]>([]);
    const [subcategories, setSubcategories] = React.useState<any[]>([]);
    const [sites, setSites] = React.useState<any[]>([]);
    const [contractorCategories, setContractorCategories] = React.useState<any[]>([]);
    const [contractorAssignedData, setContractorAssignedData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [searchTerm, setSearchTerm] = React.useState("");
    const [categoryFilter, setCategoryFilter] = React.useState("");
    const [contractorFilter, setContractorFilter] = React.useState("");
    const [siteFilter, setSiteFilter] = React.useState("");
    const [laborTypes, setLaborTypes] = React.useState<any[]>([]);

    // Pagination
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);
    const [totalEntries, setTotalEntries] = React.useState(0);

    // HR/HQ Mode for Site Filtering
    const [hqMode, setHqMode] = React.useState(false);
    const [inchargeSites, setInchargeSites] = React.useState<any[]>([]);
    const [allSites, setAllSites] = React.useState<any[]>([]);

    // Check if user has HR access
    const hasHrAccess = (role === "OrgAdmin" || role === "superAdmin" || (permissions || []).includes("HR_MODE"));

    // Modals
    const [showCreateModal, setShowCreateModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [showViewModal, setShowViewModal] = React.useState(false);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [selectedLaborer, setSelectedLaborer] = React.useState<any>(null);

    // Form
    const [form, setForm] = React.useState({
        contractor_id: "",
        category_id: "",
        subcategory_id: "",
        labor_type_id: "",
        site_id: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        id_proof_type: "",
        id_proof_number: "",
    });
    const [faceImage, setFaceImage] = React.useState<File | null>(null);
    const [facePreview, setFacePreview] = React.useState<string | null>(null);
    const [idProofFile, setIdProofFile] = React.useState<File | null>(null);
    const [idProofPreview, setIdProofPreview] = React.useState<string | null>(null);
    const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);

    // Duplicate Face Handling
    const [duplicateData, setDuplicateData] = React.useState<any>(null);
    const [showDuplicateModal, setShowDuplicateModal] = React.useState(false);

    const hasPerm = (code: string) =>
        (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

    const fetchLaborers = async () => {
        setLoading(true);
        setError("");
        try {
            const params: any = {};
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (categoryFilter) params.category_id = categoryFilter;
            if (contractorFilter) params.contractor_id = contractorFilter;
            if (siteFilter) params.site_id = siteFilter;

            params.page = page;
            params.limit = pageSize;

            const data = await apiClient<{ success: boolean; laborers: any[]; pagination: any }>(
                "/labor/laborers",
                { method: "GET", params }
            );
            setLaborers(data.laborers || []);
            setTotalEntries(data.pagination?.total || 0);
        } catch (e: any) {
            setError(e?.message || "Failed to load laborers");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await apiClient<{ success: boolean; categories: any[] }>(
                "/labor/categories",
                { method: "GET" }
            );
            setCategories(data.categories || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAllSites = async () => {
        try {
            const data = await apiClient<{ success: boolean; sites: any[] }>(
                "/sites",
                { method: "GET" }
            );
            setAllSites(data.sites || []);
            // If in HQ mode, these are the sites to show
            if (hqMode) {
                setSites(data.sites || []);
            }
        } catch (e) {
            console.error("Failed to fetch sites", e);
        }
    };

    const fetchUserSites = async () => {
        try {
            const data = await apiClient<{ success: boolean; sites: any[] }>(
                "/employee/dashboard/sites",
                { method: "GET" }
            );
            setInchargeSites(data.sites || []);
            // If not in HQ mode, these are the sites to show
            if (!hqMode) {
                setSites(data.sites || []);
            }
        } catch (e) {
            console.error("Failed to fetch user sites", e);
        }
    };

    const fetchLaborTypes = async () => {
        try {
            const data = await apiClient<{ success: boolean; types: any[] }>(
                "/labor/types",
                { method: "GET" }
            );
            setLaborTypes(data.types || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchContractors = async () => {
        try {
            const data = await apiClient<{ success: boolean; contractors: any[] }>(
                "/labor/contractors",
                { method: "GET" }
            );
            setContractors(data.contractors || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchSubcategories = async (categoryId: string) => {
        if (!categoryId) {
            setSubcategories([]);
            return;
        }
        try {
            const data = await apiClient<{ success: boolean; subcategories: any[] }>(
                `/labor/categories/${categoryId}/subcategories`,
                { method: "GET" }
            );
            setSubcategories(data.subcategories || []);
        } catch (e) {
            console.error(e);
            setSubcategories([]);
        }
    };

    const fetchContractorCategories = async (contractorId: string) => {
        if (!contractorId) {
            setContractorCategories([]);
            setContractorAssignedData([]);
            return;
        }
        try {
            const data = await apiClient<{ success: boolean; categories: any[] }>(
                `/labor/contractors/${contractorId}/categories`,
                { method: "GET" }
            );

            // Map and deduplicate categories
            const rawCategories = data.categories || [];
            setContractorAssignedData(rawCategories);

            const uniqueCategories = rawCategories.reduce((acc: any[], current: any) => {
                const x = acc.find(item => item.id === current.category_id);
                if (!x) {
                    return acc.concat([{
                        id: current.category_id,
                        name: current.category_name,
                        // Keep other useful props if needed
                    }]);
                } else {
                    return acc;
                }
            }, []);

            setContractorCategories(uniqueCategories);
        } catch (e) {
            console.error(e);
            setContractorCategories([]);
            setContractorAssignedData([]);
        }
    };

    React.useEffect(() => {
        fetchLaborers();
        fetchCategories();
        fetchContractors();
        fetchUserSites();
        fetchLaborTypes();
        if (hasHrAccess) {
            fetchAllSites();
        }
    }, [hasHrAccess]);

    // Update displayed sites when toggle changes
    React.useEffect(() => {
        if (hqMode) {
            if (allSites.length === 0) fetchAllSites();
            else setSites(allSites);
        } else {
            setSites(inchargeSites);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hqMode, inchargeSites, allSites]);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            fetchLaborers();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm, categoryFilter, contractorFilter, siteFilter, page, pageSize]);

    // Reset page when filters change
    React.useEffect(() => {
        setPage(1);
    }, [searchTerm, categoryFilter, contractorFilter, siteFilter]);

    // Dependent Dropdowns Logic (for both Create and Edit)
    React.useEffect(() => {
        if (showCreateModal || showEditModal) {
            if (form.contractor_id) {
                fetchContractorCategories(form.contractor_id);
            } else {
                setContractorCategories([]);
            }
        }
    }, [form.contractor_id, showCreateModal, showEditModal]);

    React.useEffect(() => {
        if (showCreateModal || showEditModal) {
            if (form.category_id) {
                fetchSubcategories(form.category_id);
            } else {
                setSubcategories([]);
            }
        }
    }, [form.category_id, showCreateModal, showEditModal]);

    const handleCreate = async (isOverride: boolean = false) => {
        if (!form.name.trim() || !form.contractor_id || !form.category_id) {
            setError("Name, contractor, and category are required");
            return;
        }

        setSaving(true);
        setError("");
        try {
            const formData = new FormData();

            // Add all form fields
            formData.append("contractor_id", form.contractor_id);
            formData.append("category_id", form.category_id);
            formData.append("site_id", form.site_id);
            formData.append("name", form.name.trim());
            if (form.phone.trim()) formData.append("phone", form.phone.trim());
            if (form.email.trim()) formData.append("email", form.email.trim());
            if (form.address.trim()) formData.append("address", form.address.trim());
            if (form.id_proof_type.trim()) formData.append("id_proof_type", form.id_proof_type.trim());
            if (form.id_proof_number.trim()) formData.append("id_proof_number", form.id_proof_number.trim());
            if (form.subcategory_id) formData.append("subcategory_id", form.subcategory_id);

            // Add face image if present
            if (faceImage) {
                formData.append("face_image", faceImage);
            }

            // Add ID Proof image if present
            if (idProofFile) {
                formData.append("id_proof_images", idProofFile);
            }

            // Add Attachment if present
            if (attachmentFile) {
                formData.append("attachments", attachmentFile);
            }

            if (isOverride) {
                formData.append("override", "true");
            }

            await apiClient("/labor/laborers", {
                method: "POST",
                body: formData,
                headers: {}, // Let browser set Content-Type with boundary
            });

            // If we are here, success! Close everything.
            setShowDuplicateModal(false);
            setDuplicateData(null);

            setShowCreateModal(false);
            setForm({
                contractor_id: "",
                category_id: "",
                subcategory_id: "",
                labor_type_id: "",
                site_id: "",
                name: "",
                phone: "",
                email: "",
                address: "",
                id_proof_type: "",
                id_proof_number: "",
            });
            setFaceImage(null);
            setFacePreview(null);
            setIdProofFile(null);
            setIdProofPreview(null);
            setAttachmentFile(null);
            setAttachmentPreview(null);
            fetchLaborers();
        } catch (e: any) {
            // Check for duplicate face override
            if (e?.status === 409 && e?.data?.can_override) {
                setDuplicateData(e.data);
                setShowDuplicateModal(true);
                // Don't show generic error toast if we are showing the modal
                return;
            }
            setError(e?.message || "Failed to register laborer");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedLaborer || !form.name.trim() || !form.contractor_id || !form.category_id) {
            setError("Name, contractor, and category are required");
            return;
        }

        setSaving(true);
        setError("");
        try {
            const payload: any = {
                contractor_id: parseInt(form.contractor_id),
                category_id: parseInt(form.category_id),
                site_id: parseInt(form.site_id),
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                address: form.address.trim() || null,
                id_proof_type: form.id_proof_type.trim() || null,
                id_proof_number: form.id_proof_number.trim() || null,
            };

            if (form.subcategory_id) payload.subcategory_id = parseInt(form.subcategory_id);

            await apiClient(`/labor/laborers/${selectedLaborer.id}`, {
                method: "PUT",
                body: payload,
            });

            // Upload face image if provided
            if (faceImage) {
                const faceFormData = new FormData();
                faceFormData.append("face_image", faceImage);

                try {
                    await apiClient(`/labor/laborers/${selectedLaborer.id}/face-image`, {
                        method: "POST",
                        body: faceFormData,
                        headers: {}, // Let browser set Content-Type with boundary
                    });
                } catch (faceError: any) {
                    setError(faceError?.message || "Failed to upload face image");
                    setSaving(false);
                    return;
                }
            }

            // Upload attachment if provided
            if (attachmentFile) {
                const attachFormData = new FormData();
                attachFormData.append("id_proof", attachmentFile);

                try {
                    await apiClient(`/labor/laborers/${selectedLaborer.id}/id-proof`, {
                        method: "POST",
                        body: attachFormData,
                        headers: {},
                    });
                } catch (attachError: any) {
                    console.error("Failed to upload attachment:", attachError);
                }
            }

            setShowEditModal(false);
            setSelectedLaborer(null);
            setForm({
                contractor_id: "",
                category_id: "",
                subcategory_id: "",
                labor_type_id: "",
                site_id: "",
                name: "",
                phone: "",
                email: "",
                address: "",
                id_proof_type: "",
                id_proof_number: "",
            });
            setFaceImage(null);
            setFacePreview(null);
            setIdProofFile(null);
            setIdProofPreview(null);
            setAttachmentFile(null);
            setAttachmentPreview(null);
            fetchLaborers();
        } catch (e: any) {
            setError(e?.message || "Failed to update laborer");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (laborer: any) => {
        setSelectedLaborer(laborer);
        setShowDeleteModal(true);
    };

    const handleToggleStatus = async (laborer: any) => {
        if (!window.confirm(`Are you sure you want to mark ${laborer.name} as ${laborer.is_active ? 'Inactive' : 'Active'}?`)) return;
        setSaving(true);
        try {
            await apiClient(`/labor/laborers/${laborer.id}/status`, {
                method: "PATCH",
                body: { is_active: !laborer.is_active }
            });
            fetchLaborers();
        } catch (e: any) {
            setError(e?.message || "Failed to toggle status");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedLaborer) return;

        // setSaving(true); // Re-use saving state or create deleting state? Re-use for simplicity
        // Actually, deleting state is better UI. I'll use simple variable or re-use saving.
        // Let's create local deleting state for button if needed, or just setSaving.
        setSaving(true);
        try {
            await apiClient(`/labor/laborers/${selectedLaborer.id}`, { method: "DELETE" });
            fetchLaborers();
            setShowDeleteModal(false);
            setSelectedLaborer(null);
        } catch (e: any) {
            setError(e?.message || "Failed to delete laborer");
            setShowDeleteModal(false); // Close on error? Or keep open? Close is standard, error shown in main UI.
        } finally {
            setSaving(false);
        }
    };

    const openView = async (laborer: any) => {
        try {
            const data = await apiClient<{ success: boolean; laborer: any }>(
                `/labor/laborers/${laborer.id}`,
                { method: "GET" }
            );
            setSelectedLaborer(data.laborer);
            setShowViewModal(true);
        } catch (e: any) {
            setError(e?.message || "Failed to load laborer details");
        }
    };

    const openEdit = async (laborer: any) => {
        try {
            const data = await apiClient<{ success: boolean; laborer: any }>(
                `/labor/laborers/${laborer.id}`,
                { method: "GET" }
            );
            const lab = data.laborer;
            
            setSelectedLaborer(lab);
            setForm({
                contractor_id: lab.contractor_id ? String(lab.contractor_id) : "",
                category_id: lab.category_id ? String(lab.category_id) : "",
                subcategory_id: lab.subcategory_id ? String(lab.subcategory_id) : "",
                labor_type_id: lab.labor_type_id ? String(lab.labor_type_id) : "",
                site_id: lab.site_id ? String(lab.site_id) : "",
                name: lab.name || "",
                phone: lab.phone || "",
                email: lab.email || "",
                address: lab.address || "",
                id_proof_type: lab.id_proof_type || "",
                id_proof_number: lab.id_proof_number || "",
            });
            
            setShowEditModal(true);
        } catch (e: any) {
            setError(e?.message || "Failed to load laborer details");
        }
    };

    if (loading && laborers.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Laborers</h1>
                        <p className="text-gray-600 mt-1">Manage laborer registration and details</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Laborers</h1>
                    <p className="text-gray-600 mt-1">Manage laborer registration and details</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* HR Mode Toggle */}
                    {hasHrAccess && (
                        <div className="flex items-center space-x-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={hqMode}
                                    onChange={(e) => setHqMode(e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                <span className="ml-2 text-sm font-medium text-purple-900">HR Mode</span>
                            </label>
                        </div>
                    )}

                    {(role !== "Employee" || hasPerm("LABORER_ADD")) && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Register Laborer</span>
                        </button>
                    )}
                </div>
            </div>

            {
                error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )
            }

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search laborers by name, phone, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <select
                            value={siteFilter}
                            onChange={(e) => {
                                setSiteFilter(e.target.value);
                                setContractorFilter("");
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Sites</option>
                            {sites.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <select
                            value={contractorFilter}
                            onChange={(e) => setContractorFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Contractors</option>
                            {contractors
                                .filter((c) => !siteFilter || !c.site_id || String(c.site_id) === String(siteFilter))
                                .map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Laborers List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Laborer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contractor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Valid Till
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {laborers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        <HardHat className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p>No laborers found</p>
                                    </td>
                                </tr>
                            ) : (
                                laborers.map((laborer) => (
                                    <tr key={laborer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                {laborer.face_image_url ? (
                                                    <img
                                                        src={laborer.face_image_url}
                                                        alt={laborer.name}
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openView(laborer);
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                        <User size={20} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">{laborer.name}</div>
                                                    {laborer.id_proof_type && (
                                                        <div className="text-xs text-gray-500">
                                                            {laborer.id_proof_type}: {laborer.id_proof_number}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{laborer.contractor_name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{laborer.category_name}</div>
                                            {laborer.subcategory_name && (
                                                <div className="text-xs text-gray-500">{laborer.subcategory_name}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {laborer.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Phone className="w-3 h-3 mr-1" />
                                                        {laborer.phone}
                                                    </div>
                                                )}
                                                {laborer.email && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Mail className="w-3 h-3 mr-1" />
                                                        {laborer.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {laborer.labor_type_name ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {laborer.labor_type_name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {laborer.registration_status === 'terminated' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300 uppercase tracking-tighter">
                                                    Terminated
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${laborer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {laborer.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {laborer.subscription_expiry ? (
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${new Date(laborer.subscription_expiry) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {new Date(laborer.subscription_expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    {new Date(laborer.subscription_expiry) < new Date() && (
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Expired</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => openView(laborer)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4 text-gray-600" />
                                                </button>
                                                {(role !== "Employee" || hasPerm("LABORER_EDIT")) && (
                                                    <button
                                                        onClick={() => openEdit(laborer)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                )}
                                                {(role !== "Employee" || hasPerm("LABORER_EDIT")) && laborer.registration_status !== 'terminated' && (
                                                    <button
                                                        onClick={() => handleToggleStatus(laborer)}
                                                        className={`p-1.5 rounded-lg transition-colors ${laborer.is_active ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'}`}
                                                        title={laborer.is_active ? "Mark Inactive" : "Mark Active"}
                                                    >
                                                        <PowerOff className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {(role !== "Employee" || hasPerm("LABORER_DELETE")) && laborer.registration_status !== 'terminated' && (
                                                    <button
                                                        onClick={() => handleDelete(laborer)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Terminate (Soft Delete)"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page * pageSize >= totalEntries}
                            className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${page * pageSize >= totalEntries ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{Math.min(totalEntries, (page - 1) * pageSize + 1)}</span> to <span className="font-medium">{Math.min(totalEntries, page * pageSize)}</span> of <span className="font-medium">{totalEntries}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                {/* Simple Page Indicator */}
                                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                    Page {page}
                                </span>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page * pageSize >= totalEntries}
                                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page * pageSize >= totalEntries ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal - Shared Form */}
            {
                (showCreateModal || showEditModal) && (
                    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {showCreateModal ? "Register New Laborer" : "Edit Laborer"}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setShowEditModal(false);
                                            setFaceImage(null);
                                            setFacePreview(null);
                                            setIdProofFile(null);
                                            setIdProofPreview(null);
                                            setAttachmentFile(null);
                                            setAttachmentPreview(null);
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Laborer Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Rajesh Kumar"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Site *
                                        </label>
                                        <select
                                            value={form.site_id}
                                            onChange={(e) => setForm({ ...form, site_id: e.target.value, contractor_id: "", category_id: "", subcategory_id: "" })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Site</option>
                                            {(hasHrAccess ? (allSites.length > 0 ? allSites : sites) : sites).map((s) => (
                                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contractor *
                                        </label>
                                        <select
                                            value={form.contractor_id}
                                            onChange={(e) => {
                                                setForm({ ...form, contractor_id: e.target.value, category_id: "", subcategory_id: "" });
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Contractor</option>
                                            {contractors
                                                .filter((c) => !form.site_id || !c.site_id || String(c.site_id) === String(form.site_id))
                                                .map((c) => (
                                                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                                                ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category *
                                        </label>
                                        <select
                                            value={form.category_id}
                                            onChange={(e) => {
                                                const catId = e.target.value;
                                                setForm({ ...form, category_id: catId, subcategory_id: "" });

                                                // If contractor selected, filter subcategories from assigned data
                                                if (form.contractor_id && contractorAssignedData.length > 0) {
                                                    const filtered = contractorAssignedData
                                                        .filter(item => String(item.category_id) === String(catId) && item.subcategory_id)
                                                        .map(item => ({
                                                            id: item.subcategory_id,
                                                            name: item.subcategory_name
                                                        }));

                                                    // Deduplicate just in case
                                                    const uniqueSub = filtered.reduce((acc: any[], current: any) => {
                                                        const x = acc.find((item: any) => item.id === current.id);
                                                        if (!x) return acc.concat([current]);
                                                        return acc;
                                                    }, []);

                                                    setSubcategories(uniqueSub);
                                                } else {
                                                    fetchSubcategories(catId);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={!form.contractor_id}
                                        >
                                            <option value="">Select Category</option>
                                            {contractorCategories.map((c) => (
                                                <option key={c.id} value={String(c.id)}>{c.name}</option>
                                            ))}
                                        </select>
                                        {!form.contractor_id && (
                                            <p className="text-xs text-gray-500 mt-1">Select a contractor first</p>
                                        )}
                                        {form.contractor_id && contractorCategories.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-1">This contractor has no categories assigned</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Subcategory
                                    </label>
                                    <select
                                        value={form.subcategory_id}
                                        onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={!form.category_id}
                                    >
                                        <option value="">Select Subcategory (Optional)</option>
                                        {subcategories.map((sub) => (
                                            <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                                        ))}
                                    </select>
                                    {!form.category_id && (
                                        <p className="text-xs text-gray-500 mt-1">Select a category first</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Labor Type
                                    </label>
                                    <select
                                        value={form.labor_type_id}
                                        onChange={(e) => setForm({ ...form, labor_type_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Labor Type (Optional)</option>
                                        {laborTypes.map((type) => (
                                            <option key={type.id} value={String(type.id)}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="laborer@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={2}
                                        placeholder="Full address"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            ID Proof Type
                                        </label>
                                        <select
                                            value={form.id_proof_type}
                                            onChange={(e) => setForm({ ...form, id_proof_type: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Type</option>
                                            <option value="Aadhaar">Aadhaar</option>
                                            <option value="PAN">PAN</option>
                                            <option value="Voter ID">Voter ID</option>
                                            <option value="Driving License">Driving License</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            ID Proof Number
                                        </label>
                                        <input
                                            type="text"
                                            value={form.id_proof_number}
                                            onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="ID number"
                                        />
                                    </div>
                                </div>

                                {/* Face Registration */}
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Face Registration (Recommended)
                                    </label>
                                    <p className="text-xs text-gray-600 mb-3">
                                        Upload a clear face photo for biometric attendance tracking
                                    </p>
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // Validate file size (max 5MB)
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        setError("Face image must be less than 5MB");
                                                        return;
                                                    }
                                                    setFaceImage(file);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setFacePreview(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />

                                        {faceImage && facePreview && (
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Image className="w-5 h-5 text-blue-600" />
                                                        <div>
                                                            <p className="text-sm font-medium text-blue-900">{faceImage.name}</p>
                                                            <p className="text-xs text-blue-700">
                                                                {(faceImage.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFaceImage(null);
                                                            setFacePreview(null);
                                                        }}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="mt-3">
                                                    <img
                                                        src={facePreview}
                                                        alt="Face Preview"
                                                        className="w-32 h-32 object-cover rounded-lg border-2 border-blue-300"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* ID Proof Image */}
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ID Proof Image (Optional)
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIdProofFile(file);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setIdProofPreview(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Upload ID card photo (Aadhaar, PAN, etc.)
                                        </p>

                                        {idProofFile && (
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Image className="w-5 h-5 text-purple-600" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{idProofFile.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {(idProofFile.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIdProofFile(null);
                                                            setIdProofPreview(null);
                                                        }}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {idProofPreview && (
                                                    <div className="mt-3">
                                                        <img
                                                            src={idProofPreview}
                                                            alt="ID Proof Preview"
                                                            className="max-w-full h-32 object-contain rounded border border-gray-200"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attachments */}
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Other Attachments (Optional)
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            accept="image/*,.pdf,.doc,.docx"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setAttachmentFile(file);
                                                    // Create preview for images
                                                    if (file.type.startsWith('image/')) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setAttachmentPreview(reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    } else {
                                                        setAttachmentPreview(null);
                                                    }
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Upload certificates, forms, etc.
                                        </p>

                                        {attachmentFile && (
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        {attachmentFile.type.startsWith('image/') ? (
                                                            <Image className="w-5 h-5 text-blue-600" />
                                                        ) : (
                                                            <FileText className="w-5 h-5 text-gray-600" />
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{attachmentFile.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {(attachmentFile.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAttachmentFile(null);
                                                            setAttachmentPreview(null);
                                                        }}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {attachmentPreview && (
                                                    <div className="mt-3">
                                                        <img
                                                            src={attachmentPreview}
                                                            alt="Preview"
                                                            className="max-w-full h-32 object-contain rounded border border-gray-200"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                        setFaceImage(null);
                                        setFacePreview(null);
                                        setIdProofFile(null);
                                        setIdProofPreview(null);
                                        setAttachmentFile(null);
                                        setAttachmentPreview(null);
                                    }}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={showCreateModal ? () => handleCreate(false) : handleEdit}
                                    disabled={!form.name.trim() || !form.contractor_id || !form.category_id || saving}
                                    className={`px-4 py-2 rounded-lg transition-colors ${form.name.trim() && form.contractor_id && form.category_id && !saving
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                        }`}
                                >
                                    {saving ? "Saving..." : showCreateModal ? "Register Laborer" : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div >
                )
            }

            {/* View Modal */}
            {
                showViewModal && selectedLaborer && (
                    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-900">Laborer Details</h3>
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center mb-6">
                                    <div className="relative">
                                        {selectedLaborer.face_image_url ? (
                                            <img
                                                src={selectedLaborer.face_image_url}
                                                alt={selectedLaborer.name}
                                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg cursor-pointer"
                                                onClick={() => window.open(selectedLaborer.face_image_url, "_blank")}
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 border-4 border-white shadow-lg">
                                                <User size={64} />
                                            </div>
                                        )}
                                        {selectedLaborer.registration_status === 'terminated' ? (
                                            <span className="absolute bottom-1 right-1 w-5 h-5 bg-gray-500 border-2 border-white rounded-full"></span>
                                        ) : selectedLaborer.is_active ? (
                                            <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></span>
                                        ) : (
                                            <span className="absolute bottom-1 right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full"></span>
                                        )}
                                    </div>
                                    <h3 className="mt-4 text-xl font-bold text-gray-900">{selectedLaborer.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium">{selectedLaborer.labor_type_name || 'Laborer'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Contractor</h4>
                                        <p className="text-gray-900">{selectedLaborer.contractor_name}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Category</h4>
                                        <p className="text-gray-900">
                                            {selectedLaborer.category_name}
                                            {selectedLaborer.subcategory_name && ` / ${selectedLaborer.subcategory_name}`}
                                        </p>
                                    </div>
                                </div>

                                {selectedLaborer.labor_type_name && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Labor Type</h4>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                            {selectedLaborer.labor_type_name}
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    {selectedLaborer.phone && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">Phone</h4>
                                            <p className="text-gray-900">{selectedLaborer.phone}</p>
                                        </div>
                                    )}
                                    {selectedLaborer.email && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">Email</h4>
                                            <p className="text-gray-900">{selectedLaborer.email}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedLaborer.address && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                                        <p className="text-gray-900">{selectedLaborer.address}</p>
                                    </div>
                                )}

                                {selectedLaborer.id_proof_type && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">ID Proof Type</h4>
                                            <p className="text-gray-900">{selectedLaborer.id_proof_type}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">ID Proof Number</h4>
                                            <p className="text-gray-900">{selectedLaborer.id_proof_number}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedLaborer.face_registered && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-800 font-medium">✓ Face registered for attendance</p>
                                    </div>
                                )}

                                {selectedLaborer.documents && selectedLaborer.documents.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Attachments & Documents
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {selectedLaborer.documents.map((doc: any, idx: number) => (
                                                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-md border border-gray-200">
                                                                {doc.document_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                                    <img src={doc.document_url} alt="Thumbnail" className="w-8 h-8 object-cover rounded" />
                                                                ) : (
                                                                    <FileText className="w-8 h-8 text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 line-clamp-1" title={doc.document_name || doc.document_type}>
                                                                    {doc.document_name || doc.document_type}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(doc.uploaded_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={doc.document_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 block text-center py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                    >
                                                        View Document
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedLaborer && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-amber-100 rounded-full mb-4">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Terminate Laborer?</h3>
                             <p className="text-center text-gray-600 mb-6">
                                 Are you sure you want to terminate <strong>{selectedLaborer.name}</strong>?
                                 <br />
                                 <span className="text-sm text-amber-600 mt-2 block font-medium">
                                     Biometric face data will be removed. All attendance and payment records will be preserved for history.
                                 </span>
                                 <span className="text-xs text-gray-400 mt-1 block">
                                     The laborer will no longer be able to punch for attendance.
                                 </span>
                             </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedLaborer(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex justify-center items-center"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                            Terminating...
                                        </>
                                    ) : (
                                        "Terminate"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Resolution Modal */}
            {showDuplicateModal && duplicateData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center space-x-3 text-amber-600 mb-4">
                                <AlertTriangle className="w-8 h-8" />
                                <h3 className="text-lg font-bold">Face Already Registered</h3>
                            </div>

                            <p className="text-gray-600 mb-4">
                                This face is already registered to:
                            </p>

                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-gray-900">{duplicateData.duplicate?.laborer_name || "Unknown"}</p>
                                        <p className="text-sm text-gray-500">ID: #{duplicateData.duplicate?.laborer_id}</p>
                                        <p className="text-sm text-gray-500 mt-1">Similarity: {duplicateData.duplicate?.similarity?.toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-white p-1 rounded border border-gray-200">
                                        <User className="w-8 h-8 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-6">
                                Do you want to remove the face from the old laborer and assign it to this new one? <br />
                                <span className="font-semibold text-red-600">The old laborer will remain active but without a face image.</span>
                            </p>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowDuplicateModal(false);
                                        setDuplicateData(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleCreate(true)}
                                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                                >
                                    Confirm Reassign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
