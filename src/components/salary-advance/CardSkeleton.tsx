import React from 'react';

interface CardSkeletonProps {
    count?: number;
}

export default function CardSkeleton({ count = 4 }: CardSkeletonProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="animate-pulse">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                            <div className="h-8 w-8 bg-gray-200 rounded" />
                        </div>
                        <div className="h-8 bg-gray-300 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}
