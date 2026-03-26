"use client";

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Calendar, MessageSquare, Plus, CheckCircle2, List } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface MomDashboardProps {
    basePath: string;
}

export default function MomDashboardComponent({ basePath }: MomDashboardProps) {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/mom/list');
            if (res.success) {
                setMeetings(res.meetings);
            }
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const openThreadsMeetings = meetings.filter(m => m.open_points > 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Minutes of Meeting Dashboard</h1>
                    <p className="text-gray-500 mt-1">Overview of your meetings, action items, and real-time discussions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`${basePath}/list`}
                        className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <List size={20} />
                        View All Meetings
                    </Link>
                    <Link
                        href={`${basePath}/create`}
                        className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all shadow-sm"
                    >
                        <Plus size={20} />
                        Create Meeting
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-gray-50 text-gray-800">
                            <Calendar size={24} />
                        </div>
                    </div>
                    <p className="text-gray-500 font-medium">Total Meetings</p>
                    <span className="text-4xl font-black text-gray-900 mt-1 block">{loading ? '-' : meetings.length}</span>
                </div>

                <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-red-50 text-red-600">
                            <MessageSquare size={24} />
                        </div>
                    </div>
                    <p className="text-gray-500 font-medium">Meetings w/ Open Threads</p>
                    <span className="text-4xl font-black text-gray-900 mt-1 block">{loading ? '-' : openThreadsMeetings.length}</span>
                </div>

                <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-green-50 text-green-600">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                    <p className="text-gray-500 font-medium">Action Items Closed</p>
                    <span className="text-4xl font-black text-gray-900 mt-1 block">
                        {loading ? '-' : meetings.reduce((acc, m) => acc + (m.total_points - m.open_points), 0)}
                    </span>
                </div>
            </div>
        </div>
    );
}

