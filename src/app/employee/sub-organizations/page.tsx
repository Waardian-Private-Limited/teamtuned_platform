import RouteGuard from "@/components/auth/RouteGuard";
import SubOrganizations from "@/components/org/SubOrganizations";

export default function SubOrganizationsPage() {
    return (
        <RouteGuard requireOrgAdmin>
            <SubOrganizations />
        </RouteGuard>
    );
}
