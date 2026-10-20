'use client';

import { Suspense } from 'react';
import { TasksWorkspace } from '@/features/task-management/components/TasksWorkspace';

export default function Page_tasks() {
  return <Suspense><TasksWorkspace mode="personal" /></Suspense>;
}
