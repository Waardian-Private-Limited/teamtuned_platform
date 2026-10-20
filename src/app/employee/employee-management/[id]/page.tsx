"use client";

import { useParams } from "next/navigation";
import RouteGuard from "@/components/auth/RouteGuard";
import { EmployeeDetailPage } from "@/features/employees/components/EmployeeDetailPage";

export default function EmployeeEmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RouteGuard requiredPermissions={["EMP_VIEW", "EMP_EDIT"]} requireAny>
      <EmployeeDetailPage key={params.id} employeeId={Number(params.id)} />
    </RouteGuard>
  );
}
