import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SuperadminShell from "@/components/superadmin/SuperadminShell";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";

const roleRoutes: Record<string, string> = {
  superAdmin: "/superadmin",
  OrgAdmin: "/org-admin",
  Employee: "/employee",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") || "";

  const res = await fetch(`${BASE_URL}/auth/session`, {
    method: "GET",
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) {
    redirect("/login");
  }

  const data = await res.json();
  const isAuthenticated = !!data.authenticated;
  const role: string | undefined = data.role;

  if (!isAuthenticated) {
    redirect("/login");
  }

  if (role !== "superAdmin") {
    const userRoute = role ? roleRoutes[role] : undefined;
    if (userRoute) {
      redirect(userRoute);
    } else {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { cookie: cookieHeader },
          cache: "no-store",
        });
      } catch {}
      redirect("/login");
    }
  }

  return <SuperadminShell>{children}</SuperadminShell>;
}