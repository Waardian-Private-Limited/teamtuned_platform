import { apiClient } from '@/lib/apiClient';
import type {
  OnboardingCatalogResponseDto,
  OnboardingConfigDto,
  OnboardingConfigResponseDto,
} from '../types/onboarding-settings.dto';

const auth = { withAuth: true };

export function getCatalog() {
  return apiClient.get<OnboardingCatalogResponseDto>('/onboarding-settings/catalog', undefined, auth);
}

export function getConfig(subOrgId: number | null) {
  return apiClient.get<OnboardingConfigResponseDto>('/onboarding-settings', { subOrgId: subOrgId ?? undefined }, auth);
}

export function updateConfig(subOrgId: number | null, config: OnboardingConfigDto) {
  return apiClient.put<OnboardingConfigResponseDto>(
    '/onboarding-settings',
    { sub_organization_id: subOrgId ?? undefined, config },
    auth
  );
}
