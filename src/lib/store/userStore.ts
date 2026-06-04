import { create } from 'zustand';

export interface UserInfo {
  id: string;
  employeeId?: string;
  email: string;
  role: string;
  societyId?: string;
  name?: string;
  features?: string[];
  siteId?: number;
  departmentId?: number;
}

interface UserStore {
  user?: UserInfo;
  setUser: (u: UserInfo) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: undefined,
  setUser: (u) => set({ user: u }),
  clearUser: () => set({ user: undefined }),
}));