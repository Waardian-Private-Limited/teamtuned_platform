export const ROLE_ROUTES: Record<string, string> = {
  superadmin: '/superadmin',
  orgadmin: '/org-admin',
  employee: '/employee',
};

export const DEFAULT_ROUTE = '/login';

export const EMPLOYEE_ONBOARDING_ROUTE = '/onboarding/employee';

export function routeForRole(role?: string): string {
  return ROLE_ROUTES[(role || '').toLowerCase()] || DEFAULT_ROUTE;
}

// A 'consent' next_step is no longer a destination of its own — the user
// still lands on their normal role route, and ConsentGateModal (mounted at
// the app root) pops up over it, no matter which route that is.
export function routeAfterLogin(role: string | undefined, nextStep: 'dashboard' | 'onboarding' | 'consent' | undefined): string {
  if (nextStep === 'onboarding') return EMPLOYEE_ONBOARDING_ROUTE;
  return routeForRole(role);
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
