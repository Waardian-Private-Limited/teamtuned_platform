import { JobDetailPage } from '@/features/careers/components/JobDetailPage';

export const metadata = { title: 'Job details' };

export default async function CareersJobRoute({ params }: { params: Promise<{ slug: string; jobSlug: string }> }) {
  const { slug, jobSlug } = await params;
  return <JobDetailPage slug={slug} jobSlug={jobSlug} />;
}
