import React from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import DeptRoleMapper from '@/components/org/DeptRoleMapper';

export default function EmployeeAssignmentsPage() {
    return (
        <RouteGuard requiredPermissions={["EMPSITE_VIEW", "EMPLOYEE_ASSIGN_SITE"]} requireAny>
            <div className="h-[calc(100vh-2rem)] p-4 md:p-6 overflow-hidden">
                <DeptRoleMapper />
            </div>
        </RouteGuard>
    );
}
