import RouteGuard from "@/components/auth/RouteGuard";
import SiteSubOrgMapper from "@/components/org/SiteSubOrgMapper";

export default function SiteSubOrgMapperPage() {
    return (
        <RouteGuard requiredPermissions={["ORGPROFILE_VIEW", "ORGPROFILE_ADD", "ORGPROFILE_EDIT", "ORGPROFILE_DELETE", "SITE_VIEW", "SITE_ADD", "SITE_EDIT", "SITE_DELETE"]} requireAny>
            <SiteSubOrgMapper />
        </RouteGuard>
    );
}
