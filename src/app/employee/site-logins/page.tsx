import RouteGuard from "@/components/auth/RouteGuard";
import SiteLoginsManager from "@/components/sites/SiteLoginsManager";

export default function EmployeeSiteLoginsPage() {
    return (
        <RouteGuard requireOrgAdmin>
            <SiteLoginsManager />
        </RouteGuard>
    );
}
