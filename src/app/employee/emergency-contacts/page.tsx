import RouteGuard from "@/components/auth/RouteGuard";
import EmergencyContacts from "@/components/EmergencyContacts";

export default function EmergencyContactsPage() {
    return (
        <RouteGuard requiredPermissions={["EMP_VIEW"]} requireAny>
            <EmergencyContacts />
        </RouteGuard>
    );
}
