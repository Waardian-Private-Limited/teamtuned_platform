"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { ChevronLeft, Users, Shield } from "lucide-react";

type Enrollment = {
  id: number;
  policy_id: number;
  policy_name: string;
  provider_name: string;
  status: string;
};

type Beneficiary = {
  id: number;
  enrollment_id: number;
  name: string;
  relationship?: string | null;
  percentage: number;
  contact_number?: string | null;
};

export default function OrgAdminEmployeeBeneficiariesPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = Number(params.employeeId);

  const [loading, setLoading] = React.useState(true);
  const [employee, setEmployee] = React.useState<any | null>(null);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [beneficiaries, setBeneficiaries] = React.useState<Beneficiary[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [empData, insData] = await Promise.all([
          apiClient<any>(`/organization/employees/${employeeId}`, { method: "GET", withAuth: true }).catch(() => null),
          apiClient<any>(`/insurance/enrollment/employee/${employeeId}`, { method: "GET", withAuth: true }).catch(() => ({ active: [] })),
        ]);
        setEmployee(empData);
        const active: Enrollment[] = Array.isArray(insData?.active) ? insData.active : [];
        setEnrollments(active);
        const lists = await Promise.all(
          active.map(async (e) => {
            try {
              const list = await apiClient<Beneficiary[]>(`/insurance/enrollments/${e.id}/beneficiaries`, { method: "GET", withAuth: true });
              return Array.isArray(list) ? list : [];
            } catch {
              return [];
            }
          })
        );
        setBeneficiaries(lists.flat());
      } finally {
        setLoading(false);
      }
    })();
  }, [employeeId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/org-admin/insurance/beneficiaries")}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <ChevronLeft size={18} /> Back to Employees
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
            <Users size={22} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() : `Employee #${employeeId}`}
            </h1>
            <p className="text-gray-600 text-sm">{employee?.email || ""}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : enrollments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No active insurance policies found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {enrollments.map((en) => {
              const enBeneficiaries = beneficiaries.filter((b) => b.enrollment_id === en.id);
              return (
                <div key={en.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{en.policy_name}</h2>
                      <p className="text-sm text-gray-600">Provider: {en.provider_name}</p>
                    </div>
                    <div className="text-sm text-gray-700">Beneficiaries: {enBeneficiaries.length}</div>
                  </div>
                  {enBeneficiaries.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-600">No beneficiaries</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {enBeneficiaries.map((ben) => (
                            <tr key={ben.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">{ben.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{ben.relationship || "-"}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{`${ben.percentage}%`}</td>
                              <td className="px-4 py-2 text-sm text-gray-700">{ben.contact_number || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

