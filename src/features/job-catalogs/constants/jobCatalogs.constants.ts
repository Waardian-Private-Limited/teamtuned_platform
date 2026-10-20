import type { CatalogKind } from '../types/jobCatalogs.model';

/** Wording per catalog; the page, hook and API are shared. */
export const CATALOG_COPY: Record<CatalogKind, { title: string; noun: string; intro: string; example: string }> = {
  grades: {
    title: 'Grades / bands',
    noun: 'grade',
    intro: 'Levels such as L1, L2, Manager or Band A. Set one on each employee; policies can be assigned per grade.',
    example: 'e.g., L3 or Band B',
  },
  'cost-centres': {
    title: 'Cost centres',
    noun: 'cost centre',
    intro: 'Where an employee’s cost is booked, e.g. a project, client or branch. Set one on each employee.',
    example: 'e.g., Project Alpha',
  },
};
