import type { DebitRule } from '../types/payroll-setup.model';
import { MONTH_NAMES, ptSlabs, ptSpecialMonth } from './professionalTax';
import { describeSlab, slabBasisLabel, slabOf } from './deductionSlabs';
import { formatCurrency } from './validators';

/** The amount settings a one-line summary needs. A rule and a dated version both fit. */
export type DebitAmountSettings = Pick<
  DebitRule,
  'isStatutory' | 'category' | 'config' | 'debitType' | 'fixedAmount' | 'percentageValue' | 'referenceAmount' | 'breakdownItemName'
>;

/** One line describing what a rule deducts, e.g. "2% of gross earnings" or a slab preview. */
export function ruleValueText(rule: DebitAmountSettings, componentName?: (id: number | null) => string | undefined): string {
  if (rule.isStatutory) {
    const config = rule.config || {};
    switch (rule.category) {
      case 'epf': {
        const rate = Number(config.rate ?? 12);
        const ceiling = Number(config.wageCeiling ?? 15000);
        return `${rate}% of ${String(config.componentName || 'Basic')}${config.applyCeiling !== false ? ` (cap ${formatCurrency(ceiling)}/mo wage)` : ''}`;
      }
      case 'esi': {
        const rate = Number(config.rate ?? 0.75);
        const ceiling = Number(config.eligibilityCeiling ?? 21000);
        return `${rate}% of gross (applies when gross ≤ ${formatCurrency(ceiling)})`;
      }
      case 'professional_tax': {
        const slabs = ptSlabs(config);
        const everyone = slabs.filter((s) => s.gender === 'all');
        const top = (everyone.length ? everyone : slabs)[(everyone.length ? everyone : slabs).length - 1];
        const month = ptSpecialMonth(config);
        const state = String(config.state || 'All states');
        if (!top) return `No slabs · ${state}`;
        const special = month && top.specialAmount !== null ? `, ${formatCurrency(top.specialAmount)} in ${MONTH_NAMES[month - 1]}` : '';
        const genders = [...new Set(slabs.filter((s) => s.gender !== 'all').map((s) => s.gender))];
        const extra = genders.length ? ` · separate slabs for ${genders.join(', ')}` : '';
        return `${slabs.length} slab${slabs.length === 1 ? '' : 's'} · up to ${formatCurrency(top.amount)}/month${special}${extra} · ${state}`;
      }
      case 'lwf': {
        const amount = Number(config.amount ?? 0);
        return `${formatCurrency(amount)} · ${String(config.frequency || 'monthly')} · ${String(config.state || 'All states')}`;
      }
      case 'tds':
        return 'Auto-computed from employee tax profile';
      default:
        return 'Statutory';
    }
  }
  const prorated = rule.config?.prorateByAttendance === true ? ' · for payable days' : '';
  if (rule.debitType === 'slab') {
    const slab = slabOf(rule.config);
    if (!slab) return 'Slabs not set';
    return `On ${slabBasisLabel(slab, componentName?.(slab.componentId))}: ${describeSlab(slab)}${prorated}`;
  }
  if (rule.debitType === 'percentage') {
    // 'after_deduction' is the legacy name for net pay.
    const refLabel =
      rule.referenceAmount === 'breakdown_item'
        ? rule.breakdownItemName || 'component'
        : rule.referenceAmount === 'before_deduction'
          ? 'gross earnings'
          : 'net pay';
    return `${rule.percentageValue}% of ${refLabel}`;
  }
  return `${formatCurrency(rule.fixedAmount)}${prorated}`;
}
