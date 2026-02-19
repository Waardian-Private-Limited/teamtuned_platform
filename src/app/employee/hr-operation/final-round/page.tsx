import React from 'react';
import FinalRoundManagement from '@/components/hr-operation/FinalRoundManagement';

export const metadata = {
    title: 'Final Round | TeamTuned HR',
};

export default function EmployeeFinalRoundPage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <FinalRoundManagement myOnly={true} />
        </div>
    );
}
