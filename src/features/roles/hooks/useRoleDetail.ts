'use client';

import { useCallback, useEffect, useState } from 'react';
import * as rolesApi from '../api/roles.api';
import { toRoleDetail, toRoleAudit } from '../types/roles.mapper';
import type { RoleDetail, RoleAuditResult } from '../types/roles.model';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';

// Backs the role detail drawer: the effective-permission view ("what can
// this role actually do") plus its paginated change audit trail.
export function useRoleDetail(roleId: number | null) {
  const [detail, setDetail] = useState<RoleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audit, setAudit] = useState<RoleAuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);

  const loadDetail = useCallback(async () => {
    if (!roleId) return;
    setIsLoading(true);
    try {
      const dto = await rolesApi.getRole(roleId);
      setDetail(toRoleDetail(dto));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, [roleId]);

  const loadAudit = useCallback(async (page = 1) => {
    if (!roleId) return;
    setAuditLoading(true);
    try {
      const dto = await rolesApi.listRoleAudit(roleId, page);
      setAudit(toRoleAudit(dto));
      setAuditPage(page);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setAuditLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (roleId) {
      loadDetail();
      loadAudit(1);
    } else {
      setDetail(null);
      setAudit(null);
    }
  }, [roleId, loadDetail, loadAudit]);

  return { detail, isLoading, audit, auditLoading, auditPage, setAuditPage: loadAudit, refetch: loadDetail };
}
