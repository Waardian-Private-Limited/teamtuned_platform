'use client';

import { TeamAppraisalsPage } from '@/features/compensation/components/team/TeamAppraisalsPage';

// Open to any employee: the server lists only the people this employee rates as their manager.
export default function Page() {
  return <TeamAppraisalsPage />;
}
