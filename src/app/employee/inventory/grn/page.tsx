import RouteGuard from "@/components/auth/RouteGuard";
import GrnList from "@/components/inventory/grn/GrnList";

export default function GrnListPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <GrnList />
        </RouteGuard>
    );
}
