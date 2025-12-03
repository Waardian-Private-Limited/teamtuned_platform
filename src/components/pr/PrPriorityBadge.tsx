"use client";
import React from 'react';

interface PrPriorityBadgeProps {
    priority: string;
}

export default function PrPriorityBadge({ priority }: PrPriorityBadgeProps) {
    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case 'low':
                return { label: 'Low', className: 'bg-gray-100 text-gray-600' };
            case 'normal':
                return { label: 'Normal', className: 'bg-blue-100 text-blue-600' };
            case 'high':
                return { label: 'High', className: 'bg-orange-100 text-orange-600' };
            case 'urgent':
                return { label: 'Urgent', className: 'bg-red-100 text-red-600' };
            default:
                return { label: priority, className: 'bg-gray-100 text-gray-600' };
        }
    };

    const config = getPriorityConfig(priority);

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
}
