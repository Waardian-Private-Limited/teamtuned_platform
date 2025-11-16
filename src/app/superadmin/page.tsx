import SuperadminView from "@/components/superadmin/SuperadminView";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";

const roleRoutes: Record<string, string> = {
  superadmin: "/superadmin",
  organizationAdmin: "/org-admin",
  hr: "/hr",
  manager: "/manager",
  employee: "/employee",
};

export default async function SuperadminPage() {
  redirect("/superadmin/dashboard");
}