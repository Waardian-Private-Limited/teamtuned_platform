import type { Metadata } from 'next';
import { OfferPage } from '@/features/careers/components/OfferPage';

// Token pages: never indexed, and the token never leaks via the Referer header.
export const metadata: Metadata = { title: 'Your offer', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function CareersOfferRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OfferPage token={token} />;
}
