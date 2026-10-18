import { apiClient } from '@/lib/api/client';

const auth = { withAuth: true } as const;
const BASE = '/celebrations/birthdays';

export interface BirthdayDto {
  employee_id: number;
  name: string;
  designation: string | null;
  site_name: string | null;
  is_me: boolean;
  likes: number;
  liked: boolean;
  wishes: number;
}

export interface WishDto {
  id: number;
  author: { id: number; name: string; designation: string | null };
  message: string;
  created_at: string;
  mine: boolean;
  likes: number;
  liked: boolean;
  replies: WishDto[];
}

export interface WallDto {
  celebrant: { id: number; name: string; designation: string | null; site_name: string | null; is_me: boolean };
  year: number;
  is_today: boolean;
  features: { likes: boolean; wishes: boolean };
  likes: { count: number; liked: boolean };
  wishes: WishDto[];
  next_before: number | null;
}

export const getToday = () => apiClient<{ list: BirthdayDto[]; features: { likes: boolean; wishes: boolean } }>(`${BASE}/today`, auth);
export const getWall = (employeeId: number, before?: number | null) => apiClient<WallDto>(`${BASE}/${employeeId}/wall`, { ...auth, params: { before } });
export const sendWish = (employeeId: number, message: string, parentId?: number) =>
  apiClient<{ id: number }>(`${BASE}/${employeeId}/wishes`, { ...auth, method: 'POST', body: { message, parentId } });
export const removeWish = (wishId: number) => apiClient<{ deleted: boolean }>(`${BASE}/wishes/${wishId}`, { ...auth, method: 'DELETE' });
export const setWishLike = (wishId: number, on: boolean) => apiClient<{ liked: boolean; count: number }>(`${BASE}/wishes/${wishId}/like`, { ...auth, method: on ? 'PUT' : 'DELETE' });
export const setLike = (employeeId: number, on: boolean) => apiClient<{ liked: boolean; count: number }>(`${BASE}/${employeeId}/like`, { ...auth, method: on ? 'PUT' : 'DELETE' });
