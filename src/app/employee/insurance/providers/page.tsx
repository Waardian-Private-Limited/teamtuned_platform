import RouteGuard from "@/components/auth/RouteGuard";
import InsuranceProviders from "@/components/insurance/Providers";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["INS_PROVIDER_VIEW", "INS_PROVIDER_ADD", "INS_PROVIDER_EDIT", "INS_PROVIDER_DELETE"]} requireAny>
      <InsuranceProviders />
    </RouteGuard>
  );
}
