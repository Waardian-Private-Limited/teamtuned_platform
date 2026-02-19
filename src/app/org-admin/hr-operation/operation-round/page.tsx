import React from 'react';
import OperationManagement from '@/components/hr-operation/OperationManagement';

export const metadata = {
    title: 'Operation Round Management | TeamTuned HR',
    description: 'Manage department head interviews and candidate evaluations',
};

export default function OperationRoundPage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <OperationManagement myOnly={false} />
        </div>
    );
}
