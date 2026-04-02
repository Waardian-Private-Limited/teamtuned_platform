"use client";

import React, { useEffect, useState } from "react";
import BiometricPunchScreen from "@/components/labor/BiometricPunchScreen";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import TeamTunedLoader from "@/components/common/TeamTunedLoader";

export default function OrgBiometricPage() {
    const { organization, role } = useAuth();
    const [selectedSite, setSelectedSite] = useState<{ id: number; name: string } | null>(null);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSites = async () => {
            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { 
                    method: "GET", 
                    withAuth: true,
                    params: { incharge_only: "0" }
                });
                const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                setSites(list);
                if (list.length > 0) {
                    setSelectedSite({ id: list[0].id, name: list[0].name });
                }
            } catch (err) {
                console.error("Failed to fetch sites", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSites();
    }, []);

    if (loading) return <TeamTunedLoader />;

    return (
        <div className="h-screen w-full bg-[#0B0B0D] overflow-hidden relative">
            {/* Overlay Site Selector (Hidden when camera active if needed, but here it's accessible top-left) */}
            <div className="absolute top-20 left-6 z-[60] flex flex-col gap-2 pointer-events-none">
                <div className="bg-[#1B1C1F]/90 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-[#2B2D31] flex flex-col min-w-[200px] pointer-events-auto">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-3 pt-1">Active Site</label>
                    <select 
                        className="bg-transparent text-xs font-semibold text-white p-2 outline-none cursor-pointer"
                        value={selectedSite?.id || ""}
                        onChange={(e) => {
                            const site = sites.find(s => s.id === Number(e.target.value));
                            if (site) setSelectedSite({ id: site.id, name: site.name });
                        }}
                    >
                        {sites.map(site => (
                            <option key={site.id} value={site.id} className="bg-[#1B1C1F] text-white">{site.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <BiometricPunchScreen 
                siteId={selectedSite?.id || null} 
                siteName={selectedSite?.name || organization?.name} 
                isKiosk={false}
            />
        </div>
    );
}
