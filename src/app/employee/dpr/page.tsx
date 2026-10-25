import { redirect } from 'next/navigation';

/** DPR opens on the daily forms. */
export default function Page() {
  redirect('/employee/dpr/daily');
}
