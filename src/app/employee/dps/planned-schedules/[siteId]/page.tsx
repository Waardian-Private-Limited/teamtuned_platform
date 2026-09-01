"use client";

import DpsPlannedSchedules from '@/components/dps/DpsPlannedSchedules';
import { useParams, useSearchParams } from 'next/navigation';

export default function EmployeeDpsPlannedSchedulesPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const unitId = searchParams.get('unitId') || '';
    const unitName = searchParams.get('unitName') || '';

    return (
        <DpsPlannedSchedules
            siteId={params.siteId as string}
            unitId={unitId}
            unitName={unitName}
            basePath="/employee/dps"
        />
    );
}
