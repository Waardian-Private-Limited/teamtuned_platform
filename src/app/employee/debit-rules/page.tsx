'use client';

import React from 'react';
import DebitRules from '@/components/org/DebitRules';
import RouteGuard from '@/components/auth/RouteGuard';

export default function EmployeeDebitRulesPage() {
    return (
        <RouteGuard 
            requiredFeature="PAYROLL_FEATURE"
            requiredPermissions={["PAYROLL_VIEW", "PAYROLL_ADD", "PAYROLL_EDIT", "PAYROLL_DELETE", "HR_MODE"]}
            requireAny
        >
            <DebitRules />
        </RouteGuard>
    );
}
