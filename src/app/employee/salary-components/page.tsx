'use client';

import React from 'react';
import SalaryComponents from '@/components/org/SalaryComponents';
import RouteGuard from '@/components/auth/RouteGuard';

export default function EmployeeSalaryComponentsPage() {
    return (
        <RouteGuard 
            requiredFeature="PAYROLL_FEATURE"
            requiredPermissions={["PAYROLL_VIEW", "PAYROLL_ADD", "PAYROLL_EDIT", "PAYROLL_DELETE", "HR_MODE"]}
            requireAny
        >
            <SalaryComponents />
        </RouteGuard>
    );
}
