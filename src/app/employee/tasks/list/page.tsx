'use client';

import { Suspense } from 'react';
import { TasksWorkspace } from '@/features/task-management/components/TasksWorkspace';

export default function Page_tasks_list() {
  return <Suspense><TasksWorkspace mode="all" /></Suspense>;
}
