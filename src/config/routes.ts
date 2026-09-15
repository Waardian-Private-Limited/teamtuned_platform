export const ROLE_ROUTES: Record<string, string> = {
  superadmin: '/superadmin',
  orgadmin: '/org-admin',
  employee: '/employee',
};

export const DEFAULT_ROUTE = '/login';

export function routeForRole(role?: string): string {
  return ROLE_ROUTES[(role || '').toLowerCase()] || DEFAULT_ROUTE;
}

export const PUBLIC_ROUTES = [
  '/login',
  '/onboarding',
  '/careers',
  '/vendor',
  '/public',
  '/interview/apply',
  '/biometric',
  '/hr-operation/onboarding/status',
];
