'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Search } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import * as api from '../api/employees.api';
import type { BulkSubOrgResult } from '../api/employees.api';
import type { EmployeeListItemDto, FormOptionsDto } from '../types/employees.dto';
import { useEmployeeRoutes } from '../hooks/useEmployeeRoutes';

const th = 'border-b border-line bg-bg-subtle px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted';
const td = 'border-b border-line/60 px-3 py-2 text-xs text-fg sm:text-sm';
const btn = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle disabled:opacity-50 sm:text-sm';
const primary = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] disabled:opacity-50 sm:text-sm';
const NONE = -1; // "No company yet" in the company filter

/**
 * HR maps employees to their company (sub-organization) in bulk: filter (company, or no company yet), tick people,
 * pick the company, check who moves and who cannot (code already used there, department / role of another company),
 * then apply. Only the company changes, plus the department / role HR picks for people whose own does not fit.
 */
export function AssignCompanyPage() {
  const routes = useEmployeeRoutes();
  const { subOrgs } = useManageableSubOrgs();
  const [filterCo, setFilterCo] = React.useState<number | null>(NONE);
  const [search, setSearch] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [data, setData] = React.useState<{ rows: EmployeeListItemDto[]; total: number; pages: number } | null>(null);
  const [error, setError] = React.useState('');
  const [picked, setPicked] = React.useState<Map<number, EmployeeListItemDto>>(() => new Map());
  const [target, setTarget] = React.useState<number | null>(null);
  const [options, setOptions] = React.useState<FormOptionsDto | null>(null);
  const [departmentId, setDepartmentId] = React.useState<number | null>(null);
  const [roleId, setRoleId] = React.useState<number | null>(null);
  const [check, setCheck] = React.useState<BulkSubOrgResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  React.useEffect(() => {
    let off = false;
    setError('');
    api.listEmployees({ search: query, status: 'all', page, pageSize, subOrgId: filterCo && filterCo > 0 ? filterCo : null, withoutSubOrg: filterCo === NONE })
      .then((r) => { if (!off) setData({ rows: r.employees, total: r.total, pages: r.pages }); })
      .catch((e) => { if (!off) setError(messageOf(e)); });
    return () => { off = true; };
  }, [query, page, pageSize, filterCo, version]);
  React.useEffect(() => {
    setOptions(null); setDepartmentId(null); setRoleId(null); setCheck(null);
    if (target) api.getFormOptions(target, false).then(setOptions).catch(() => setOptions(null));
  }, [target]);
  React.useEffect(() => { setCheck(null); }, [picked, departmentId, roleId]);

  const toggle = (rows: EmployeeListItemDto[], on: boolean) => setPicked((p) => {
    const next = new Map(p);
    for (const r of rows) { if (on) next.set(r.id, r); else next.delete(r.id); }
    return next;
  });
  const rows = data?.rows || [];
  const allOnPage = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const companyName = (id: number | null) => (id ? subOrgs.find((s) => s.id === id)?.name || `Company ${id}` : 'No company');
  const body = (dry: boolean) => ({ employee_ids: [...picked.keys()], sub_organization_id: target as number, department_id: departmentId, role_id: roleId, dry_run: dry });

  const run = async (dry: boolean) => {
    if (!target || !picked.size) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.bulkAssignSubOrg(body(dry));
      if (dry) { setCheck(r); return; }
      showSuccess(`${r.moved.length} moved to ${r.company.name}${r.skipped.length ? `, ${r.skipped.length} not moved` : ''}`);
      setCheck(r.skipped.length ? { ...r, dry_run: false } : null);
      setPicked(new Map(r.skipped.flatMap((s) => (picked.has(s.id) ? [[s.id, picked.get(s.id)!] as const] : []))));
      setVersion((v) => v + 1);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const roles = (options?.roles || []).filter((r) => !departmentId || !r.department_id || r.department_id === departmentId);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
        <div className="flex items-center gap-2">
          <Link href={routes.list} aria-label="Back to employees" className={btn}><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-base font-bold text-fg sm:text-lg">Assign company</h1>
            <p className="text-[11px] text-fg-muted sm:text-xs">Tick employees, pick their company and apply. Only the company changes.</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <label className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or code" aria-label="Search employees"
                className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-sm text-fg" />
            </label>
            <select aria-label="Current company" value={filterCo ?? ''} onChange={(e) => { setFilterCo(e.target.value === '' ? null : Number(e.target.value)); setPage(1); }}
              className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg">
              <option value={NONE}>No company yet</option>
              <option value="">All companies</option>
              {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {error && <div className="p-3"><Alert message={error} tone="error" /></div>}
          <div className="min-h-0 flex-1 overflow-auto tt-scroll-hidden">
            <table className="w-full min-w-[560px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={cx(th, 'w-10')}><input type="checkbox" aria-label="Tick everyone on this page" checked={allOnPage} onChange={(e) => toggle(rows, e.target.checked)} /></th>
                  <th className={th}>Employee</th>
                  <th className={th}>Company now</th>
                  <th className={th}>Department · role</th>
                  <th className={th}>Site</th>
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  <tr><td colSpan={5} className={cx(td, 'text-fg-muted')}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className={cx(td, 'py-8 text-center text-fg-muted')}>{filterCo === NONE ? 'Everyone has a company.' : 'Nobody matches.'}</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className={cx('hover:bg-bg-subtle/50', picked.has(r.id) && 'bg-bg-subtle/60')}>
                    <td className={td}><input type="checkbox" aria-label={`Tick ${r.name}`} checked={picked.has(r.id)} onChange={(e) => toggle([r], e.target.checked)} /></td>
                    <td className={td}><div className="font-semibold">{r.name}</div><div className="text-[11px] text-fg-muted">{[r.employee_code, r.status !== 'Active' ? r.status : null].filter(Boolean).join(' · ') || '—'}</div></td>
                    <td className={cx(td, !r.sub_organization_id && 'text-fg-muted')}>{companyName(r.sub_organization_id)}</td>
                    <td className={cx(td, 'text-fg-muted')}>{[r.department_name, r.role_name].filter(Boolean).join(' · ') || '—'}</td>
                    <td className={cx(td, 'text-fg-muted')}>{r.primary_site_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.total > 0 && (
            <div className="border-t border-line px-3 py-2">
              <Pagination currentPage={page} totalPages={data.pages} totalItems={data.total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-fg-muted" aria-hidden /><p className="text-sm font-semibold text-fg">{picked.size} ticked</p>
            {picked.size > 0 && <button type="button" className="ml-auto text-xs font-semibold text-fg-muted hover:text-fg" onClick={() => setPicked(new Map())}>Clear</button>}</div>
          <SelectField<number> label="Move to company" required numeric value={target} placeholder="Pick a company" options={subOrgs.map((s) => ({ value: s.id, label: s.name }))} onChange={setTarget} />
          {target && (
            <>
              <SelectField<number> label="Department, for people whose own belongs to another company" numeric value={departmentId} placeholder="Keep (where it fits)"
                options={(options?.departments || []).map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDepartmentId(v); setRoleId(null); }} />
              <SelectField<number> label="Role, for people whose own belongs to another company" numeric value={roleId} placeholder="Keep (where it fits)"
                options={roles.map((r) => ({ value: r.id, label: r.name }))} onChange={setRoleId} />
            </>
          )}
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={!target || !picked.size || busy} onClick={() => run(true)}>Check</button>
            <button type="button" className={primary} disabled={!target || !picked.size || busy} onClick={() => run(false)}>{busy ? 'Working…' : `Move ${picked.size || ''}`}</button>
          </div>
          {check && (
            <div className="space-y-2 text-xs sm:text-sm">
              <p className="text-fg">{check.dry_run ? 'Will move' : 'Moved'}: <span className="font-semibold">{check.moved.length}</span>{check.already.length ? ` · already there: ${check.already.length}` : ''}</p>
              {check.skipped.length > 0 && (
                <div>
                  <p className="font-semibold text-[var(--tt-danger)]">{check.dry_run ? 'Will not move' : 'Not moved'} ({check.skipped.length})</p>
                  <ul className="mt-1 max-h-60 space-y-1 overflow-auto tt-scroll-hidden">
                    {check.skipped.map((s) => <li key={s.id} className="rounded-md bg-bg-subtle px-2 py-1"><span className="font-semibold">{s.name || `#${s.id}`}</span>{s.code ? ` (${s.code})` : ''}: {s.reason}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <p className="mt-auto text-[11px] text-fg-muted">Payroll drafts recalculate for moved people. Finalized payrolls stay with the old company. Each move is in the employee&apos;s change log.</p>
        </aside>
      </div>
    </div>
  );
}
