'use client';

import React from 'react';
import { Pencil, Plus, Sparkles } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/FormControls';
import { StatusPill } from '@/components/ui/StatusPill';
import { Switch } from '@/components/ui/Switch';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { CATEGORY_ICON_LABEL, categoryIcon } from '@/features/reimbursement/constants/reimbursement.constants';
import type { Category } from '@/features/reimbursement/types/reimbursement.model';
import { placeErrors } from '@/features/reimbursement/utils/errors';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/petty-cash.api';
import { ILLUSTRATIONS, PC } from '../constants/petty-cash.constants';
import { useCategories } from '../hooks/useCategories';
import { invalidateFilterLists } from '../hooks/useFilterLists';
import { usePettyCashAccess } from '../hooks/usePettyCashAccess';
import { CategoryIcon, FormError, Gate, PageHeader, primaryBtn } from './components/Primitives';

export function CategoriesPage() {
  const { enabled, can } = usePettyCashAccess();
  return (
    <Gate enabled={enabled} allowed={can(PC.ADMIN)} what="petty cash categories">
      <Categories />
    </Gate>
  );
}

const FIELDS = ['name', 'code', 'icon', 'description', 'gl_code', 'sort_order', 'sub_organization_id', 'needs_inward'];

function CategoryDialog({ open, category, icons, onClose, onSaved }: { open: boolean; category: Category | null; icons: string[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [icon, setIcon] = React.useState('other');
  const [description, setDescription] = React.useState('');
  const [glCode, setGlCode] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState('');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [needsInward, setNeedsInward] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setCode(category?.code ?? '');
    setIcon(category?.icon ?? 'other');
    setDescription(category?.description ?? '');
    setGlCode(category?.glCode ?? '');
    setSortOrder(category ? String(category.sortOrder) : '');
    setSubOrgId(category?.subOrganizationId ?? null);
    setNeedsInward(category?.needsInward ?? false);
    setErrors({});
    setFormError('');
  }, [open, category]);

  const clear = (k: string) => setErrors((e) => ({ ...e, [k]: '' }));

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give the category a name';
    if (code && !/^[A-Za-z0-9_]{2,40}$/.test(code.trim())) next.code = 'Use 2 to 40 letters, digits or _';
    if (sortOrder && !/^-?\d+$/.test(sortOrder)) next.sort_order = 'Enter a whole number';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFormError('');
    const body = {
      name: name.trim(),
      icon,
      description: description.trim() || null,
      gl_code: glCode.trim() || null,
      sort_order: sortOrder ? Number(sortOrder) : 0,
      needs_inward: needsInward,
    };
    try {
      if (category) await api.updateCategory(category.id, body);
      else await api.createCategory({ ...body, code: code.trim().toUpperCase() || undefined, sub_organization_id: subOrgId });
      invalidateFilterLists();
      showSuccess(category ? 'Category saved' : 'Category added');
      onSaved();
      onClose();
    } catch (err) {
      const placed = placeErrors(err, (k) => FIELDS.includes(k));
      setErrors(placed.fields);
      setFormError(placed.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      title={category ? 'Edit category' : 'New category'}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} onClick={submit}>
            {category ? 'Save' : 'Add category'}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <TextField label="Name" required value={name} onChange={(v) => { setName(v); clear('name'); }} maxLength={100} placeholder="e.g. Tea and snacks" error={errors.name} />
          <TextField
            label="Code"
            value={code}
            onChange={(v) => { setCode(v.toUpperCase().replace(/[^A-Z0-9_]/g, '')); clear('code'); }}
            maxLength={40}
            placeholder="From the name"
            disabled={Boolean(category)}
            error={errors.code}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Icon</p>
          <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {(icons.length ? icons : Object.keys(CATEGORY_ICON_LABEL)).map((key) => {
              const Icon = categoryIcon(key);
              const active = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={CATEGORY_ICON_LABEL[key] || key}
                  title={CATEGORY_ICON_LABEL[key] || key}
                  onClick={() => setIcon(key)}
                  className={cx(
                    'flex h-9 items-center justify-center rounded-lg border transition-colors',
                    active ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
        <Textarea label="Description" rows={2} value={description} onChange={(e) => { setDescription(e.target.value); clear('description'); }} placeholder="Shown to employees when they pick it" error={errors.description} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="GL code" value={glCode} onChange={(v) => { setGlCode(v); clear('gl_code'); }} maxLength={40} placeholder="For accounting" error={errors.gl_code} />
          <TextField label="Order" inputMode="numeric" value={sortOrder} onChange={(v) => { setSortOrder(v.replace(/[^\d-]/g, '')); clear('sort_order'); }} placeholder="0" error={errors.sort_order} />
        </div>
        <div>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-fg sm:text-[13px]">Goods (needs inward)</p>
              <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">The items on the bill are received at the site, with quantities, and each delivery gets an inward number.</p>
            </div>
            <Switch checked={needsInward} onChange={setNeedsInward} label="Goods needs inward" />
          </div>
          <FormError message={errors.needs_inward} className="mt-1.5" />
        </div>
        {!category && (
          <div>
            <SubOrgPicker value={subOrgId} onChange={setSubOrgId} allowShared />
            <FormError message={errors.sub_organization_id} className="mt-1.5" />
          </div>
        )}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

function Categories() {
  const c = useCategories();
  const [editing, setEditing] = React.useState<Category | null | undefined>(undefined);
  const [toggling, setToggling] = React.useState<number | null>(null);
  const [seeding, setSeeding] = React.useState(false);
  const [error, setError] = React.useState('');
  const { refetch } = c;

  const toggle = async (cat: Category) => {
    setToggling(cat.id);
    setError('');
    try {
      await api.setCategoryStatus(cat.id, cat.status === 'active' ? 'inactive' : 'active');
      invalidateFilterLists();
      showSuccess(cat.status === 'active' ? 'Category switched off' : 'Category switched on');
      refetch();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setToggling(null);
    }
  };

  const seed = async () => {
    setSeeding(true);
    setError('');
    try {
      await api.seedCategories();
      invalidateFilterLists();
      showSuccess('Categories added');
      refetch();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 pb-8">
      <PageHeader title="Petty cash categories" description="What cash can be spent on from a wallet. Employees pick one when they add an expense.">
        <button type="button" onClick={() => setEditing(null)} className={primaryBtn}>
          <Plus className="h-3.5 w-3.5" />
          New category
        </button>
      </PageHeader>

      <FormError message={error || c.error} className="px-1" />

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {c.isLoading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : c.categories.length === 0 ? (
          <div className="flex flex-col items-center gap-5 p-6">
            <EmptyState illustration={ILLUSTRATIONS.expenses} title="No categories yet" description="Add the ready-made categories and change them as you go, or add your own." />
            <div className="w-full max-w-xl">
              {c.starters.length > 0 && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {c.starters.map((s) => (
                    <li key={s.code} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2">
                      <CategoryIcon icon={s.icon} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-fg">{s.name}</span>
                        {s.description && <span className="block truncate text-[11px] text-fg-muted">{s.description}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {c.starters.length > 0 && (
                  <Btn variant="primary" busy={seeding} icon={<Sparkles className="h-3.5 w-3.5" />} onClick={seed}>
                    Add the ready-made categories
                  </Btn>
                )}
                <Btn onClick={() => setEditing(null)}>Add my own</Btn>
              </div>
            </div>
          </div>
        ) : (
          <ul className={cx('divide-y divide-line transition-opacity duration-200', c.isFetching ? 'opacity-75' : 'opacity-100')}>
            {c.categories.map((cat) => (
              <li key={cat.id} className={cx('flex items-center gap-3 px-4 py-3 sm:px-5', cat.status === 'inactive' && 'opacity-70')}>
                <CategoryIcon icon={cat.icon} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-fg">{cat.name}</span>
                    {cat.needsInward && <StatusPill label="Goods" tone="neutral" />}
                    {cat.status === 'inactive' && <StatusPill label="Off" tone="neutral" />}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-fg-muted">{[cat.code, cat.glCode ? `GL ${cat.glCode}` : null, cat.description].filter(Boolean).join(' · ')}</p>
                </div>
                <Switch checked={cat.status === 'active'} onChange={() => toggle(cat)} label={`${cat.name} on`} disabled={toggling === cat.id} />
                <button type="button" onClick={() => setEditing(cat)} aria-label={`Edit ${cat.name}`} className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
                  <Pencil className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CategoryDialog open={editing !== undefined} category={editing ?? null} icons={c.icons} onClose={() => setEditing(undefined)} onSaved={refetch} />
    </div>
  );
}
