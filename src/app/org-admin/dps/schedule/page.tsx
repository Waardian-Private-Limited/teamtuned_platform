"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, Building, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function DpsSchedulePage() {
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        setLoading(true);
        try {
            const res = await apiClient<any>('/dps-schedule/sites', { method: 'GET', withAuth: true });
            setSites(res.sites || []);
        } catch (error) {
            toast.error('Failed to load sites');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-10">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <Calendar className="text-blue-600" size={40} />
                        DPS Schedule
                    </h1>
                    <p className="text-gray-500 text-lg font-medium">Select a site to manage its Daily Progress System schedule.</p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-gray-50 animate-pulse rounded-3xl border border-gray-100" />
                    ))}
                </div>
            ) : sites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sites.map(site => (
                        <button
                            key={site.id}
                            onClick={() => router.push(`/org-admin/dps/schedule/${site.id}`)}
                            className="text-left bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 group flex items-start gap-4"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <Building size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-gray-900 truncate">{site.name}</h3>
                                <p className="text-sm text-gray-500 truncate">{site.code} • {site.city || 'No City'}</p>
                            </div>
                            <ChevronRight className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <Building className="text-gray-300 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-900">No Sites Found</h3>
                    <p className="text-gray-500 mt-2">You need to have active sites to manage DPS schedules.</p>
                </div>
            )}
        </div>
    );
}

