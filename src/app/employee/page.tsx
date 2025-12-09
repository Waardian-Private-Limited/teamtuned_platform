'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { AttendanceSummary } from '@/types/attendance'; // Fixed import path
import AttendanceTimer from '@/components/employee/AttendanceTimer';
import AttendancePunchDetails from '@/components/employee/AttendancePunchDetails';

export default function EmployeePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await apiClient<AttendanceSummary>('/attendance/summary', { withAuth: true });
      setSummary(res);
    } catch (err: any) {
      console.error('Failed to fetch attendance summary', err);
      // Don't block the UI completely, just show error in console or toast ideally
      setError('Could not load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Welcome back! Here is your daily activity overview.</p>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          {error}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Timer & Status */}
          <div className="lg:col-span-1">
            <AttendanceTimer summary={summary} />
          </div>

          {/* Right Column: Map & Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Punch Details Section */}
            <div className="space-y-6">
              {summary.checked_in && (
                <AttendancePunchDetails
                  type="In"
                  time={summary.punch_in_time}
                  siteName={summary.punch_in_site_name}
                  lat={summary.punch_in_lat}
                  lng={summary.punch_in_lng}
                  image={summary.punch_in_image}
                />
              )}

              {summary.checked_out && (
                <AttendancePunchDetails
                  type="Out"
                  time={summary.punch_out_time}
                  siteName={summary.punch_out_site_name}
                  lat={summary.punch_out_lat}
                  lng={summary.punch_out_lng}
                  image={summary.punch_out_image}
                />
              )}
            </div>

            {/* Today's Timeline (Short List) */}
            {Array.isArray(summary.status_timeline) && summary.status_timeline.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                <div className="space-y-4">
                  {summary.status_timeline.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.status || item.label}</p>
                        <p className="text-xs text-gray-500">{new Date(item.timestamp || item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-200">
          No attendance data available for today.
        </div>
      )}
    </div>
  );
}