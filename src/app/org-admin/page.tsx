import { redirect } from 'next/navigation';

// The org portal account's home: birthdays, meetings and tasks at a glance.
export default function OrgAdminPage() {
  redirect('/org-admin/dashboard');
}
