import type { DebitSlab, DebitSlabBand, DebitSlabBasis } from '../types/payroll-setup.model';

// Mirrors the backend DeductionSlabs: bands only store where they start, each runs
// until the next one, and the last band is the "else".

export const SLAB_BASES: { value: DebitSlabBasis; label: string }[] = [
  { value: 'gross', label: 'Monthly gross' },
  { value: 'basic', label: 'Monthly basic' },
  { value: 'component', label: 'A salary component' },
];

const toNumber = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function emptySlab(): DebitSlab {
  return {
    basis: 'gross',
    componentId: null,
    bands: [
      { from: 0, type: 'fixed', value: 0 },
      { from: 25000, type: 'fixed', value: 0 },
    ],
  };
}

/** Reads `config.slab` as the server stores it (`component_id`, unsorted bands allowed). */
export function slabOf(config: Record<string, unknown> | null | undefined): DebitSlab | null {
  const raw = config?.slab;
  if (!raw || typeof raw !== 'object') return null;
  const slab = raw as Record<string, unknown>;
  const basis = SLAB_BASES.some((b) => b.value === slab.basis) ? (slab.basis as DebitSlabBasis) : 'gross';
  const bands = (Array.isArray(slab.bands) ? slab.bands : [])
    .map((b: Record<string, unknown>) => ({
      from: toNumber(b?.from) ?? 0,
      type: b?.type === 'percentage' ? 'percentage' : 'fixed',
      value: toNumber(b?.value) ?? 0,
    }) as DebitSlabBand)
    .sort((a, b) => a.from - b.from);
  return { basis, componentId: toNumber(slab.component_id ?? slab.componentId), bands };
}

export function slabToConfig(slab: DebitSlab) {
  return {
    basis: slab.basis,
    component_id: slab.basis === 'component' ? slab.componentId : null,
    bands: [...slab.bands].sort((a, b) => a.from - b.from).map((b) => ({ from: b.from, type: b.type, value: b.value })),
  };
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function bandAmount(band: DebitSlabBand): string {
  return band.type === 'percentage' ? `${band.value}%` : inr(band.value);
}

/** e.g. "Below ₹25,000: ₹300 · ₹25,000 and above: 2%". */
export function describeSlab(slab: DebitSlab): string {
  const bands = [...slab.bands].sort((a, b) => a.from - b.from);
  if (!bands.length) return 'No slabs';
  if (bands.length === 1) return `${bandAmount(bands[0])} at any amount`;
  return bands
    .map((band, i) => {
      const next = bands[i + 1];
      if (i === 0) return `Below ${inr(next.from)}: ${bandAmount(band)}`;
      if (!next) return `${inr(band.from)} and above: ${bandAmount(band)}`;
      return `${inr(band.from)} – ${inr(next.from - 1)}: ${bandAmount(band)}`;
    })
    .join(' · ');
}

export function slabBasisLabel(slab: DebitSlab, componentName?: string | null): string {
  if (slab.basis === 'component') return componentName || 'a component';
  return slab.basis === 'basic' ? 'basic' : 'gross';
}

export interface SlabProblem {
  /** The band to mark, or null when the problem is the basis or the list itself. */
  band: number | null;
  message: string;
}

/** The first problem with a slab, or null. Same rules the server applies. */
export function validateSlab(slab: DebitSlab): SlabProblem | null {
  if (slab.basis === 'component' && !slab.componentId) {
    return { band: null, message: 'Choose the salary component the slabs are based on' };
  }
  if (!slab.bands.length) return { band: null, message: 'Add at least one slab' };
  for (let i = 0; i < slab.bands.length; i += 1) {
    const band = slab.bands[i];
    if (!Number.isFinite(band.from) || band.from < 0) return { band: i, message: `Slab ${i + 1}: "from" must be 0 or more` };
    if (!Number.isFinite(band.value) || band.value < 0) return { band: i, message: `Slab ${i + 1}: amount must be 0 or more` };
    if (band.type === 'percentage' && band.value > 100) {
      return { band: i, message: `Slab ${i + 1}: percentage cannot be more than 100` };
    }
  }
  const starts = slab.bands.map((b) => b.from);
  if (Math.min(...starts) !== 0) return { band: 0, message: 'The first slab must start at 0' };
  const duplicate = starts.findIndex((from, i) => starts.indexOf(from) !== i);
  if (duplicate !== -1) return { band: duplicate, message: 'Two slabs start at the same amount' };
  return null;
}
