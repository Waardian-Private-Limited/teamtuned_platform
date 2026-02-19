import React from 'react';
import DepartmentMapper from '@/components/hr-operation/DepartmentMapper';

export const metadata = {
    title: 'Department Mapper | TeamTuned HR',
    description: 'Map departments to heads and approval workflows',
};

export default function DepartmentMapperPage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <DepartmentMapper />
        </div>
    );
}
