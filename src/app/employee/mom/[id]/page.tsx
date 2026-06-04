"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';
import MeetingDetailView from '@/components/mom/MeetingDetailView';

export default function EmployeeMeetingDetails() {
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
                <button onClick={() => router.back()} className="text-blue-600 underline mt-2 block">Go Back</button>
            </div>
        );
    }

    const breadcrumbs = [
        { label: 'Home', href: '/employee' },
        { label: 'Meetings', href: '/employee/mom/list' },
        { label: meeting.title }
    ];

    return (
        <RouteGuard requiredPermissions={["MOM_VIEW"]} requireAny>
            <MeetingDetailView
                meeting={meeting}
                breadcrumbs={breadcrumbs}
                onEdit={undefined} // Employees usually can't edit unless they are creators, but we'll stick to view for now
                onStatusUpdate={handleStatusUpdate}
                currentEmployeeId={employee?.id}
            />
        </RouteGuard>
    );
}
