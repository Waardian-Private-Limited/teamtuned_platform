import React from 'react';
import DeptRoleMapper from '@/components/org/DeptRoleMapper';

export default function EmployeeAssignmentsPage() {
    return (
        <div className="h-[calc(100vh-2rem)] p-4 md:p-6 overflow-hidden">
            <DeptRoleMapper />
        </div>
    );
}
