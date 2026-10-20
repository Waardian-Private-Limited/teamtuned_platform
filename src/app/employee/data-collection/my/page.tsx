'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { MyFormsPage } from '@/features/data-collection/components/my/MyFormsPage';

export default function Page_my() {
  return <MyFormsPage basePath="/employee/data-collection" />;
}
