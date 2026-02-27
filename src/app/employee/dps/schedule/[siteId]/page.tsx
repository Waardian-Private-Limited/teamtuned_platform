"use client";

import DpsSiteSchedule from '@/components/dps/DpsSiteSchedule';
import { useParams } from 'next/navigation';

export default function EmployeeDpsSiteSchedulePage() {
    const params = useParams();
    return (
        <DpsSiteSchedule
            siteId={params.siteId as string}
            backPath="/employee/dps/schedule"
            dailyUpdatePath="/employee/dps/daily-update"
        />
    );
}
