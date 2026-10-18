import { Suspense } from 'react';
import { CareersBoardPage } from '@/features/careers/components/CareersBoardPage';

export const metadata = { title: 'Careers' };

export default async function CareersBoardRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={null}>
      <CareersBoardPage slug={slug} />
    </Suspense>
  );
}
