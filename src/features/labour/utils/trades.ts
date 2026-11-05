import type { Category, ContractorTrade } from '../types/labour.types';

/** The contractor supplies this category / subcategory (no trades listed = every trade). */
export function supplies(trades: ContractorTrade[] | undefined, categoryId: number | null, subcategoryId: number | null): boolean {
  if (!trades?.length) return true;
  return trades.some((t) => t.categoryId === categoryId && (t.subcategoryId === null || t.subcategoryId === subcategoryId));
}

/** The categories a contractor supplies, each keeping only the subcategories it supplies (all of them for a whole category). */
export function suppliedCategories(categories: Category[], trades: ContractorTrade[] | undefined): Category[] {
  if (!trades?.length) return categories;
  return categories
    .filter((c) => trades.some((t) => t.categoryId === c.id))
    .map((c) => (trades.some((t) => t.categoryId === c.id && t.subcategoryId === null) ? c : { ...c, subcategories: c.subcategories.filter((s) => supplies(trades, c.id, s.id)) }));
}

/** A contractor as the filters see it: the sites it works at and the trades it supplies (empty = every one). */
export interface FilterContractor { value: number; label: string; siteIds?: number[]; trades?: ContractorTrade[] }
export interface Opt { value: number; label: string }

/** The contractors of a site (linked to it, or to no site = every site); all of them when no site is picked. */
export function contractorsAtSite<C extends FilterContractor>(contractors: C[], siteId: number | null): C[] {
  if (siteId === null) return contractors;
  return contractors.filter((c) => !c.siteIds?.length || c.siteIds.includes(siteId));
}

/** Category options narrowed to the picked contractor's trades. */
export function categoryOptionsFor(options: Opt[], contractor: FilterContractor | undefined): Opt[] {
  const trades = contractor?.trades;
  if (!trades?.length) return options;
  return options.filter((o) => trades.some((t) => t.categoryId === o.value));
}

/** Subcategory options narrowed to the picked contractor's trades. */
export function subcategoryOptionsFor(options: Opt[], contractor: FilterContractor | undefined, categoryId: number | null): Opt[] {
  return options.filter((o) => supplies(contractor?.trades, categoryId, o.value));
}

/**
 * Applies a filter change and drops the picks it no longer fits, top down: site -> contractor -> category -> subcategory.
 * A contractor not at the new site is cleared; a category / subcategory the (new) contractor does not supply is cleared.
 */
export function cascade<F extends { siteId: number | null; contractorId: number | null; categoryId?: number | null; subcategoryId?: number | null }>(
  current: F, patch: Partial<F>, contractors: FilterContractor[],
): Partial<F> {
  const next = { ...current, ...patch };
  const out: Partial<F> = { ...patch };
  if (next.contractorId !== null && !contractorsAtSite(contractors, next.siteId).some((c) => c.value === next.contractorId)) {
    out.contractorId = null as F['contractorId'];
    next.contractorId = null;
  }
  const trades = contractors.find((c) => c.value === next.contractorId)?.trades;
  if (next.categoryId != null && trades?.length && !trades.some((t) => t.categoryId === next.categoryId)) {
    out.categoryId = null as F['categoryId'];
    next.categoryId = null;
  }
  if (next.subcategoryId != null && !supplies(trades, next.categoryId ?? null, next.subcategoryId)) {
    out.subcategoryId = null as F['subcategoryId'];
  }
  return out;
}
