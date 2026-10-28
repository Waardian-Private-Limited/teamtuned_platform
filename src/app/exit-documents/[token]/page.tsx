import type { Metadata } from 'next';
import { PublicExitDocumentsPage } from '@/features/exits/components/PublicExitDocumentsPage';

// Token pages: never indexed, and the token never leaks via the Referer header.
export const metadata: Metadata = { title: 'Your documents', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function ExitDocumentsRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicExitDocumentsPage token={token} />;
}
