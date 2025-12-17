"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    MapPin,
    Plus,
    Pencil,
    Trash2,
    Home,
    Briefcase,
    Users,
    X,
    Search,
    Filter,
} from "lucide-react";

type OtherLocation = {
    id: number;
    location_name: string;
    location_type: "home" | "client" | "field" | "other";
    address: string;
    latitude: number;
    longitude: number;
    radius: number;
    assigned_count: number;
    created_by_name?: string;
    created_by_last_name?: string;
    created_at: string;
};

export default function OtherLocationsPage() {
    const [locations, setLocations] = useState<OtherLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("");
    const [showModal, setShowModal] = useState(false);
    const [editingLocation, setEditingLocation] = useState<OtherLocation | null>(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const data = await apiClient<{ locations: OtherLocation[] }>(
                "/organization/employees/other-locations",
                { method: "GET" }
            );
            setLocations(data.locations || []);
        } catch (error) {
            console.error("Error fetching locations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (locationId: number) => {
        if (!confirm("Are you sure you want to delete this location?")) return;

        try {
            await apiClient(`/organization/employees/other-locations/${locationId}`, {
                method: "DELETE",
            });
            fetchLocations();
        } catch (error: any) {
            alert(error.message || "Failed to delete location");
        }
    };

    const getLocationIcon = (type: string) => {
        switch (type) {
            case "home":
                return <Home className="w-5 h-5 text-blue-600" />;
            case "client":
                return <Briefcase className="w-5 h-5 text-green-600" />;
            case "field":
                return <MapPin className="w-5 h-5 text-purple-600" />;
            default:
                return <MapPin className="w-5 h-5 text-gray-600" />;
        }
    };

    const getLocationTypeColor = (type: string) => {
        switch (type) {
            case "home":
                return "bg-blue-100 text-blue-800";
            case "client":
                return "bg-green-100 text-green-800";
            case "field":
                return "bg-purple-100 text-purple-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const filteredLocations = locations.filter((loc) => {
        const matchesSearch =
            loc.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.address?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !filterType || loc.location_type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Other Locations</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage non-site locations for field workers and drivers
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingLocation(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Location
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search locations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All Types</option>
                        <option value="home">Home</option>
                        <option value="client">Client</option>
                        <option value="field">Field</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Locations</p>
                            <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
                        </div>
                        <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600">Home Locations</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {locations.filter((l) => l.location_type === "home").length}
                            </p>
                        </div>
                        <Home className="w-8 h-8 text-blue-400" />
                    </div>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600">Client Sites</p>
                            <p className="text-2xl font-bold text-green-900">
                                {locations.filter((l) => l.location_type === "client").length}
                            </p>
                        </div>
                        <Briefcase className="w-8 h-8 text-green-400" />
                    </div>
                </div>
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600">Field Locations</p>
                            <p className="text-2xl font-bold text-purple-900">
                                {locations.filter((l) => l.location_type === "field").length}
                            </p>
                        </div>
                        <MapPin className="w-8 h-8 text-purple-400" />
                    </div>
                </div>
            </div>

            {/* Locations Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">Loading...</div>
                ) : filteredLocations.length === 0 ? (
                    <div className="p-8 text-center">
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No locations found</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Create First Location
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {filteredLocations.map((location) => (
                            <div
                                key={location.id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {getLocationIcon(location.location_type)}
                                        <h3 className="font-semibold text-gray-900">
                                            {location.location_name}
                                        </h3>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingLocation(location);
                                                setShowModal(true);
                                            }}
                                            className="p-1.5 hover:bg-gray-100 rounded"
                                        >
                                            <Pencil className="w-4 h-4 text-gray-600" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(location.id)}
                                            className="p-1.5 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-3">{location.address}</p>

                                <div className="flex items-center justify-between text-xs">
                                    <span
                                        className={`px-2 py-1 rounded-full capitalize ${getLocationTypeColor(
                                            location.location_type
                                        )}`}
                                    >
                                        {location.location_type}
                                    </span>
                                    <div className="flex items-center gap-3 text-gray-500">
                                        <span>{location.radius}m radius</span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {location.assigned_count}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <LocationModal
                    location={editingLocation}
                    onClose={() => {
                        setShowModal(false);
                        setEditingLocation(null);
                    }}
                    onSave={() => {
                        setShowModal(false);
                        setEditingLocation(null);
                        fetchLocations();
                    }}
                />
            )}
        </div>
    );
}

// Location Modal Component
function LocationModal({
    location,
    onClose,
    onSave,
}: {
    location: OtherLocation | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        location_name: location?.location_name || "",
        location_type: location?.location_type || "other",
        address: location?.address || "",
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        radius: location?.radius || 100,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.location_name || !formData.latitude || !formData.longitude) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            setSaving(true);
            if (location) {
                await apiClient(`/organization/employees/other-locations/${location.id}`, {
                    method: "PUT",
                    body: formData,
                });
            } else {
                await apiClient("/organization/employees/other-locations", {
                    method: "POST",
                    body: formData,
                });
            }
            onSave();
        } catch (error: any) {
            alert(error.message || "Failed to save location");
        } finally {
            setSaving(false);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData({
                        ...formData,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    alert("Failed to get current location");
                }
            );
        }
    };

    return (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">
                            {location ? "Edit Location" : "Add New Location"}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location Name *
                        </label>
                        <input
                            type="text"
                            value={formData.location_name}
                            onChange={(e) =>
                                setFormData({ ...formData, location_name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g., Driver Home - Mumbai"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location Type *
                        </label>
                        <select
                            value={formData.location_type}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    location_type: e.target.value as any,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="home">Home</option>
                            <option value="client">Client Site</option>
                            <option value="field">Field Location</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                            rows={2}
                            placeholder="Full address"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Latitude *
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={formData.latitude}
                                onChange={(e) =>
                                    setFormData({ ...formData, latitude: parseFloat(e.target.value) })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Longitude *
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={formData.longitude}
                                onChange={(e) =>
                                    setFormData({ ...formData, longitude: parseFloat(e.target.value) })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={getCurrentLocation}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        <MapPin className="w-4 h-4" />
                        Use Current Location
                    </button>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Geo-fence Radius (meters)
                        </label>
                        <input
                            type="number"
                            value={formData.radius}
                            onChange={(e) =>
                                setFormData({ ...formData, radius: parseInt(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                            min="10"
                            max="5000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Employees must be within this radius to check in
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : location ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
