import RouteGuard from "@/components/auth/RouteGuard";
import InsurancePolicies from "@/components/insurance/Policies";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["INS_POLICY_VIEW", "INS_POLICY_ADD", "INS_POLICY_EDIT", "INS_POLICY_DELETE"]} requireAny>
      <InsurancePolicies />
    </RouteGuard>
  );
}
