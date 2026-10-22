'use client';

import { useParams } from 'next/navigation';
import { TeamPage } from '@/features/teams/components/TeamPage';

export default function Page() {
  const params = useParams<{ key: string }>();
  return <TeamPage key={params.key} teamKey={decodeURIComponent(params.key)} basePath="/employee" />;
}
