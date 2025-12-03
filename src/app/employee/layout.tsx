"use client";

import React from "react";
import { useRouter } from "next/navigation";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import GlobalHeader from "@/components/shared/GlobalHeader";
import GlobalFooter from "@/components/shared/GlobalFooter";
import { OrgProvider } from "@/components/shared/OrgContext";
import { InventoryStoreProvider } from "@/components/inventory/InventoryStoreContext";
import { apiClient } from "@/lib/apiClient";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [orgName, setOrgName] = React.useState<string | null>(null);
  const [orgLogoUrl, setOrgLogoUrl] = React.useState<string | null>(null);
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const [lastName, setLastName] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{
          authenticated: boolean;
          role: string;
          user?: { id: string; email: string; name?: string; first_name?: string | null; last_name?: string | null };
          organization?: { name?: string | null; logo_url?: string | null } | null;
          employee?: { permissions?: string[] } | null;
        }>("/auth/session", { method: "GET" });

        if (session?.authenticated) {
          setOrgName(session.organization?.name || null);
          setOrgLogoUrl(session.organization?.logo_url || null);
          setFirstName(session.user?.first_name || null);
          setLastName(session.user?.last_name || null);
          setPermissions(session.employee?.permissions || []);
          setRole(session.role || null);

          // Employees only in this layout; redirect other roles
          if (session.role === "OrgAdmin") {
            router.replace("/org-admin");
            return;
          }
          if (session.role === "superAdmin") {
            router.replace("/superadmin");
            return;
          }
        }
        else {
          try { await apiClient("/auth/logout", { method: "POST" }); } catch { }
          router.replace("/login");
          return;
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch { }
    router.replace("/login");
  };

  return (
    <OrgProvider defaultHQ={false}>
      <InventoryStoreProvider>
        <div
          className="h-screen grid bg-gray-50 text-black"
          style={{ gridTemplateColumns: isCollapsed ? "60px 1fr" : "256px 1fr" }}
        >
          <EmployeeSidebar
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            orgName={orgName || undefined}
            orgLogoUrl={orgLogoUrl || undefined}
            onLogout={handleLogout}
            permissions={permissions}
            role={role || undefined}
          />
          <div className="flex flex-col h-screen overflow-hidden relative bg-gray-50">
            <GlobalHeader
              role="employee"
              firstName={firstName}
              lastName={lastName}
              userRole={role}
              onLogout={handleLogout}
            />
            <main className="flex-1 overflow-hidden px-2 pb-2">
              <div className="h-full w-full bg-white rounded-3xl shadow-sm overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 p-6">
                {children}
              </div>
            </main>
            <GlobalFooter orgName={orgName} />
          </div>
        </div>
      </InventoryStoreProvider>
    </OrgProvider>
  );
}