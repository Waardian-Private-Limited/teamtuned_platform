import type { Metadata } from 'next';
import { PublicFeedbackPage } from '@/features/performance/components/PublicFeedbackPage';

// Token page for outside reviewers: never indexed, and the token never leaks via the Referer header.
export const metadata: Metadata = { title: 'Give feedback', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function PublicFeedbackRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicFeedbackPage token={token} />;
}
