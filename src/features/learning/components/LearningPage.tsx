'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Pencil, Plus } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { Chip, SelectField, TextField } from '@/components/ui/FormControls';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Textarea } from '@/components/ui/Textarea';
import { btnClass, Btn, IconBtn, PageHead, Panel, SearchBox, Stat, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/learning.api';
import type { Catalog, Course, CourseKind, Team } from '../api/learning.api';
import { KIND_LABEL } from './labels';
import { PlanView } from './PlanView';

type Tab = 'mine' | 'team' | 'catalog';

/** Learning: my plan, the plans of the people I look after, and the course catalog. */
export function LearningPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (['mine', 'team', 'catalog'].includes(params.get('tab') || '') ? params.get('tab') : 'mine') as Tab;
  const setTab = (t: Tab) => router.replace(`?tab=${t}`, { scroll: false });
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Learning" subtitle="Courses and plans" help={HELP.learning}
        actions={<SegmentedControl<Tab> options={[{ value: 'mine', label: 'My plan' }, { value: 'team', label: 'My team' }, { value: 'catalog', label: 'Catalog' }]} value={tab} onChange={setTab} fitText />} />
      <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
        {tab === 'mine' && <PlanView employeeId="me" />}
        {tab === 'team' && <TeamView basePath={basePath} />}
        {tab === 'catalog' && <CatalogView />}
      </div>
    </div>
  );
}

function TeamView({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState('');
  const [data, setData] = React.useState<Team | null>(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => { const t = setTimeout(() => api.team(q.trim() || undefined).then(setData).catch((e) => setError(messageOf(e))), q ? 250 : 0); return () => clearTimeout(t); }, [q]);
  const href = (id: number) => `${basePath}/learning/people/${id}`;
  const s = data?.summary;
  return (
    <div className="space-y-3">
      {s && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="People" value={s.people} note={`${s.with_plan} with a plan`} />
          <Stat label="Items" value={s.items} />
          <Stat label="Done" value={s.items ? `${Math.round((s.done / s.items) * 100)}%` : '—'} />
          <Stat label="Overdue" value={s.overdue} />
          <Stat label="To confirm" value={s.to_confirm} />
        </div>
      )}
      <Panel className="min-h-[20rem]">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-muted">{data?.is_hr ? 'Everyone' : 'Your reporting line'} · items to confirm first</p>
          <SearchBox value={q} onChange={setQ} placeholder="Search name or code…" />
        </div>
        {error && <p role="alert" className="p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
        {!data && !error && <TableSkeleton rows={4} columns={5} />}
        {data?.items.length === 0 && <EmptyState compact illustration={{ src: '/vectors/teams.svg', width: 220, height: 160, alt: '' }} title="Nobody to look after" description="When people report to you, their learning plans show here." />}
        {data && data.items.length > 0 && (
          <Table minWidth={680} head={[{ label: 'Employee' }, { label: 'Items', className: 'w-24' }, { label: 'Done', className: 'w-24' }, { label: 'Overdue', className: 'w-24' }, { label: 'To confirm', className: 'w-28' }, { label: 'Actions', className: 'w-24 text-right' }]}>
            {data.items.map((p) => (
              <tr key={p.id} onClick={() => router.push(href(p.id))} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
                <td className={td}><span className="font-semibold">{p.name}</span><span className="block text-[11px] text-fg-muted">{[p.employee_code, p.designation].filter(Boolean).join(' · ')}</span></td>
                <td className={td}>{p.total}</td>
                <td className={td}>{p.done}</td>
                <td className={td}><span className={p.overdue ? 'font-semibold text-[var(--tt-danger)]' : ''}>{p.overdue}</span></td>
                <td className={td}><span className={p.to_confirm ? 'font-semibold' : 'text-fg-muted'}>{p.to_confirm}</span></td>
                <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}><Link href={href(p.id)} className={btnClass('secondary', 'sm')}>Open</Link></td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}

function CatalogView() {
  const [status, setStatus] = React.useState<'active' | 'archived'>('active');
  const [q, setQ] = React.useState('');
  const [skill, setSkill] = React.useState<number | null>(null);
  const [data, setData] = React.useState<Catalog | null>(null);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<Course | 'new' | null>(null);
  const load = React.useCallback(() => api.catalog({ status, q: q.trim() || undefined, competency_id: skill ?? undefined }).then(setData).catch((e) => setError(messageOf(e))), [status, q, skill]);
  React.useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  const archive = async (c: Course) => { try { await api.setCourseArchived(c.id, status === 'active'); load(); } catch (e) { setError(messageOf(e)); } };
  const skillName = (id: number) => data?.competencies.find((x) => x.id === id)?.name;

  return (
    <Panel className="min-h-[20rem]">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox value={q} onChange={setQ} placeholder="Search courses…" />
        <div className="flex flex-wrap items-center gap-2">
          {data && data.competencies.length > 0 && <div className="w-56"><SelectField<number> label="" numeric value={skill} placeholder="Any skill" onChange={setSkill} options={data.competencies.map((c) => ({ value: c.id, label: c.name }))} /></div>}
          {data?.can_manage && <SegmentedControl<'active' | 'archived'> options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} value={status} onChange={setStatus} fitText />}
          {data?.can_manage && <Btn icon={Plus} onClick={() => setEditing('new')}>Add course</Btn>}
        </div>
      </div>
      {error && <p role="alert" className="p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {!data && !error && <TableSkeleton rows={4} columns={4} />}
      {data?.items.length === 0 && <EmptyState compact illustration={{ src: '/vectors/patterns.svg', width: 220, height: 160, alt: '' }} title="No courses here" description={data.can_manage ? 'Add courses people can take: online courses, videos, reading or classroom sessions. Tag each with the skills it builds.' : 'HR has not added courses yet.'} action={data.can_manage && status === 'active' ? { label: 'Add course', onClick: () => setEditing('new') } : undefined} />}
      {data && data.items.length > 0 && (
        <Table minWidth={720} head={[{ label: 'Course' }, { label: 'Kind', className: 'w-36' }, { label: 'Builds', className: 'w-56' }, { label: 'On plans', className: 'w-24' }, { label: 'Actions', className: 'w-28 text-right' }]}>
          {data.items.map((c) => (
            <tr key={c.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={td}>
                <span className="inline-flex items-center gap-1.5 font-semibold">{c.title}{c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label="Open" className="text-fg-muted hover:text-fg"><ExternalLink className="h-3.5 w-3.5" /></a>}</span>
                <span className="block text-[11px] text-fg-muted">{[c.provider, c.duration_minutes ? `${c.duration_minutes} min` : null].filter(Boolean).join(' · ')}</span>
              </td>
              <td className={`${td} text-fg-muted`}>{KIND_LABEL[c.kind]}</td>
              <td className={`${td} text-[11px] text-fg-muted`}>{c.competency_ids.map(skillName).filter(Boolean).join(', ') || '—'}</td>
              <td className={td}>{c.assigned_count ?? 0}</td>
              <td className={`${td} text-right`}>
                {data.can_manage && (
                  <div className="flex justify-end gap-1">
                    {status === 'active' && <IconBtn label="Edit" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></IconBtn>}
                    <IconBtn label={status === 'active' ? 'Archive' : 'Restore'} onClick={() => archive(c)}>{status === 'active' ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}</IconBtn>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && data && <CourseDialog course={editing === 'new' ? null : editing} skills={data.competencies} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); showSuccess('Saved'); load(); }} />}
    </Panel>
  );
}

function CourseDialog({ course, skills, onClose, onSaved }: { course: Course | null; skills: { id: number; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState({ title: course?.title || '', description: course?.description || '', kind: (course?.kind || 'online') as CourseKind, url: course?.url || '', provider: course?.provider || '', duration: course?.duration_minutes ? String(course.duration_minutes) : '', skills: course?.competency_ids || [] });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    setBusy(true); setErrors({});
    const body = { title: f.title, description: f.description, kind: f.kind, url: f.url, provider: f.provider, duration_minutes: f.duration || null, competency_ids: f.skills };
    try { if (course) await api.updateCourse(course.id, body); else await api.createCourse(body); onSaved(); } catch (e) {
      const data = (e as { data?: { errors?: Record<string, string> } }).data;
      setErrors(data?.errors || { form: messageOf(e) });
    } finally { setBusy(false); }
  };
  const toggle = (id: number) => setF({ ...f, skills: f.skills.includes(id) ? f.skills.filter((x) => x !== id) : [...f.skills, id] });
  return (
    <Dialog open onClose={onClose} title={course ? 'Edit course' : 'Add course'} maxWidthClassName="max-w-2xl" footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Save</Btn></>}>
      <div className="space-y-3">
        <TextField label="Title" required value={f.title} onChange={(v) => setF({ ...f, title: v })} maxLength={200} error={errors.title} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField<CourseKind> label="Kind" value={f.kind} onChange={(v) => v && setF({ ...f, kind: v })} options={(Object.keys(KIND_LABEL) as CourseKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
          <TextField label="Provider" value={f.provider} onChange={(v) => setF({ ...f, provider: v })} maxLength={120} placeholder="Coursera, YouTube, in-house" />
          <TextField label="Length (minutes)" type="number" value={f.duration} onChange={(v) => setF({ ...f, duration: v })} error={errors.duration_minutes} />
        </div>
        <TextField label="Link" value={f.url} onChange={(v) => setF({ ...f, url: v })} maxLength={1000} placeholder="https://" error={errors.url} />
        <Textarea label="About (optional)" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        {skills.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg">Builds these skills <span className="font-normal text-fg-muted">· suggested when someone is rated low on them</span></p>
            <div className="flex flex-wrap gap-1.5">{skills.map((s) => <Chip key={s.id} active={f.skills.includes(s.id)} onClick={() => toggle(s.id)}>{s.name}</Chip>)}</div>
            {errors.competency_ids && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{errors.competency_ids}</p>}
          </div>
        )}
        {errors.form && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}
      </div>
    </Dialog>
  );
}

/** One person's plan, opened from My team. */
export function PersonPlanPage({ id, basePath }: { id: number; basePath: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title={<><Link href={`${basePath}/learning?tab=team`} aria-label="Back" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>Learning plan</>} help={HELP.learning} />
      <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden"><PlanView employeeId={id} /></div>
    </div>
  );
}
