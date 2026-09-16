'use client';

import { useCallback, useEffect, useState } from 'react';
import * as rolesApi from '../api/roles.api';
import { toPermissionCategory } from '../types/roles.mapper';
import type { PermissionCategory } from '../types/roles.model';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';

// Org-filtered permission catalog, grouped by category — the same tree the
// role form, permission-set editor, and bulk-apply drawer all render.
export function usePermissionCatalog() {
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const dto = await rolesApi.listPermissionCatalog();
      setCategories((dto.categories || []).map(toPermissionCategory));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, isLoading, refetch: load };
}
