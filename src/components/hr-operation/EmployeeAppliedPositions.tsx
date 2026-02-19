"use client";

import React from 'react';
import { Briefcase, Search, Filter, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';

export default function EmployeeAppliedPositions() {
    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Applied Positions</h1>
                        <p className="mt-1 text-gray-500">Track your external or internal job applications and their status.</p>
                    </div>
                </div>

                {/* Simple Workflow Guide */}
                <div className="bg-black text-white p-6 rounded-2xl shadow-lg mb-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-2">Track Your Career Growth</h3>
                        <p className="text-white/70 text-sm max-w-lg mb-4">
                            Monitor all your internal job applications. You will receive notifications when the status of your application changes or when an interview is scheduled.
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-green-400" />
                                <span className="text-xs font-medium">Applied</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-blue-300" />
                                <span className="text-xs font-medium">In Review</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase size={16} className="text-purple-300" />
                                <span className="text-xs font-medium">Interview</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12">
                        <Briefcase size={180} />
                    </div>
                </div>

                {/* My Applications List */}
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    My Applications
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">2</span>
                </h2>

                <div className="space-y-4">
                    {[
                        { title: 'Project Manager (Internal)', dept: 'Operations', appliedDate: 'Feb 12, 2024', status: 'In Review', color: 'blue' },
                        { title: 'Site Lead Engineer', dept: 'Civil Engineering', appliedDate: 'Jan 28, 2024', status: 'Interview Scheduled', color: 'purple' },
                    ].map((app, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-black/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl bg-${app.color}-50 flex-shrink-0`}>
                                    <Briefcase size={24} className={`text-${app.color}-600`} />
                                </div>
                                <div>
                                    <h3 className="text-black font-bold text-lg">{app.title}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <span>{app.dept}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span>Applied on {app.appliedDate}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                                <div className="flex flex-col items-end">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${app.status === 'In Review' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                        }`}>
                                        {app.status}
                                    </span>
                                </div>
                                <button className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600 flex items-center gap-2">
                                    View Details
                                    <ArrowUpRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Explore Other Opportunities */}
                <div className="mt-12 bg-white p-8 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center text-center">
                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <Search size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-black font-bold text-lg">Looking for more?</h3>
                    <p className="text-gray-500 text-sm max-w-sm mt-1 mb-6">Explore internal vacancies across all departments and apply to take the next step in your career.</p>
                    <button className="px-6 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-md font-medium">
                        Explore Open Vacancies
                    </button>
                </div>
            </div>
        </div>
    );
}
