import React from 'react';
import OperationManagement from '@/components/hr-operation/OperationManagement';

export const metadata = {
    title: 'Operation Round | TeamTuned HR',
    description: 'Process assigned operation round interviews',
};

export default function EmployeeOperationRoundPage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <OperationManagement myOnly={true} />
        </div>
    );
}
