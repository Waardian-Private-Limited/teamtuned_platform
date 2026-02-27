"use client";

import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function DpsDashboard() {
    return (
        <div className="max-w-7xl mx-auto p-8 space-y-10">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <LayoutDashboard className="text-blue-600" size={40} />
                        DPR Dashboard
                    </h1>
                    <p className="text-gray-500 text-lg font-medium">Overview of Daily Progress Reporting</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center min-h-[400px]">
                <p className="text-xl text-gray-400 font-medium">Dashboard charts and metrics will appear here.</p>
            </div>
        </div>
    );
}
