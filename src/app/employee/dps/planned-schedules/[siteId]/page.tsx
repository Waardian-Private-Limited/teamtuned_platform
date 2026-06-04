"use client";

import DpsPlannedSchedules from '@/components/dps/DpsPlannedSchedules';
import { useParams, useSearchParams } from 'next/navigation';

import RouteGuard from '@/components/auth/RouteGuard';

export default function EmployeeDpsPlannedSchedulesPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const unitId = searchParams.get('unitId') || '';
    const unitName = searchParams.get('unitName') || '';

    return (
        <RouteGuard requiredPermissions={["DPR_VIEW", "DPR_ADMIN", "DPR_ADD", "DPR_EDIT"]} requireAny>
            <DpsPlannedSchedules
                siteId={params.siteId as string}
                unitId={unitId}
                unitName={unitName}
                backPath="/employee/dps"
            />
        </RouteGuard>
    );
}
