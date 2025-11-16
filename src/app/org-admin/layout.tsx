"use client";

import React from "react";
import { useRouter } from "next/navigation";
import OrgSidebar from "@/components/org/OrgSidebar";
import { OrgProvider } from "@/components/shared/OrgContext";
import { apiClient } from "@/lib/apiClient";
import { User } from "lucide-react";

type Feature = { id: number; code: string; name: string };

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [features, setFeatures] = React.useState<Feature[]>([]);
  const [role, setRole] = React.useState<string | null>(null);
  const [orgName, setOrgName] = React.useState<string | null>(null);
  const [orgLogoUrl, setOrgLogoUrl] = React.useState<string | null>(null);
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const [lastName, setLastName] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{
          authenticated: boolean;
          role: string;
          user?: { id: string; email: string; name?: string; first_name?: string | null; last_name?: string | null };
          organization?: { name?: string | null; logo_url?: string | null } | null;
          organization_features?: Feature[];
          employee?: { permissions?: string[] } | null;
        }>("/auth/session", { method: "GET" });

        if (session?.authenticated) {
          setRole(session.role || null);
          setFeatures(session.organization_features || []);
          setOrgName(session.organization?.name || null);
          setOrgLogoUrl(session.organization?.logo_url || null);
          setFirstName(session.user?.first_name || null);
          setLastName(session.user?.last_name || null);
          setPermissions(session.employee?.permissions || []);
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

  return (
    <OrgProvider defaultHQ={true}>
      <div
        className="h-screen grid bg-white text-black"
        style={{ gridTemplateColumns: isCollapsed ? "64px 1fr" : "256px 1fr" }}
      >
        <OrgSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          orgName={orgName || undefined}
          orgLogoUrl={orgLogoUrl || undefined}
          features={features}
          role={role || undefined}
          permissions={permissions}
          onLogout={handleLogout}
        />
        <div className="flex flex-col h-screen">
          <ModernHeader firstName={firstName} lastName={lastName} role={role || undefined} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <footer className="border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-500">
            All rights reserved
          </footer>
        </div>
      </div>
    </OrgProvider>
  );
}

function ModernHeader({ firstName, lastName, role, onLogout }: { firstName: string | null; lastName: string | null; role?: string; onLogout: () => void }) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";
  const [menuOpen, setMenuOpen] = React.useState(false);
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 h-15">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">Organization Admin</h1>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
              {role && <p className="text-xs text-gray-500 truncate">{role}</p>}
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
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