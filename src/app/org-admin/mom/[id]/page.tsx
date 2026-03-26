"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import MeetingDetailView from '@/components/mom/MeetingDetailView';

export default function MeetingDetails() {
    const { id } = useParams();
    const router = useRouter();
    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { employee } = useAuth();

    useEffect(() => {
        fetchMeetingDetails();
    }, [id]);

    const fetchMeetingDetails = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/mom/details/${id}`);
            if (res.success) {
                setMeeting(res.meeting);
            }
        } catch (error) {
            console.error('Error fetching meeting details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (pointId: number, newStatus: string) => {
        // Refetch to get latest state
        fetchMeetingDetails();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin w-10 h-10 border-4 border-black border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Meeting Not Found</h2>
                <Link href="/org-admin/mom" className="text-blue-600 underline mt-2 block">Back to Dashboard</Link>
            </div>
        );
    }

    const breadcrumbs = [
        { label: 'Home', href: '/org-admin' },
        { label: 'Meetings', href: '/org-admin/mom/list' },
        { label: meeting.title }
    ];

    return (
        <MeetingDetailView
            meeting={meeting}
            breadcrumbs={breadcrumbs}
            onEdit={() => router.push(`/org-admin/mom/list`)}
            onStatusUpdate={handleStatusUpdate}
            currentEmployeeId={employee?.id}
        />
    );
}
