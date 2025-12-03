import React from 'react';

interface ChartSkeletonProps {
    type?: 'bar' | 'line' | 'pie' | 'donut' | 'area';
    height?: number;
}

export default function ChartSkeleton({ type = 'bar', height = 300 }: ChartSkeletonProps) {
    return (
        <div className="animate-pulse bg-white border border-gray-200 rounded-lg p-6">
            {/* Chart Title */}
            <div className="mb-4">
                <div className="h-5 bg-gray-300 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-32" />
            </div>

            {/* Chart Area */}
            <div className="relative" style={{ height: `${height}px` }}>
                {type === 'bar' && (
                    <div className="flex items-end justify-around h-full gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-gray-200 rounded-t w-full"
                                style={{ height: `${Math.random() * 60 + 40}%` }}
                            />
                        ))}
                    </div>
                )}

                {type === 'line' && (
                    <div className="h-full flex flex-col justify-between">
                        <div className="h-px bg-gray-200" />
                        <div className="h-px bg-gray-200" />
                        <div className="h-px bg-gray-200" />
                        <div className="h-px bg-gray-200" />
                        <div className="relative h-32">
                            <svg className="w-full h-full">
                                <path
                                    d="M 0 80 Q 50 40, 100 60 T 200 50 T 300 70 T 400 40"
                                    stroke="#E5E7EB"
                                    strokeWidth="3"
                                    fill="none"
                                />
                            </svg>
                        </div>
                    </div>
                )}

                {(type === 'pie' || type === 'donut') && (
                    <div className="flex items-center justify-center h-full">
                        <div className="relative">
                            <div className="w-48 h-48 rounded-full bg-gray-200" />
                            {type === 'donut' && (
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-200 rounded" />
                        <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}
