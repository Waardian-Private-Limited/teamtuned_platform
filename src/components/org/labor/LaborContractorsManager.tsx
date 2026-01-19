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
    Briefcase,
    Phone,
    Mail,
    MapPin,
    DollarSign,
    Users,
    Layers,
    Check,
    Sun,
    Moon,
    Clock,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

interface SubcategoryRate {
    subcategory_id: number;
    subcategory_name: string;
    day_rate: string;
    night_rate: string;
    overtime_rate: string;
}

export default function LaborContractorsManager() {
    const { role, permissions } = useAuth();
    const [contractors, setContractors] = React.useState<any[]>([]);
    const [categories, setCategories] = React.useState<any[]>([]);
    const [allSubcategories, setAllSubcategories] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [searchTerm, setSearchTerm] = React.useState("");

    // Modals
    const [showCreateModal, setShowCreateModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [showViewModal, setShowViewModal] = React.useState(false);
    const [selectedContractor, setSelectedContractor] = React.useState<any>(null);

    // Form
    const [form, setForm] = React.useState({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
    });

    // Category & Subcategory Selection
    const [selectedCategories, setSelectedCategories] = React.useState<number[]>([]);
    const [subcategoryRates, setSubcategoryRates] = React.useState<SubcategoryRate[]>([]);

    // Document Upload
    const [documents, setDocuments] = React.useState<Array<{ file: File, type: string, name: string }>>([]);
    const [showDocumentInput, setShowDocumentInput] = React.useState(false);

    // Quick Add Modals
    const [showAddCategoryModal, setShowAddCategoryModal] = React.useState(false);
    const [showAddSubcategoryModal, setShowAddSubcategoryModal] = React.useState(false);
    const [selectedCategoryForSub, setSelectedCategoryForSub] = React.useState<number | null>(null);
    const [newCategoryName, setNewCategoryName] = React.useState("");
    const [newCategoryDesc, setNewCategoryDesc] = React.useState("");
    const [newSubcategoryName, setNewSubcategoryName] = React.useState("");
    const [newSubcategoryDesc, setNewSubcategoryDesc] = React.useState("");

    const [saving, setSaving] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [contractorToDelete, setContractorToDelete] = React.useState<number | null>(null);

    const hasPerm = (code: string) =>
        (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

    const fetchContractors = async () => {
        setLoading(true);
        setError("");
        try {
            const params: any = {};
            if (searchTerm.trim()) params.search = searchTerm.trim();

            const data = await apiClient<{ success: boolean; contractors: any[] }>(
                "/labor/contractors",
                { method: "GET", params }
            );
            setContractors(data.contractors || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load contractors");
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

            // Fetch all subcategories
            const allSubs: any[] = [];
            for (const cat of data.categories || []) {
                const subsData = await apiClient<{ success: boolean; subcategories: any[] }>(
                    `/labor/categories/${cat.id}/subcategories`,
                    { method: "GET" }
                );
                allSubs.push(...(subsData.subcategories || []).map((sub: any) => ({
                    ...sub,
                    id: Number(sub.id),
                    category_id: Number(cat.id),
                    category_name: cat.name,
                })));
            }
            setAllSubcategories(allSubs);
        } catch (e: any) {
            console.error("Failed to load categories:", e);
        }
    };

    React.useEffect(() => {
        fetchContractors();
        fetchCategories();
    }, []);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            fetchContractors();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const handleCategoryToggle = (categoryId: number) => {
        if (selectedCategories.includes(categoryId)) {
            // Remove category and its subcategories from rates
            setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
            setSubcategoryRates(subcategoryRates.filter(rate => {
                const sub = allSubcategories.find(s => s.id === rate.subcategory_id);
                return sub?.category_id !== categoryId;
            }));
        } else {
            // Just add category (don't auto-add subcategories)
            setSelectedCategories([...selectedCategories, categoryId]);
        }
    };

    const handleSubcategoryToggle = (subcategoryId: number, subcategoryName: string) => {
        const existing = subcategoryRates.find(r => r.subcategory_id === subcategoryId);
        if (existing) {
            // Remove subcategory
            setSubcategoryRates(subcategoryRates.filter(r => r.subcategory_id !== subcategoryId));
        } else {
            // Add subcategory with empty rates
            setSubcategoryRates([...subcategoryRates, {
                subcategory_id: subcategoryId,
                subcategory_name: subcategoryName,
                day_rate: "",
                night_rate: "",
                overtime_rate: "",
            }]);
        }
    };

    const updateSubcategoryRate = (subcategoryId: number, field: string, value: string) => {
        setSubcategoryRates(subcategoryRates.map(rate =>
            rate.subcategory_id === subcategoryId
                ? { ...rate, [field]: value }
                : rate
        ));
    };

    const handleQuickAddCategory = async () => {
        if (!newCategoryName.trim()) {
            setError("Category name is required");
            return;
        }
        try {
            await apiClient("/labor/categories", {
                method: "POST",
                body: { name: newCategoryName.trim(), description: newCategoryDesc.trim() || null }
            });
            setNewCategoryName("");
            setNewCategoryDesc("");
            setShowAddCategoryModal(false);
            await fetchCategories(); // Refresh categories list
        } catch (e: any) {
            setError(e?.message || "Failed to create category");
        }
    };

    const handleQuickAddSubcategory = async () => {
        if (!newSubcategoryName.trim() || !selectedCategoryForSub) {
            setError("Subcategory name and category are required");
            return;
        }
        try {
            await apiClient(`/labor/categories/${selectedCategoryForSub}/subcategories`, {
                method: "POST",
                body: { name: newSubcategoryName.trim(), description: newSubcategoryDesc.trim() || null }
            });
            setNewSubcategoryName("");
            setNewSubcategoryDesc("");
            setShowAddSubcategoryModal(false);
            setSelectedCategoryForSub(null);
            await fetchCategories(); // Refresh categories and subcategories list
        } catch (e: any) {
            setError(e?.message || "Failed to create subcategory");
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        setSaving(true);
        try {
            await apiClient("/labor/categories", {
                method: "POST",
                body: {
                    name: newCategoryName.trim(),
                    description: newCategoryDesc.trim() || undefined,
                },
            });
            await fetchCategories();
            setShowAddCategoryModal(false);
            setNewCategoryName("");
            setNewCategoryDesc("");
        } catch (e: any) {
            setError(e?.message || "Failed to create category");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateSubcategory = async () => {
        if (!selectedCategoryForSub || !newSubcategoryName.trim()) return;

        setSaving(true);
        try {
            await apiClient("/labor/subcategories", {
                method: "POST",
                body: {
                    category_id: selectedCategoryForSub,
                    name: newSubcategoryName.trim(),
                    description: newSubcategoryDesc.trim() || undefined,
                },
            });
            await fetchCategories(); // Refetch to get updated subcategories
            setShowAddSubcategoryModal(false);
            setNewSubcategoryName("");
            setNewSubcategoryDesc("");
            // Don't reset selectedCategoryForSub so user can add more to same category
        } catch (e: any) {
            setError(e?.message || "Failed to create subcategory");
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!form.name.trim()) {
            setError("Contractor name is required");
            return;
        }

        setSaving(true);
        setError("");
        try {
            const payload: any = {
                name: form.name.trim(),
                contact_person: form.contact_person.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                address: form.address.trim() || null,
                categories: selectedCategories,
            };

            const response = await apiClient<{ success: boolean; contractor: any }>(
                "/labor/contractors",
                {
                    method: "POST",
                    body: payload,
                }
            );

            const contractorId = response.contractor.id;

            // Link Categories and Subcategories explicitly
            const categoriesToLink: { category_id: number; subcategory_id: number | null }[] = selectedCategories.map(catId => ({
                category_id: catId,
                subcategory_id: null
            }));

            for (const rate of subcategoryRates) {
                const sub = allSubcategories.find(s => s.id === rate.subcategory_id);
                if (sub) {
                    categoriesToLink.push({
                        category_id: sub.category_id,
                        subcategory_id: rate.subcategory_id
                    });
                }
            }

            if (categoriesToLink.length > 0) {
                await apiClient(`/labor/contractors/${contractorId}/categories`, {
                    method: "POST",
                    body: { categories: categoriesToLink }
                });
            }

            // Create rates for each subcategory
            for (const rate of subcategoryRates) {
                if (rate.day_rate || rate.night_rate || rate.overtime_rate) {
                    const sub = allSubcategories.find(s => s.id === rate.subcategory_id);
                    await apiClient(`/labor/contractors/${contractorId}/category-rates`, {
                        method: "POST",
                        body: {
                            category_id: sub?.category_id,
                            subcategory_id: rate.subcategory_id,
                            day_rate: rate.day_rate ? parseFloat(rate.day_rate) : null,
                            night_rate: rate.night_rate ? parseFloat(rate.night_rate) : null,
                            overtime_rate: rate.overtime_rate ? parseFloat(rate.overtime_rate) : null,
                            effective_from: new Date().toISOString().split('T')[0],
                        },
                    });
                }
            }

            setShowCreateModal(false);
            resetForm();
            fetchContractors();
        } catch (e: any) {
            setError(e?.message || "Failed to create contractor");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: "",
            contact_person: "",
            phone: "",
            email: "",
            address: "",
        });
        setSelectedCategories([]);
        setSubcategoryRates([]);
        setDocuments([]);
        setShowDocumentInput(false);
    };

    const handleEdit = async () => {
        if (!selectedContractor || !form.name.trim()) return;

        setSaving(true);
        setError("");
        try {
            // 1. Update basic info
            await apiClient(`/labor/contractors/${selectedContractor.id}`, {
                method: "PUT",
                body: {
                    name: form.name.trim(),
                    contact_person: form.contact_person.trim() || null,
                    phone: form.phone.trim() || null,
                    email: form.email.trim() || null,
                    address: form.address.trim() || null,
                },
            });

            // 2. Link Categories
            // Prepare unique category IDs (map allows subcategories from removed categories to stay if wanted, but standard flow links categories first)
            // The `linkContractorCategories` endpoint expects an array of categories/subcategories. 
            // However, our UI primarily selects categories (via checkboxes) and then subcategories separately.
            // The backend `linkContractorCategories` seems to expect {categories: [{category_id, subcategory_id}]}.
            // Based on `createContractor` flow (line 297 in backend controller), it inserts into `contractor_categories`.
            // Wait, `createContractor` inserts `(organization_id, contractor_id, category_id)` for base categories.
            // `linkContractorCategories` (line 604 in controller) deletes existing and inserts new pairs.
            // Let's mimic what `createContractor` did but using the dedicated link endpoint if available or constructing it manually.
            // `linkContractorCategories` deletes everything for that contractor and re-inserts.
            // We need to construct the full list of (category, subcategory) pairs.
            // From our state: `selectedCategories` lists generic category IDs. `subcategoryRates` lists specific subcategories.

            // Actually, let's look at `createContractor`. It only inserts `contractor_categories` with `category_id` (no subcategory_id in that default block).
            // Then it inserts `contractor_category_rates`.
            // We should use `linkContractorCategories` to potentialy update the base category links.
            // But if `createContractor` only associates categories without subcategories initially, let's stick to that pattern if possible?
            // Checking logic: `createContractor` lines 294-297: inserts (orgId, contractorId, catId).
            // `linkContractorCategories` lines 631-643: inserts map of {category_id, subcategory_id}.

            // Let's constructing a list of objects for `linkContractorCategories`.
            // We want to link all `selectedCategories` (as generic headers)
            const categoriesToLink: { category_id: number; subcategory_id: number | null }[] = selectedCategories.map(catId => ({
                category_id: catId,
                subcategory_id: null
            }));

            // AND link specific subcategories from the rates list
            // This ensures they are marked as "enabled" even without looking at rates table
            for (const rate of subcategoryRates) {
                // Avoid duplication if logic assumes uniqueness, but backend handles delete/insert
                // We need to find the category for this subcategory
                const sub = allSubcategories.find(s => s.id === rate.subcategory_id);
                if (sub) {
                    categoriesToLink.push({
                        category_id: sub.category_id,
                        subcategory_id: rate.subcategory_id
                    });
                }
            }

            if (categoriesToLink.length > 0) {
                await apiClient(`/labor/contractors/${selectedContractor.id}/categories`, {
                    method: "POST",
                    body: { categories: categoriesToLink }
                });
            } else {
                // If empty, we should probably send empty list to clear them?
                // The endpoint checks for empty array and throws error... "Categories array is required".
                // If user deselected everything, we can't clear it via this endpoint easily unless we modify backend.
                // For now assuming at least one category.
            }

            // 3. Update Rates
            // The `setContractorCategoryRates` endpoint inserts new rate records (history).
            // We should iterate and add them.
            // Optimization: Only send rates that changed? Or just add new effective entry for today?
            // Simple approach: Add new entry for all active rates effective today.
            for (const rate of subcategoryRates) {
                if (rate.day_rate || rate.night_rate || rate.overtime_rate) { // Allow partial updates if one is set
                    const sub = allSubcategories.find(s => s.id === rate.subcategory_id);
                    // Only update if it belongs to a selected category
                    if (sub && selectedCategories.includes(sub.category_id)) {
                        await apiClient(`/labor/contractors/${selectedContractor.id}/category-rates`, {
                            method: "POST",
                            body: {
                                category_id: sub.category_id,
                                subcategory_id: rate.subcategory_id,
                                day_rate: rate.day_rate ? parseFloat(rate.day_rate) : null,
                                night_rate: rate.night_rate ? parseFloat(rate.night_rate) : null,
                                overtime_rate: rate.overtime_rate ? parseFloat(rate.overtime_rate) : null,
                                effective_from: new Date().toISOString().split('T')[0],
                            },
                        });
                    }
                }
            }

            setShowEditModal(false);
            setSelectedContractor(null);
            resetForm();
            fetchContractors();
        } catch (e: any) {
            setError(e?.message || "Failed to update contractor");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setContractorToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!contractorToDelete) return;

        try {
            await apiClient(`/labor/contractors/${contractorToDelete}`, { method: "DELETE" });
            setShowDeleteConfirm(false);
            setContractorToDelete(null);
            fetchContractors();
        } catch (e: any) {
            setError(e?.message || "Failed to delete contractor");
        }
    };

    const openView = async (contractor: any) => {
        try {
            const data = await apiClient<{ success: boolean; contractor: any }>(
                `/labor/contractors/${contractor.id}`,
                { method: "GET" }
            );

            if (data.contractor) {
                const fullContractor = data.contractor;
                setSelectedContractor(fullContractor);

                // Set categories for view (deduplicate since we may have multiple entries per category)
                const categoryIds = Array.from(new Set(
                    (fullContractor.categories || [])
                        .map((c: any) => Number(c.category_id))
                        .filter((id: number) => id > 0)
                )) as number[];
                setSelectedCategories(categoryIds);

                // Set rates for view
                // Merge explicit links and rates to show all checked items
                const validRates: SubcategoryRate[] = [];
                const explicitLinks = fullContractor.categories || [];
                const distinctSubIds = new Set<number>();

                // First, add all from rate card (only those with subcategory_id)
                (fullContractor.category_rates || []).forEach((r: any) => {
                    const sId = Number(r.subcategory_id);
                    if (sId && !distinctSubIds.has(sId)) {
                        distinctSubIds.add(sId);
                        validRates.push({
                            subcategory_id: sId,
                            subcategory_name: r.subcategory_name,
                            day_rate: r.day_rate ? String(r.day_rate) : "",
                            night_rate: r.night_rate ? String(r.night_rate) : "",
                            overtime_rate: r.overtime_rate ? String(r.overtime_rate) : "",
                        });
                    }
                });

                // Then add any that are explicitly linked but have no rates (so they show up)
                explicitLinks.forEach((l: any) => {
                    const sId = Number(l.subcategory_id);
                    if (sId && !distinctSubIds.has(sId)) {
                        distinctSubIds.add(sId);
                        validRates.push({
                            subcategory_id: sId,
                            subcategory_name: l.subcategory_name,
                            day_rate: "",
                            night_rate: "",
                            overtime_rate: "",
                        });
                    }
                });

                setSubcategoryRates(validRates);
            }

            setShowViewModal(true);
        } catch (e: any) {
            setError(e?.message || "Failed to load contractor details");
        }
    };

    const openEdit = async (contractor: any) => {
        try {
            // First set basic info to show modal immediately
            setSelectedContractor(contractor);
            setForm({
                name: contractor.name,
                contact_person: contractor.contact_person || "",
                phone: contractor.phone || "",
                email: contractor.email || "",
                address: contractor.address || "",
            });
            setShowEditModal(true);

            // Fetch full details including categories and rates
            const data = await apiClient<{ success: boolean; contractor: any }>(
                `/labor/contractors/${contractor.id}`,
                { method: "GET" }
            );

            if (data.contractor) {
                const fullContractor = data.contractor;

                // Set categories (deduplicate since we may have multiple entries per category)
                const categoryIds = Array.from(new Set(
                    (fullContractor.categories || [])
                        .map((c: any) => Number(c.category_id))
                        .filter((id: number) => id > 0)
                )) as number[];
                setSelectedCategories(categoryIds);

                // Set rates
                // Merge explicit links and rates to populate form
                const validRates: SubcategoryRate[] = [];
                const explicitLinks = fullContractor.categories || [];
                const distinctSubIds = new Set<number>();

                // First, add all from rate card (only those with subcategory_id)
                (fullContractor.category_rates || []).forEach((r: any) => {
                    const sId = Number(r.subcategory_id);
                    if (sId && !distinctSubIds.has(sId)) {
                        distinctSubIds.add(sId);
                        validRates.push({
                            subcategory_id: sId,
                            subcategory_name: r.subcategory_name,
                            day_rate: r.day_rate ? String(r.day_rate) : "",
                            night_rate: r.night_rate ? String(r.night_rate) : "",
                            overtime_rate: r.overtime_rate ? String(r.overtime_rate) : "",
                        });
                    }
                });

                // Then add any that are explicitly linked but have no rates (so they show up checked)
                explicitLinks.forEach((l: any) => {
                    const sId = Number(l.subcategory_id);
                    if (sId && !distinctSubIds.has(sId)) {
                        distinctSubIds.add(sId);
                        validRates.push({
                            subcategory_id: sId,
                            subcategory_name: l.subcategory_name || "", // Name might be missing if simple join, but we updated query
                            day_rate: "",
                            night_rate: "",
                            overtime_rate: "",
                        });
                    }
                });

                setSubcategoryRates(validRates);
            }
        } catch (e: any) {
            console.error("Failed to fetch full contractor details:", e);
            setError("Failed to load full contractor details");
        }
    };

    const filteredContractors = contractors.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.contact_person || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || "").includes(searchTerm)
    );

    if (loading && contractors.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Labor Contractors</h1>
                        <p className="text-gray-600 mt-1">Manage contractors and their pricing</p>
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
                    <h1 className="text-2xl font-bold text-gray-900">Labor Contractors</h1>
                    <p className="text-gray-600 mt-1">Manage contractors and their pricing</p>
                </div>
                {(role !== "Employee" || hasPerm("LABOR_CONTRACTOR_ADD")) && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Contractor</span>
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search contractors by name, contact person, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Contractors List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contractor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categories
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Laborers
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredContractors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        <Briefcase className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p>No contractors found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredContractors.map((contractor) => (
                                    <tr key={contractor.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{contractor.name}</div>
                                                {contractor.contact_person && (
                                                    <div className="text-sm text-gray-500">{contractor.contact_person}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {contractor.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Phone className="w-4 h-4 mr-1" />
                                                        {contractor.phone}
                                                    </div>
                                                )}
                                                {contractor.email && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Mail className="w-4 h-4 mr-1" />
                                                        {contractor.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {contractor.category_count || 0} categories
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {contractor.laborer_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => openView(contractor)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4 text-gray-600" />
                                                </button>
                                                {(role !== "Employee" || hasPerm("LABOR_CONTRACTOR_EDIT")) && (
                                                    <button
                                                        onClick={() => openEdit(contractor)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                )}
                                                {(role !== "Employee" || hasPerm("LABOR_CONTRACTOR_DELETE")) && (
                                                    <button
                                                        onClick={() => handleDelete(contractor.id)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Delete"
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
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Add New Contractor</h3>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-900">Basic Information</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contractor Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., ABC Construction"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        value={form.contact_person}
                                        onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., John Doe"
                                    />
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
                                            placeholder="contractor@example.com"
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
                            </div>

                            {/* Categories & Subcategories */}
                            <div className="border-t border-gray-200 pt-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-gray-900">Categories & Subcategories</h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCategoryModal(true)}
                                        className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Category</span>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600">Select categories this contractor provides and set rates for each subcategory</p>

                                <div className="space-y-3">
                                    {categories.map((category) => {
                                        const isSelected = selectedCategories.includes(category.id);
                                        const categorySubcategories = allSubcategories.filter(sub => sub.category_id === category.id);

                                        return (
                                            <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCategoryToggle(category.id)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <label className="font-medium text-gray-900">{category.name}</label>
                                                    <span className="text-sm text-gray-500">({categorySubcategories.length} subcategories)</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCategoryForSub(category.id);
                                                            setShowAddSubcategoryModal(true);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                                        title="Add Subcategory"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {isSelected && categorySubcategories.length > 0 && (
                                                    <div className="ml-7 space-y-3 mt-3 border-t border-gray-100 pt-3">
                                                        {categorySubcategories.map((sub) => {
                                                            const rate = subcategoryRates.find(r => r.subcategory_id === sub.id);
                                                            const isSubSelected = !!rate;
                                                            return (
                                                                <div key={sub.id} className={`rounded-lg p-3 ${isSubSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSubSelected}
                                                                            onChange={() => handleSubcategoryToggle(sub.id, sub.name)}
                                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                        />
                                                                        <Layers className="w-4 h-4 text-gray-400" />
                                                                        <span className="font-medium text-sm text-gray-900">{sub.name}</span>
                                                                    </div>
                                                                    {isSubSelected && (
                                                                        <div className="grid grid-cols-3 gap-3 ml-6">
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    <Sun className="w-3 h-3 inline mr-1" />
                                                                                    Day Rate (₹)
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={rate?.day_rate || ""}
                                                                                    onChange={(e) => updateSubcategoryRate(sub.id, "day_rate", e.target.value)}
                                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                    placeholder="500"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    <Moon className="w-3 h-3 inline mr-1" />
                                                                                    Night Rate (₹)
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={rate?.night_rate || ""}
                                                                                    onChange={(e) => updateSubcategoryRate(sub.id, "night_rate", e.target.value)}
                                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                    placeholder="600"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                                                    Overtime (₹)
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={rate?.overtime_rate || ""}
                                                                                    onChange={(e) => updateSubcategoryRate(sub.id, "overtime_rate", e.target.value)}
                                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                    placeholder="700"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                                    resetForm();
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!form.name.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${form.name.trim() && !saving
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Creating..." : "Create Contractor"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal - Keep existing simple version */}
            {showEditModal && selectedContractor && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Edit Contractor</h3>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-900 mb-4">Basic Information</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contractor Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            value={form.contact_person}
                                            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
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
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Categories & Subcategories (Same as Add Modal) */}
                            <div className="border-t border-gray-200 pt-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-gray-900">Categories & Subcategories</h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCategoryModal(true)}
                                        className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Category</span>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600">Update categories provided by this contractor and their rates</p>

                                <div className="space-y-3">
                                    {categories.map((category) => {
                                        const isSelected = selectedCategories.includes(category.id);
                                        const categorySubcategories = allSubcategories.filter(sub => sub.category_id === category.id);

                                        return (
                                            <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCategoryToggle(category.id)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <label className="font-medium text-gray-900">{category.name}</label>
                                                    <span className="text-sm text-gray-500">({categorySubcategories.length} subcategories)</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCategoryForSub(category.id);
                                                            setShowAddSubcategoryModal(true);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                                        title="Add Subcategory"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {isSelected && categorySubcategories.length > 0 && (
                                                    <div className="ml-7 space-y-3 mt-3 border-t border-gray-100 pt-3">
                                                        {categorySubcategories.map((sub) => {
                                                            const rate = subcategoryRates.find(r => r.subcategory_id === sub.id);
                                                            const isSubSelected = !!rate;
                                                            return (
                                                                <div key={sub.id} className={`rounded-lg p-3 ${isSubSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSubSelected}
                                                                            onChange={() => handleSubcategoryToggle(sub.id, sub.name)}
                                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                        />
                                                                        <Layers className="w-4 h-4 text-gray-400" />
                                                                        <span className="font-medium text-sm text-gray-900">{sub.name}</span>
                                                                    </div>
                                                                    {isSubSelected && (
                                                                        <div className="grid grid-cols-3 gap-3 ml-6">
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    <Sun className="w-3 h-3 inline mr-1" />
                                                                                    Day Rate (₹)
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={rate?.day_rate || ""}
                                                                                    onChange={(e) => updateSubcategoryRate(sub.id, "day_rate", e.target.value)}
                                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                    placeholder="500"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    <Moon className="w-3 h-3 inline mr-1" />
                                                                                    Night Rate (₹)
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={rate?.night_rate || ""}
                                                                                    onChange={(e) => updateSubcategoryRate(sub.id, "night_rate", e.target.value)}
                                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                    placeholder="600"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600 mb-1">
                                                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                                                    Overtime (₹)
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={rate?.overtime_rate || ""}
                                                                                    onChange={(e) => updateSubcategoryRate(sub.id, "overtime_rate", e.target.value)}
                                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                    placeholder="700"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={!form.name.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${form.name.trim() && !saving
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal - Keep existing */}
            {showViewModal && selectedContractor && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Contractor Details</h3>
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Contractor Name</h4>
                                <p className="text-lg font-medium text-gray-900">{selectedContractor.name}</p>
                            </div>

                            {selectedContractor.contact_person && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Person</h4>
                                    <p className="text-gray-900">{selectedContractor.contact_person}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                {selectedContractor.phone && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Phone</h4>
                                        <p className="text-gray-900">{selectedContractor.phone}</p>
                                    </div>
                                )}
                                {selectedContractor.email && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Email</h4>
                                        <p className="text-gray-900">{selectedContractor.email}</p>
                                    </div>
                                )}
                            </div>

                            {selectedContractor.address && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                                    <p className="text-gray-900">{selectedContractor.address}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Total Laborers</h4>
                                    <p className="text-2xl font-bold text-gray-900">{selectedContractor.laborer_count || 0}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Categories</h4>
                                    <p className="text-2xl font-bold text-gray-900">{selectedContractor.category_count || 0}</p>
                                </div>
                            </div>

                            {/* Rate Card Display */}
                            <div className="border-t border-gray-200 pt-6">
                                <h4 className="text-lg font-medium text-gray-900 mb-4">Rate Card</h4>
                                {selectedCategories.length > 0 ? (
                                    <div className="space-y-6">
                                        {selectedCategories.map((catId: number) => {
                                            const category = categories.find(c => c.id === catId);
                                            const categoryRates = subcategoryRates.filter(r => {
                                                const sub = allSubcategories.find(s => s.id === r.subcategory_id);
                                                return sub?.category_id === catId;
                                            });

                                            if (!category || categoryRates.length === 0) return null;

                                            return (
                                                <div key={catId} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                                    <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                                                        <h5 className="font-semibold text-gray-800">{category.name}</h5>
                                                    </div>
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subcategory</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day Rate</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Night Rate</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {categoryRates.map((rate) => (
                                                                <tr key={rate.subcategory_id}>
                                                                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                                                                        {rate.subcategory_name}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-sm text-gray-600">
                                                                        ₹{rate.day_rate || "-"}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-sm text-gray-600">
                                                                        ₹{rate.night_rate || "-"}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-sm text-gray-600">
                                                                        ₹{rate.overtime_rate || "-"}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No rate card configured.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Quick Add Category Modal */}
            {showAddCategoryModal && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Skilled"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newCategoryDesc}
                                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowAddCategoryModal(false)}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateCategory}
                                disabled={!newCategoryName.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${newCategoryName.trim() && !saving
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Creating..." : "Create Category"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Subcategory Modal */}
            {showAddSubcategoryModal && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Subcategory</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={newSubcategoryName}
                                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Mason"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newSubcategoryDesc}
                                    onChange={(e) => setNewSubcategoryDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowAddSubcategoryModal(false)}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSubcategory}
                                disabled={!newSubcategoryName.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${newSubcategoryName.trim() && !saving
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Creating..." : "Create Subcategory"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-600" />
                        </div>

                        <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                            Delete Contractor?
                        </h3>

                        <p className="text-gray-600 text-center mb-6">
                            Are you sure you want to delete this contractor? This action cannot be undone and will remove all associated data.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setContractorToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
