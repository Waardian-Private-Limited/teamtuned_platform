"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/lib/toast";

interface RouteGuardProps {
    children: React.ReactNode;
    requiredPermissions?: string[];
    requiredFeature?: string; // Optional: check if org has this feature enabled
    requireAny?: boolean; // If true, user needs ANY of the permissions. If false, needs ALL
    requireOrgAdmin?: boolean;
    fallbackPath?: string;
}

export default function RouteGuard({
    children,
    requiredPermissions = [],
    requiredFeature,
    requireAny = true,
    requireOrgAdmin = false,
    fallbackPath = "/employee",
}: RouteGuardProps) {
    const router = useRouter();
    const { permissions, role, loading, organization } = useAuth();

    useEffect(() => {
        // Wait for auth to load
        if (loading) return;

        const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";

        // OrgAdmin bypass for feature check too? usually yes, but let's be strict if feature is disabled globally
        if (requiredFeature) {
            const features = (organization?.organization_features || []).map(f => f.code.toUpperCase());
            if (!features.includes(requiredFeature.toUpperCase())) {
                showError(`The ${requiredFeature} feature is not enabled for your organization.`);
                router.replace(fallbackPath);
                return;
            }
        }

        // OrgAdmin bypass for permissions
        if (requireOrgAdmin && !isOrgAdmin) {
            showError("You need Organization Admin privileges to access this page.");
            router.replace(fallbackPath);
            return;
        }

        // If OrgAdmin, allow access
        if (isOrgAdmin) return;

        // Check permissions
        if (requiredPermissions.length > 0) {
            const userPermissions = (permissions || []).map((p) => (p || "").toUpperCase());
            const required = requiredPermissions.map((p) => p.toUpperCase());

            const hasAccess = requireAny
                ? required.some((p) => userPermissions.includes(p))
                : required.every((p) => userPermissions.includes(p));

            if (!hasAccess) {
                showError("You don't have permission to access this page.");
                router.replace(fallbackPath);
                return;
            }
        }
    }, [loading, permissions, role, organization, requiredPermissions, requiredFeature, requireAny, requireOrgAdmin, fallbackPath, router]);

    // Show loading state while checking permissions
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return <>{children}</>;
}
