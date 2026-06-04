import RouteGuard from "@/components/auth/RouteGuard";
import ReimbursementManagement from "@/components/hr-operation/ReimbursementManagement";

export default function AllReimbursementsPage() {
    return (
        <RouteGuard requiredPermissions={["REIMB_VIEW", "REIMB_APPROVE", "REIMB_REJECT", "REIMB_EXPORT"]} requireAny>
            <ReimbursementManagement isHR={true} />
        </RouteGuard>
    );
}
