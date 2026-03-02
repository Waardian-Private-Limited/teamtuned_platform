'use client';

import React from 'react';
import DebitRules from '@/components/org/DebitRules';
import RouteGuard from '@/components/auth/RouteGuard';

export default function EmployeeDebitRulesPage() {
    return (
        <RouteGuard>
            <DebitRules />
        </RouteGuard>
    );
}
