"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import GlobalHeader from "@/components/shared/GlobalHeader";
import GlobalFooter from "@/components/shared/GlobalFooter";
import { OrgProvider } from "@/components/shared/OrgContext";
import { InventoryStoreProvider } from "@/components/inventory/InventoryStoreContext";
import { useAuth } from "@/context/AuthContext";
import { useUserStore } from "@/lib/store/userStore";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { setUser } = useUserStore();

  // Use centralized auth context
  const { user, role, permissions, employee, organization, isAuthenticated, loading, logout } = useAuth();

  // Extract organization features
  const features = React.useMemo(() => {
    return (organization?.organization_features || []).map(f => f.code);
  }, [organization]);

  // Sync with user store and handle role-based redirects
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // Redirect non-employees
    if (role === "OrgAdmin") {
      router.replace("/org-admin");
      return;
    }
    if (role === "superAdmin") {
      router.replace("/superadmin");
      return;
    }

    // Update user store
    if (user) {
      setUser({
        id: user.id.toString(),
        email: user.email,
        role: role || "",
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        features,
      });
    }
  }, [isAuthenticated, role, user, loading, router, setUser, features]);

  const handleLogout = async () => {
    await logout();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
            orgName={organization?.name}
            orgLogoUrl={organization?.logo_url}
            onLogout={handleLogout}
            permissions={permissions}
            role={role || undefined}
            features={features}
          />
          <div className="flex flex-col h-screen overflow-hidden relative bg-gray-50">
            <GlobalHeader
              role="employee"
              firstName={user?.first_name}
              lastName={user?.last_name}
              userRole={role}
              onLogout={handleLogout}
            />
            <main className="flex-1 overflow-hidden px-2 pb-2">
              <div className="h-full w-full bg-white rounded-3xl shadow-sm overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 p-6">
                {children}
              </div>
            </main>
            <GlobalFooter orgName={organization?.name} />
          </div>
        </div>
      </InventoryStoreProvider>
    </OrgProvider>
  );
}