"use client";

import { useParams } from "next/navigation";
import { EmployeeFormPage } from "@/features/employees/components/EmployeeFormPage";

export default function OrgAdminEditEmployeePage() {
  const params = useParams<{ id: string }>();
  return <EmployeeFormPage key={params.id} employeeId={Number(params.id) || null} />;
}
