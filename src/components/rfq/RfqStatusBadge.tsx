"use client";
import React from "react";

interface RfqStatusBadgeProps {
    status: string;
}

export default function RfqStatusBadge({ status }: RfqStatusBadgeProps) {
    const getStatusConfig = () => {
        switch (status) {
            case "draft":
                return { label: "Draft", className: "bg-gray-100 text-gray-800" };
            case "sent":
                return { label: "Sent", className: "bg-blue-100 text-blue-800" };
            case "partially_quoted":
                return { label: "Partially Quoted", className: "bg-yellow-100 text-yellow-800" };
            case "fully_quoted":
                return { label: "Fully Quoted", className: "bg-green-100 text-green-800" };
            case "closed":
                return { label: "Closed", className: "bg-gray-100 text-gray-600" };
            default:
                return { label: status, className: "bg-gray-100 text-gray-800" };
        }
    };

    const config = getStatusConfig();

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
}
