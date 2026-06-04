import RouteGuard from "@/components/auth/RouteGuard";
import ClaimManagement from "@/components/insurance/ClaimManagement";

export default function ClaimsPage() {
    return (
        <RouteGuard requiredPermissions={["INS_CLAIM_VIEW", "INS_CLAIM_ADD", "INS_CLAIM_EDIT", "INS_CLAIM_APPROVE"]} requireAny>
            <ClaimManagement />
        </RouteGuard>
    );
}
