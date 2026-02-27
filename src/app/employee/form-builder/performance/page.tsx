"use client";

import React from 'react';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, ArrowUpRight, BarChart3 } from 'lucide-react';

export default function EmployeePerformancePage() {
    const stats = [
        { label: 'Forms Completed', value: '24', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Avg. Submission Time', value: '4.2h', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Efficiency Score', value: '98%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Pending Corrections', value: '1', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-10">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Analytics & Performance</h1>
                    <p className="text-gray-500 text-lg">Track your construction data submission metrics and efficiency.</p>
                </div>
                <button className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-xl">
                    Export Report <ArrowUpRight size={18} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                        <div className={`w-14 h-14 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner`}>
                            <s.icon size={28} />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">{s.label}</p>
                        <p className="text-4xl font-black text-gray-900 mt-2">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-gray-900">Submission Trend</h3>
                        <div className="flex gap-2">
                            {['Week', 'Month', 'Year'].map(t => (
                                <button key={t} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${t === 'Month' ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-64 w-full bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-x-0 bottom-0 h-40 flex items-end justify-around px-8">
                            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                <div key={i} className="w-12 bg-blue-500/20 rounded-t-xl transition-all duration-500 group-hover:bg-blue-600/40" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                        <div className="relative z-10 text-center space-y-2">
                            <BarChart3 className="mx-auto text-gray-300" size={48} />
                            <p className="text-gray-400 font-bold text-sm">Visualizing Performance Data...</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <h3 className="text-2xl font-bold relative z-10">Compliance Score</h3>
                    <div className="flex items-center justify-center py-6 relative z-10">
                        <div className="relative w-48 h-48">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle className="text-white/10 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
                                <circle className="text-blue-500 stroke-current" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="25.12"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black italic">90%</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Excellent</span>
                            </div>
                        </div>
                    </div>
                    <ul className="space-y-4 relative z-10">
                        <li className="flex items-center gap-3 text-sm font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            On-time submissions
                        </li>
                        <li className="flex items-center gap-3 text-sm font-medium">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Data accuracy
                        </li>
                        <li className="flex items-center gap-3 text-sm font-medium">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Template usage
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
