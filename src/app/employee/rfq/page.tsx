import RouteGuard from "@/components/auth/RouteGuard";
import RfqList from "@/components/rfq/RfqList";

export default function EmployeeRfqPage() {
    return (
        <RouteGuard requiredPermissions={["RFQ_VIEW"]} requireAny>
            <RfqList />
        </RouteGuard>
    );
}
