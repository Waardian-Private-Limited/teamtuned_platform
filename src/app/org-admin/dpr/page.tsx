import { redirect } from 'next/navigation';

/** DPR opens on the daily forms. */
export default function Page() {
  redirect('/org-admin/dpr/daily');
}
