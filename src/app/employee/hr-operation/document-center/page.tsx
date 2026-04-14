import RouteGuard from "@/components/auth/RouteGuard";
import DocumentCenter from "@/components/hr-operation/DocumentCenter";

export default function DocumentCenterPage() {
    return (
        <RouteGuard requiredPermissions={["HR_MODE"]} requireAny>
            <DocumentCenter />
        </RouteGuard>
    );
}
