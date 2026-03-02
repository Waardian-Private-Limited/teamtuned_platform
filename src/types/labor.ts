export interface Category {
    id: number;
    name: string;
}

export interface Subcategory {
    id: number;
    category_id: number;
    name: string;
}

export interface StandardRate {
    id: number;
    category_id: number;
    subcategory_id?: number | null;
    category_name: string;
    subcategory_name?: string | null;
    day_rate: string | number;
    night_rate: string | number;
    overtime_rate?: string | number;
    effective_from?: string | null;
    effective_to?: string | null;
    is_active: boolean;
}

export interface DailyRateCard {
    id?: number;
    rate_date: string;
    contractor_id: number;
    site_id: number;
    category_id: number;
    subcategory_id?: number | null;
    day_rate: string | number;
    night_rate: string | number;
    overtime_rate?: string | number;
    notes?: string;
    is_active?: boolean;
}

export interface RateRow {
    key: string;
    category_id: number;
    subcategory_id?: number | null;
    category_name: string;
    subcategory_name?: string;
    day_rate: string | number;
    night_rate: string | number;
    overtime_rate?: string | number;
    notes: string;
}

export interface Contractor {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    // ... other fields
}
