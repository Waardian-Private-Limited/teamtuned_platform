import { redirect } from 'next/navigation';

// The org portal account is not an employee, so its home is the attendance dashboard.
export default function OrgAdminPage() {
  redirect('/org-admin/attendance/dashboard');
}
