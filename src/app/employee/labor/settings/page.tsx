import RouteGuard from "@/components/auth/RouteGuard";
import LaborSettingsManager from "@/components/org/labor/LaborSettingsManager";

export default function LaborSettingsPage() {
    return (
        <RouteGuard requiredPermissions={["LABOR_SETTINGS_VIEW", "LABOR_SETTINGS_EDIT"]} requireAny>
            <div>
                <LaborSettingsManager />
            </div>
        </RouteGuard>
    );
}
