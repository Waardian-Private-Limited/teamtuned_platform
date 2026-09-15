'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { clearClientSideAuth, getToken } from '@/lib/auth/session';
import { getSocket, disconnectSocket } from '@/lib/socket';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface Employee {
  id: number;
  employee_id?: number;
  employee_code?: string;
  permissions?: string[];
  sites?: Array<{ id: number; name?: string; code?: string }>;
  department_id?: number;
  designation_id?: number;
  role_name?: string;
  designation?: string;
  is_head_office_user?: boolean;
  allow_punch_from_hq?: boolean;
}

interface Organization {
  id: number;
  name: string;
  logo_url?: string | null;
  organization_features?: Array<{ id: number; code: string; name: string }>;
}

type Role = 'superAdmin' | 'OrgAdmin' | 'Employee';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  permissions: string[];
  employee: Employee | null;
  employee_id: number | null;
  organization: Organization | null;
  organization_features?: Array<{ id: number; code: string; name: string }>;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setAuthState: (data: Partial<SessionResponse>) => void;
}

interface SessionResponse {
  authenticated: boolean;
  role?: string;
  user?: User;
  permissions?: string[];
  employee?: Employee;
  employee_id?: number;
  organization?: Organization;
  organization_features?: Array<{ id: number; code: string; name: string }>;
  isAuthenticated?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employee_id, setEmployeeId] = useState<number | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const clearAuthState = () => {
    setUser(null);
    setRole(null);
    setEmployee(null);
    setEmployeeId(null);
    setOrganization(null);
    setPermissions([]);
    setIsAuthenticated(false);
  };

  const fetchSession = useCallback(async () => {
    try {
      const data = await apiClient<SessionResponse>('/auth/session', {
        method: 'GET',
        withAuth: true,
      });

      if (data.authenticated && data.user) {
        setUser(data.user);
        setRole((data.role as Role) ?? null);
        setEmployee(data.employee || null);
        setEmployeeId(data.employee_id || data.employee?.employee_id || null);
        setOrganization(
          data.organization
            ? { ...data.organization, organization_features: data.organization_features }
            : null
        );
        setPermissions(data.employee?.permissions || []);
        setIsAuthenticated(true);
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearClientSideAuth();
      clearAuthState();
      disconnectSocket();
      router.push('/login');
    }
  }, [router]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    await fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const token = getToken();
      const socket = getSocket(token || undefined);
      if (socket) {
        socket.off('session_revoked');
        socket.on('session_revoked', (data: { token?: string; all?: boolean; logoutAllMobile?: boolean; userId?: number }) => {
          const currentToken = getToken();
          const shouldLogout =
            data.token === currentToken ||
            data.all === true ||
            (data.logoutAllMobile === true && data.userId === user.id && role?.toLowerCase() === 'employee');

          if (shouldLogout) logout();
        });
      }
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, user?.id, role, logout]);

  const setAuthState = useCallback((data: Partial<SessionResponse>) => {
    if (data.user) {
      setUser(data.user);
      setRole((data.role as Role) ?? null);
      setEmployee(data.employee || null);
      setEmployeeId(data.employee_id || data.employee?.employee_id || null);
      setOrganization(
        data.organization
          ? { ...data.organization, organization_features: data.organization_features }
          : null
      );
      setPermissions(data.employee?.permissions || []);
      setIsAuthenticated(true);
    }
  }, []);

  const value: AuthContextType = {
    user,
    role,
    permissions,
    employee,
    employee_id,
    organization,
    isAuthenticated,
    loading,
    logout,
    refreshSession,
    setAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
