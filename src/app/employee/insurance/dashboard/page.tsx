import RouteGuard from "@/components/auth/RouteGuard";
import InsuranceDashboard from "@/components/insurance/InsuranceDashboard";

export default function Page() {
    return (
        <RouteGuard requiredPermissions={["INS_POLICY_VIEW", "INS_PROVIDER_VIEW"]} requireAny>
            <InsuranceDashboard />
        </RouteGuard>
    );
}
