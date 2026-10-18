'use client';

import { useEffect, useState } from 'react';
import { getScorecardSetup } from '../api/recruitment.api';
import type { ScorecardSetupDto } from '../types/recruitment.dto';

type Target = { applicationId: number } | { subOrganizationId: number | null };

/**
 * The scorecard set-up (criteria library + panel visibility) for an application or a
 * sub-organization. `null` while loading or when it cannot be read; callers then fall back to
 * free-text criteria and show both switches.
 */
export function useScorecardSetup(target: Target | null) {
  const key = !target ? null : 'applicationId' in target ? `a:${target.applicationId}` : `s:${target.subOrganizationId ?? ''}`;
  const [state, setState] = useState<{ key: string | null; setup: ScorecardSetupDto | null }>({ key: null, setup: null });

  useEffect(() => {
    if (!key || !target) return;
    let alive = true;
    getScorecardSetup(target)
      .then((setup) => { if (alive) setState({ key, setup }); })
      .catch(() => { if (alive) setState({ key, setup: null }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the target's value
  }, [key]);

  return state.key === key ? state.setup : null;
}
