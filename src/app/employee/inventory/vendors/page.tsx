import RouteGuard from "@/components/auth/RouteGuard";
import VendorList from "@/components/inventory/VendorList";

export default function EmployeeVendorsPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <VendorList />
        </RouteGuard>
    );
}
