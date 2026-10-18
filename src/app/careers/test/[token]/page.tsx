import type { Metadata } from 'next';
import { AssessmentPage } from '@/features/careers/components/AssessmentPage';

// Token pages: never indexed, and the token never leaks via the Referer header.
export const metadata: Metadata = { title: 'Assessment', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function CareersTestRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AssessmentPage token={token} />;
}
