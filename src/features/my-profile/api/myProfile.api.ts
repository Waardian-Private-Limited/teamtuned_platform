import { apiClient } from '@/lib/apiClient';
import type { MyProfileDto } from '../types/myProfile.dto';

const auth = { withAuth: true };

export function getMyProfile() {
  return apiClient.get<MyProfileDto>('/me/profile', undefined, auth);
}
