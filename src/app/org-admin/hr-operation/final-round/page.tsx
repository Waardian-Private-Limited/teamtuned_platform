import React from 'react';
import FinalRoundManagement from '@/components/hr-operation/FinalRoundManagement';

export const metadata = {
    title: 'Final Round Management | TeamTuned HR',
};

export default function AdminFinalRoundPage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <FinalRoundManagement myOnly={false} />
        </div>
    );
}
