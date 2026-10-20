import { redirect } from 'next/navigation';

// The board is a view of the tasks screen now.
export default function Page_tasks_board() {
  redirect('/org-admin/tasks?view=board');
}
