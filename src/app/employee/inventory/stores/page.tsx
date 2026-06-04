import RouteGuard from "@/components/auth/RouteGuard";
import StoreSelector from "@/components/inventory/StoreSelector";

export default function InventoryStoresPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <StoreSelector />
        </RouteGuard>
    );
}
