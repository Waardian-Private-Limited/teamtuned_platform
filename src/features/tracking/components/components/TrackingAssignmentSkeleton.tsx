'use client';

import React from 'react';

export function TrackingAssignmentSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="w-full animate-pulse divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 p-3.5 sm:px-4">
          <div className="flex items-center gap-3">
            {/* Checkbox */}
            <div className="h-4 w-4 rounded bg-bg-subtle" />
            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-bg-subtle" />
            {/* Name and subtitle */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-bg-subtle" />
              <div className="h-2.5 w-20 rounded bg-bg-subtle" />
            </div>
          </div>

          {/* Status pill */}
          <div className="hidden sm:block h-5 w-16 rounded-full bg-bg-subtle" />

          {/* Policy badge */}
          <div className="hidden md:block h-5 w-24 rounded bg-bg-subtle" />

          {/* Device & phone */}
          <div className="hidden lg:block h-3.5 w-28 rounded bg-bg-subtle" />

          {/* Last signal */}
          <div className="hidden sm:block h-3.5 w-24 rounded bg-bg-subtle" />

          {/* Action button */}
          <div className="h-7 w-16 rounded bg-bg-subtle" />
        </div>
      ))}
    </div>
  );
}
