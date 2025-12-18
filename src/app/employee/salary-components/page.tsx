'use client';

import React from 'react';
import SalaryComponents from '@/components/org/SalaryComponents';
import RouteGuard from '@/components/auth/RouteGuard';

export default function EmployeeSalaryComponentsPage() {
    return (
        <RouteGuard requireOrgAdmin>
            <SalaryComponents />
        </RouteGuard>
    );
}
