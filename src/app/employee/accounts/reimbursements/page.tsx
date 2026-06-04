import RouteGuard from "@/components/auth/RouteGuard";
import ReimbursementAccounts from "@/components/hr-operation/ReimbursementAccounts";

export default function AccountsReimbursementsPage() {
    return (
        <RouteGuard requiredPermissions={["HR_MODE"]} requireAny>
            <ReimbursementAccounts />
        </RouteGuard>
    );
}
