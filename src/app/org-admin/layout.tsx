"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import OrgSidebar from "@/components/org/OrgSidebar";
import GlobalHeader from "@/components/shared/GlobalHeader";
import GlobalFooter from "@/components/shared/GlobalFooter";
import { OrgProvider } from "@/components/shared/OrgContext";
import { InventoryStoreProvider } from "@/components/inventory/InventoryStoreContext";
import { useAuth } from "@/context/AuthContext";
import { useUserStore } from "@/lib/store/userStore";

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
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
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            </div>
        );
    }

    return (
        <OrgProvider defaultHQ={true}>
            <InventoryStoreProvider>
                <div className="h-screen flex bg-gray-50 text-black">
                    <OrgSidebar
                        isCollapsed={isCollapsed}
                        setIsCollapsed={setIsCollapsed}
                        orgName={organization?.name}
                        orgLogoUrl={organization?.logo_url}
                        onLogout={handleLogout}
                        permissions={permissions}
                        role={role || undefined}
                        features={features}
                    />
                    <div className="flex-1 flex flex-col h-screen overflow-hidden">
                        <GlobalHeader
                            role="org-admin"
                            firstName={user?.first_name}
                            lastName={user?.last_name}
                            userRole={role}
                            onLogout={handleLogout}
                        />
                        <main className="flex-1 overflow-auto p-2">
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
