import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';

export default async function Home() {
  try {
    const cookieHeader = (await cookies()).toString();
    const res = await fetch(`${BASE_URL}/auth/session`, {
      method: 'GET',
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!res.ok) {
      redirect('/login');
    }

    const data = await res.json();
    const isAuthenticated = !!data.authenticated;
    const role: string | undefined = data.role;

    if (!isAuthenticated) {
      redirect('/login');
    }

    const roleRoutes: Record<string, string> = {
      superAdmin: '/superadmin',
      OrgAdmin: '/org-admin',
      Employee: '/employee',
    };

    redirect(roleRoutes[role ?? ''] ?? '/dashboard');
  } catch (err) {
    redirect('/login');
  }
}