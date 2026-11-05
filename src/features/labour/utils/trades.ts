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
