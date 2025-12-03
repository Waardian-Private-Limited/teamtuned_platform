"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Store, MapPin, User, CheckCircle2, Building2 } from "lucide-react";
import { useInventoryStore } from "./InventoryStoreContext";

interface InventoryStore {
    id: number;
    name: string;
    site_id: number;
    site_name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    manager_id?: number;
    store_manager_id?: number;
    manager_name?: string;
    status: string;
    is_main_store?: number;
}

export default function StoreSelector() {
    const [stores, setStores] = useState<InventoryStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { selectedStore, setSelectedStore } = useInventoryStore();

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            const res = await apiClient<{ stores: InventoryStore[] }>('/inventory/site-stores/user', {
                method: 'GET',
                withAuth: true
            });
            setStores(res?.stores || []);
        } catch (err: any) {
            console.error("Failed to fetch stores:", err);
            setError(err?.message || 'Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStore = (store: InventoryStore) => {
        setSelectedStore({
            id: store.id,
            name: store.name,
            site_id: store.site_id,
            site_name: store.site_name,
            is_main_store: Boolean(store.is_main_store),
            manager_id: store.store_manager_id ?? store.manager_id,
            manager_name: store.manager_name
        });
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Store className="text-indigo-600" size={28} />
                    Select Inventory Store
                </h1>
                <p className="text-slate-600 mt-2">
                    Choose the store you want to work with. This selection will be active for your current session.
                </p>
            </div>

            {selectedStore && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center gap-2 text-indigo-900 font-medium mb-1">
                        <CheckCircle2 size={18} className="text-indigo-600" />
                        Currently Selected Store
                    </div>
                    <div className="text-indigo-700 ml-6">
                        <div className="font-semibold">{selectedStore.name}</div>
                        <div className="text-sm">{selectedStore.site_name}</div>
                    </div>
                </div>
            )}

            {stores.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Store className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600 mb-2">No stores available</p>
                    <p className="text-sm text-slate-500">
                        You don't have access to any inventory stores. Contact your administrator if you believe this is an error.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stores.map((store) => {
                        const isSelected = selectedStore?.id === store.id;
                        const fullAddress = [store.address, store.city, store.state, store.pincode]
                            .filter(Boolean)
                            .join(', ');

                        return (
                            <button
                                key={store.id}
                                onClick={() => handleSelectStore(store)}
                                className={`text-left p-5 rounded-lg border-2 transition-all ${isSelected
                                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Building2
                                            size={20}
                                            className={isSelected ? 'text-indigo-600' : 'text-slate-600'}
                                        />
                                        <h3 className={`font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                            {store.name}
                                        </h3>
                                        {store.is_main_store ? (
                                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Main Store</span>
                                        ) : null}
                                    </div>
                                    {isSelected && (
                                        <CheckCircle2 size={20} className="text-indigo-600 flex-shrink-0" />
                                    )}
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-start gap-2 text-slate-600">
                                        <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-slate-700">{store.site_name}</div>
                                            {fullAddress && (
                                                <div className="text-xs text-slate-500 mt-0.5">{fullAddress}</div>
                                            )}
                                        </div>
                                    </div>

                                    {store.manager_name && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <User size={16} className="flex-shrink-0" />
                                            <span>Manager: {store.manager_name}</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
