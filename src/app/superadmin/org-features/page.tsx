"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Search, ArrowRight, Activity, Calendar } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { format } from "date-fns";

interface Organization {
    id: number;
    organization_name: string;
    email: string;
    status: string;
    created_at: string;
}

export default function OrgFeaturesPage() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchOrgs();
    }, []);

    const fetchOrgs = async () => {
        try {
            // Assuming listOrganizations endpoint exists and returns array
            const data = await apiClient<Organization[]>("/superadmin/organizations");
            setOrgs(data);
        } catch (error) {
            console.error("Failed to fetch organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrgs = orgs.filter((org) =>
        org.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        Organization Features
                    </h1>
                    <p className="text-gray-500 mt-1">Manage feature flags and permission categories for each organization.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border rounded-lg w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading organizations...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrgs.map((org) => (
                        <Link
                            key={org.id}
                            href={`/superadmin/org-features/${org.id}`}
                            className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${org.status === 'active'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}>
                                    {org.status}
                                </div>
                            </div>

                            <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                {org.organization_name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 truncate">{org.email}</p>

                            <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-4">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(org.created_at), 'MMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-1 font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Manage
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </Link>
                    ))}

                    {filteredOrgs.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">No organizations found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
