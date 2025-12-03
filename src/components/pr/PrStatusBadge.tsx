"use client";
import React from 'react';

interface PrStatusBadgeProps {
    status: string;
}

export default function PrStatusBadge({ status }: PrStatusBadgeProps) {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'draft':
                return { label: 'Draft', className: 'bg-gray-100 text-gray-700' };
            case 'submitted':
                return { label: 'Submitted', className: 'bg-blue-100 text-blue-700' };
            case 'pending_approval':
                return { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-700' };
            case 'approved':
                return { label: 'Approved', className: 'bg-green-100 text-green-700' };
            case 'partially_approved':
                return { label: 'Partially Approved', className: 'bg-teal-100 text-teal-700' };
            case 'rejected':
                return { label: 'Rejected', className: 'bg-red-100 text-red-700' };
            case 'converted':
                return { label: 'Converted', className: 'bg-purple-100 text-purple-700' };
            case 'cancelled':
                return { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' };
            default:
                return { label: status, className: 'bg-gray-100 text-gray-700' };
        }
    };

    const config = getStatusConfig(status);

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
}
