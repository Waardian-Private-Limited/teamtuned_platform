"use client";

import { useParams } from "next/navigation";
import { EmployeeDetailPage } from "@/features/employees/components/EmployeeDetailPage";

export default function OrgAdminEmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  return <EmployeeDetailPage key={params.id} employeeId={Number(params.id)} />;
}
