import RouteGuard from "@/components/auth/RouteGuard";
import StoreStock from "@/components/inventory/StoreStock";

export default function StoreStockPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <StoreStock />
        </RouteGuard>
    );
}
