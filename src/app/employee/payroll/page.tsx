"use client";

import React from "react";
import PayrollManagement from "@/components/payroll/PayrollManagement";

export default function EmployeePayrollPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">Payroll (Cycle View)</h1>
            <p className="text-sm text-gray-600">Attendance and payment summary calculated per policy cycle</p>
          </div>
          <div className="p-6">
            <PayrollManagement />
          </div>
        </div>
      </div>
    </div>
  );
}