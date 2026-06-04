import RouteGuard from "@/components/auth/RouteGuard";
import MomMeetingList from "@/components/mom/MomMeetingList";

export default function EmployeeMomList() {
    return (
        <RouteGuard requiredPermissions={["MOM_VIEW", "MOM_ADD", "MOM_EDIT", "MOM_DELETE"]} requireAny>
            <MomMeetingList basePath="/employee/mom" />
        </RouteGuard>
    );
}
