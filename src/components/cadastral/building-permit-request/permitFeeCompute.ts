/**
 * Compute the applicable permit fees from the configured bracket rows.
 * Supports filtering by usage / nature, area brackets, per-m² pricing and caps.
 *
 * Backwards-compatible: rows without the new columns behave like flat fees.
 */
import type { FeeItem } from './types';

export interface PermitFeeContext {
  area: number; // m²
  declaredUsage?: string;
  constructionNature?: string;
}

export interface ComputedFee {
  id: string;
  label: string;
  amount: number;
  detail?: string;
}

const isWithin = (
  value: number,
  min?: number | null,
  max?: number | null,
): boolean => {
  if (min != null && value < Number(min)) return false;
  if (max != null && value > Number(max)) return false;
  return true;
};

const matchesList = (value: string | undefined, list?: string[] | null): boolean => {
  if (!list || list.length === 0) return true;
  if (!value) return false;
  return list.includes(value);
};

export function selectApplicableFees(
  fees: FeeItem[],
  ctx: PermitFeeContext,
): FeeItem[] {
  const area = Number.isFinite(ctx.area) ? ctx.area : 0;
  return fees.filter((f) => {
    if (!isWithin(area, f.min_area_sqm ?? null, f.max_area_sqm ?? null)) return false;
    if (!matchesList(ctx.declaredUsage, f.applicable_usages ?? null)) return false;
    if (!matchesList(ctx.constructionNature, f.applicable_natures ?? null)) return false;
    return true;
  });
}

export function computeFeeBreakdown(
  fees: FeeItem[],
  ctx: PermitFeeContext,
): { breakdown: ComputedFee[]; total: number } {
  const area = Number.isFinite(ctx.area) ? ctx.area : 0;
  const applicable = selectApplicableFees(fees, ctx);

  const breakdown: ComputedFee[] = applicable.map((f) => {
    const base = Number(f.amount_usd) || 0;
    const perSqm = Number(f.amount_per_sqm_usd) || 0;
    let amount = base + perSqm * area;
    if (f.cap_amount_usd != null && amount > Number(f.cap_amount_usd)) {
      amount = Number(f.cap_amount_usd);
    }
    const details: string[] = [];
    if (f.description) details.push(f.description);
    if (perSqm > 0) details.push(`+ $${perSqm.toFixed(2)}/m² × ${area.toLocaleString('fr-FR')} m²`);
    if (f.cap_amount_usd != null) details.push(`plafonné à $${Number(f.cap_amount_usd).toFixed(0)}`);
    return {
      id: f.id,
      label: f.fee_name,
      amount: Math.round(amount * 100) / 100,
      detail: details.length > 0 ? details.join(' • ') : undefined,
    };
  });

  const total = breakdown.reduce((sum, f) => sum + f.amount, 0);
  return { breakdown, total: Math.round(total * 100) / 100 };
}
