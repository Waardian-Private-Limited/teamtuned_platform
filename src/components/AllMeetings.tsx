"use client";

import React, { useState, useEffect } from "react";
import { Plus, Calendar, Users, Clock, MapPin, Filter, Search } from "lucide-react";
import CreateMeetingForm from "@/components/CreateMeetingForm";
import { apiClient } from "@/lib/apiClient";

export default function AllMeetings() {
    const [showCreateMeeting, setShowCreateMeeting] = useState(false);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const data = await apiClient<any>('/meetings', { method: 'GET', withAuth: true });
            setMeetings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch meetings:', err);
            setMeetings([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredMeetings = meetings.filter(meeting => {
        const matchesSearch = meeting.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === "all" || meeting.meeting_type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
                    <p className="text-gray-600 mt-1">Manage and view all your meetings</p>
                </div>
                <button
                    onClick={() => setShowCreateMeeting(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                    <Plus size={20} />
                    Create Meeting
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search meetings..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="relative">
                        <Filter size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                        >
                            <option value="all">All Types</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="emergency">Emergency</option>
                            <option value="client_meeting">Client Meeting</option>
                            <option value="internal_review">Internal Review</option>
                            <option value="safety_toolbox_talk">Safety / Toolbox Talk</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                        <p className="text-gray-600 mt-4">Loading meetings...</p>
                    </div>
                ) : filteredMeetings.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No meetings found</h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm || filterType !== "all"
                                ? "Try adjusting your filters"
                                : "Get started by creating your first meeting"}
                        </p>
                        {!searchTerm && filterType === "all" && (
                            <button
                                onClick={() => setShowCreateMeeting(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium"
                            >
                                <Plus size={20} />
                                Create Your First Meeting
                            </button>
                        )}
                    </div>
                ) : (
                    filteredMeetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {meeting.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} />
                                            <span>{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} />
                                            <span>{meeting.start_time}</span>
                                            {meeting.end_time && <span>- {meeting.end_time}</span>}
                                        </div>
                                        {meeting.site_name && (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={16} />
                                                <span>{meeting.site_name}</span>
                                            </div>
                                        )}
                                        {meeting.participant_count > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Users size={16} />
                                                <span>{meeting.participant_count} participants</span>
                                            </div>
                                        )}
                                    </div>
                                    {meeting.agenda && (
                                        <p className="mt-3 text-sm text-gray-700 line-clamp-2">
                                            {meeting.agenda}
                                        </p>
                                    )}
                                </div>
                                <div className="ml-4">
                                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                                        {meeting.meeting_type?.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Meeting Modal */}
            <CreateMeetingForm
                isOpen={showCreateMeeting}
                onClose={() => setShowCreateMeeting(false)}
                onSuccess={() => {
                    setShowCreateMeeting(false);
                    fetchMeetings(); // Refresh the list
                }}
            />
        </div>
    );
}
