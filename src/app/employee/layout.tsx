"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/features/navigation/components/AppShell";
import { employeeNav } from "@/features/navigation/constants/employee.nav";
import { OrgProvider } from "@/components/shared/OrgContext";
import { InventoryStoreProvider } from "@/components/inventory/InventoryStoreContext";
import { useAuth } from "@/context/AuthContext";
import { useUserStore } from "@/lib/store/userStore";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useUserStore();

  // Use centralized auth context
  const { user, role, permissions, employee, employee_id, organization, isAuthenticated, loading, logout } = useAuth();

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
        employeeId: employee_id?.toString() || employee?.employee_id?.toString(),
        email: user.email,
        role: role || "",
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        features,
      });
    }
  }, [isAuthenticated, role, user, employee_id, loading, router, setUser, features]);

  const handleLogout = async () => {
    await logout();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg-subtle">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--tt-primary)]" />
      </div>
    );
  }

  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";

  return (
    <OrgProvider defaultHQ={false}>
      <InventoryStoreProvider>
        <AppShell
          storageRole="employee"
          headerRole="employee"
          nodes={employeeNav}
          ctx={{
            isOrgAdmin,
            permissions: permissions || [],
            features,
          }}
          orgName={organization?.name}
          orgLogoUrl={organization?.logo_url}
          subtitle={isOrgAdmin ? "Organization Portal" : "Employee Portal"}
          firstName={user?.first_name}
          lastName={user?.last_name}
          userRole={role}
          onLogout={handleLogout}
        >
          {children}
        </AppShell>
      </InventoryStoreProvider>
    </OrgProvider>
  );
}
