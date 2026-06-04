import RouteGuard from "@/components/auth/RouteGuard";
import ItemList from "@/components/inventory/ItemList";

export default function EmployeeItemsPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <ItemList />
        </RouteGuard>
    );
}
