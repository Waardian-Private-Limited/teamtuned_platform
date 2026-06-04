import RouteGuard from '@/components/auth/RouteGuard';
import MyActionItems from '@/components/mom/MyActionItems';

export default function EmployeeActionItemsPage() {
    return (
        <RouteGuard requiredPermissions={["MOM_VIEW"]} requireAny>
            <MyActionItems />
        </RouteGuard>
    );
}
