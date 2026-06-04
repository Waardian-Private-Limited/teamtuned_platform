import RouteGuard from "@/components/auth/RouteGuard";
import LaborBillingConfig from "@/components/org/labor/LaborBillingConfig";

export const metadata = {
    title: "Labor Billing Config | TeamTuned",
    description: "Configure labor attendance billing rates and fees",
};

export default function Page() {
    return (
        <RouteGuard requiredPermissions={["LABOR_RATE_VIEW", "LABOR_RATE_ADD", "LABOR_RATE_EDIT", "LABOR_RATE_DELETE"]} requireAny>
            <LaborBillingConfig />
        </RouteGuard>
    );
}
