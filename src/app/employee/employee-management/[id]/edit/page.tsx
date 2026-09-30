"use client";

import { useParams } from "next/navigation";
import RouteGuard from "@/components/auth/RouteGuard";
import { EmployeeFormPage } from "@/features/employees/components/EmployeeFormPage";

export default function EmployeeEditEmployeePage() {
  const params = useParams<{ id: string }>();
  return (
    <RouteGuard requiredPermissions={["EMP_EDIT"]} requireAny>
      <EmployeeFormPage key={params.id} employeeId={Number(params.id) || null} />
    </RouteGuard>
  );
}
