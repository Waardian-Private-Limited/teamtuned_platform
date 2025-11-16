"use client";

import React from "react";
import { useRouter } from "next/navigation";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import { OrgProvider } from "@/components/shared/OrgContext";
import { apiClient } from "@/lib/apiClient";
import { User } from "lucide-react";

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
          try { await apiClient("/auth/logout", { method: "POST" }); } catch {}
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
    } catch {}
    router.replace("/login");
  };

  const welcomeName = [firstName, lastName].filter(Boolean).join(" ") || undefined;

  return (
    <OrgProvider defaultHQ={false}>
      <div
        className="h-screen grid bg-white text-black"
        style={{ gridTemplateColumns: isCollapsed ? "64px 1fr" : "256px 1fr" }}
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
        <div className="flex flex-col h-screen">
          <HeaderEmployee firstLast={welcomeName} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <footer className="border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-500">
            All rights reserved
          </footer>
        </div>
      </div>
    </OrgProvider>
  );
}

function HeaderEmployee({ firstLast, onLogout }: { firstLast?: string; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const displayName = firstLast || "Employee";
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 h-15">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">Employee Portal</h1>
        </div>
        <div className="relative">
          <button
            type="button"
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              </div>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}