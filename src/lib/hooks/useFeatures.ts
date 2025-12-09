import { useUserStore } from '@/lib/store/userStore';

export const useFeatures = () => {
    const user = useUserStore((state) => state.user);

    const hasFeature = (featureCode: string) => {
        // If no features loaded yet, assume restricted or unrestricted? 
        // Safest: if features array exists, check it. If undefined, maybe allow? 
        // Given the requirement "Control ... based on allowed_features", 
        // if features is undefined (e.g. superadmin or loading), we might need special handling.
        // For Superadmin, features might be empty or full. 
        // Actually superadminController logic says "if role !== superadmin ... getOrgFeatures".
        // So Superadmin has NO features list. Superadmin sees everything.

        if (user?.role === 'superAdmin' || user?.role === 'superadmin') return true;

        if (!user?.features) return false;
        return user.features.includes(featureCode);
    };

    return { hasFeature, features: user?.features || [] };
};
