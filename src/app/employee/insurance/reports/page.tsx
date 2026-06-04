import RouteGuard from "@/components/auth/RouteGuard";
import InsuranceReports from "@/components/insurance/Reports";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["INS_POLICY_VIEW", "INS_PROVIDER_VIEW"]} requireAny>
      <InsuranceReports />
    </RouteGuard>
  );
}
