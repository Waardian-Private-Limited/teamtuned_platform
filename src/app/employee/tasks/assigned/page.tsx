import { redirect } from 'next/navigation';

// "Assigned by me" is a tab of the tasks screen now.
export default function Page_tasks_assigned() {
  redirect('/employee/tasks?scope=assigned');
}
