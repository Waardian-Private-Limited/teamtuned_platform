"use client";

import DpsSiteSchedule from '@/components/dps/DpsSiteSchedule';
import { useParams } from 'next/navigation';

export default function OrgDpsSiteSchedulePage() {
    const params = useParams();
    return (
        <DpsSiteSchedule
            siteId={params.siteId as string}
            basePath="/org-admin/dps"
        />
    );
}
