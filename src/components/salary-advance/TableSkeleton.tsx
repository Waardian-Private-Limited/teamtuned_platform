import React from 'react';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export default function TableSkeleton({ rows = 8, columns = 6 }: TableSkeletonProps) {
    return (
        <div className="animate-pulse">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="flex gap-4 px-6 py-3">
                        {Array.from({ length: columns }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-4 bg-gray-300 rounded ${i === 0 ? 'w-32' : i === columns - 1 ? 'w-20' : 'flex-1'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Rows */}
                <div className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        <div key={rowIdx} className="flex gap-4 px-6 py-4">
                            {Array.from({ length: columns }).map((_, colIdx) => (
                                <div
                                    key={colIdx}
                                    className={`h-4 bg-gray-200 rounded ${colIdx === 0 ? 'w-32' : colIdx === columns - 1 ? 'w-20' : 'flex-1'
                                        }`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
