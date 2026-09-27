'use client';

import { useEffect, useRef, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { messageOf } from '@/lib/api/errors';
import type { SectionNode } from '../components/editor/form/schemaTypes';

export interface PolicyConfigSchemaDescribe {
  workRules: SectionNode;
  leave: SectionNode;
  payrollCycle: SectionNode;
}

// The config editor's field metadata — fetched once per session (it only
// changes when the backend schema itself changes) and shared across every
// policy the admin opens.
let cache: PolicyConfigSchemaDescribe | null = null;

export function usePolicySchema() {
  const [schema, setSchema] = useState<PolicyConfigSchemaDescribe | null>(cache);
  const [isLoading, setIsLoading] = useState(!cache);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (cache || inFlightRef.current) return;
    inFlightRef.current = true;
    policiesApi
      .getPolicySchema()
      .then((res) => {
        cache = res.describe as unknown as PolicyConfigSchemaDescribe;
        setSchema(cache);
      })
      .catch((err) => setError(messageOf(err)))
      .finally(() => {
        inFlightRef.current = false;
        setIsLoading(false);
      });
  }, []);

  return { schema, isLoading, error };
}
