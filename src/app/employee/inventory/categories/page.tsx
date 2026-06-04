import RouteGuard from "@/components/auth/RouteGuard";
import CategoryList from "@/components/inventory/CategoryList";

export default function EmployeeCategoriesPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <CategoryList />
        </RouteGuard>
    );
}
