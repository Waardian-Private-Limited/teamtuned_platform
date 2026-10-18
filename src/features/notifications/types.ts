export const CATEGORIES = [
  'approvals', 'leave', 'attendance', 'compoff', 'holiday', 'advance', 'expense', 'wallet',
  'celebration', 'roster', 'meeting', 'recruitment', 'tracking', 'general',
] as const;

export type NotificationCategory = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  approvals: 'Approvals',
  leave: 'Leave',
  attendance: 'Attendance',
  compoff: 'Comp-off',
  holiday: 'Holidays',
  advance: 'Advances',
  expense: 'Expenses',
  wallet: 'Wallet',
  celebration: 'Celebrations',
  roster: 'Roster',
  meeting: 'Meetings',
  recruitment: 'Recruitment',
  tracking: 'Tracking',
  general: 'General',
};

export interface NotificationItemDto {
  id: number;
  event: string;
  category: NotificationCategory;
  title: string;
  body: string;
  screen: string;
  params: Record<string, string>;
  read: boolean;
  resolved: boolean;
  created_at: string;
}

export interface InboxPageDto {
  items: NotificationItemDto[];
  next_before: number | null;
  unread: number;
  by_category: Partial<Record<NotificationCategory, number>>;
}

export interface CategoryPreferenceDto {
  category: NotificationCategory;
  push: boolean;
  sound: boolean;
}
