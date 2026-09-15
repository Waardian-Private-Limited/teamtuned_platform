"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/features/navigation/components/AppShell";
import { orgNav } from "@/features/navigation/constants/org.nav";
import { OrgProvider } from "@/components/shared/OrgContext";
import { InventoryStoreProvider } from "@/components/inventory/InventoryStoreContext";
import { useAuth } from "@/context/AuthContext";
import { useUserStore } from "@/lib/store/userStore";

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { setUser } = useUserStore();

    // Use centralized auth context
    const { user, role, permissions, organization, isAuthenticated, loading, logout } = useAuth();

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

        const userRole = role?.toLowerCase();

        // Allow superadmin and orgadmin
        if (userRole === "superadmin" || userRole === "orgadmin") {
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
            return;
        }

        // Redirect employees
        if (userRole === "employee") {
            router.replace("/employee");
            return;
        }

        // Unknown role
        router.replace("/login");
    }, [isAuthenticated, role, user, loading, router, setUser, features]);

    const handleLogout = async () => {
        await logout();
    };

    if (loading) {
        return (
            <div className="flex h-[100dvh] w-full items-center justify-center bg-bg-subtle">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-[var(--tt-primary)]" />
            </div>
        );
    }

    return (
        <OrgProvider defaultHQ={true}>
            <InventoryStoreProvider>
                <AppShell
                    storageRole="org-admin"
                    headerRole="org-admin"
                    nodes={orgNav}
                    ctx={{
                        isOrgAdmin: (role || "").toLowerCase() === "orgadmin",
                        permissions: permissions || [],
                        features,
                    }}
                    orgName={organization?.name}
                    orgLogoUrl={organization?.logo_url}
                    subtitle="Organization"
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
