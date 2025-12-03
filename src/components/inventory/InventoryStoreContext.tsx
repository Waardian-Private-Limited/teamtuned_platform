"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

interface InventoryStore {
    id: number;
    name: string;
    site_id: number;
    site_name: string;
    is_main_store?: boolean;
    manager_id?: number;
    manager_name?: string;
}

interface InventoryStoreContextType {
    selectedStore: InventoryStore | null;
    setSelectedStore: (store: InventoryStore | null) => void;
    clearSelectedStore: () => void;
}

const InventoryStoreContext = createContext<InventoryStoreContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_inventory_store';

export function InventoryStoreProvider({ children }: { children: React.ReactNode }) {
    const [selectedStore, setSelectedStoreState] = useState<InventoryStore | null>(null);
    const [autoSelectAttempted, setAutoSelectAttempted] = useState(false);

    // Load from session storage and auto-select for store managers
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // First, try to load from session storage
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setSelectedStoreState(JSON.parse(stored));
                setAutoSelectAttempted(true);
                return;
            } catch (e) {
                console.error('Failed to parse stored inventory store:', e);
                sessionStorage.removeItem(STORAGE_KEY);
            }
        }

        // If no stored selection, try auto-select for store managers
        if (!autoSelectAttempted) {
            autoSelectStore();
        }
    }, [autoSelectAttempted]);

    const autoSelectStore = async () => {
        try {
            const res = await apiClient<{ stores: InventoryStore[] }>('/inventory/site-stores/user', {
                method: 'GET',
                withAuth: true
            });

            // If user manages exactly one store, auto-select it
            if (res?.stores?.length === 1) {
                const store = res.stores[0];
                setSelectedStoreState(store);
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
                }
            }
        } catch (e) {
            console.error('Auto-select store failed:', e);
        } finally {
            setAutoSelectAttempted(true);
        }
    };

    const setSelectedStore = (store: InventoryStore | null) => {
        setSelectedStoreState(store);
        if (typeof window !== 'undefined') {
            if (store) {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
            } else {
                sessionStorage.removeItem(STORAGE_KEY);
            }
        }
    };

    const clearSelectedStore = () => {
        setSelectedStoreState(null);
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(STORAGE_KEY);
        }
    };

    return (
        <InventoryStoreContext.Provider value={{ selectedStore, setSelectedStore, clearSelectedStore }}>
            {children}
        </InventoryStoreContext.Provider>
    );
}

export function useInventoryStore() {
    const context = useContext(InventoryStoreContext);
    if (context === undefined) {
        throw new Error('useInventoryStore must be used within an InventoryStoreProvider');
    }
    return context;
}
