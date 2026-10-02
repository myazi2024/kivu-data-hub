// Calcul serveur des frais d'autorisation de bâtir (miroir de
// src/components/cadastral/building-permit-request/permitFeeCompute.ts).
// Le montant envoyé par le navigateur n'est jamais pris tel quel.

// deno-lint-ignore no-explicit-any
type Client = any;

export interface PermitContext {
  permit_type: 'construction' | 'regularization';
  area: number;
  declared_usage?: string | null;
  construction_nature?: string | null;
}

const FALLBACK: Record<string, number> = { construction: 75, regularization: 120 };

const within = (v: number, min?: number | null, max?: number | null) =>
  !(min != null && v < Number(min)) && !(max != null && v > Number(max));
const inList = (v: string | null | undefined, list?: string[] | null) =>
  !list || list.length === 0 ? true : !!v && list.includes(v);

export function parsePermitContext(raw: unknown): PermitContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const t = r.permit_type;
  if (t !== 'construction' && t !== 'regularization') return null;
  const area = Number(r.area);
  if (!Number.isFinite(area) || area < 0 || area > 10_000_000) return null;
  const str = (x: unknown) => (typeof x === 'string' && x.length <= 200 ? x : null);
  return { permit_type: t, area, declared_usage: str(r.declared_usage), construction_nature: str(r.construction_nature) };
}

/** Total dû recalculé à partir de permit_fees_config. */
export async function computePermitTotal(supabase: Client, ctx: PermitContext): Promise<number> {
  const { data, error } = await supabase
    .from('permit_fees_config')
    .select('*')
    .eq('permit_type', ctx.permit_type)
    .eq('is_active', true);
  if (error) throw new Error('Impossible de charger le barème des autorisations.');
  if (!data || data.length === 0) return FALLBACK[ctx.permit_type];
  let total = 0;
  for (const f of data) {
    if (!within(ctx.area, f.min_area_sqm, f.max_area_sqm)) continue;
    if (!inList(ctx.declared_usage, f.applicable_usages)) continue;
    if (!inList(ctx.construction_nature, f.applicable_natures)) continue;
    let amount = (Number(f.amount_usd) || 0) + (Number(f.amount_per_sqm_usd) || 0) * ctx.area;
    if (f.cap_amount_usd != null && amount > Number(f.cap_amount_usd)) amount = Number(f.cap_amount_usd);
    total += Math.round(amount * 100) / 100;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Paiement d'autorisation existant (permit_payments) : appartient à l'appelant,
 * en attente, et chaque frais correspond au barème actif.
 */
export async function verifyPermitPayment(
  supabase: Client,
  paymentId: string,
  userId: string,
): Promise<number> {
  const { data: pp } = await supabase
    .from('permit_payments')
    .select('id, user_id, status, total_amount_usd, fee_items, permit_type')
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single();
  if (!pp) throw new Error("Paiement d'autorisation introuvable.");
  if (pp.status !== 'pending') throw new Error("Ce paiement n'est plus payable.");
  const items = Array.isArray(pp.fee_items) ? pp.fee_items : [];
  const ids = items.map((i: { fee_id?: string }) => i?.fee_id).filter((x: unknown) => typeof x === 'string');
  if (ids.length === 0 || ids.length !== items.length) throw new Error('Frais invalides.');
  const { data: cfg } = await supabase
    .from('permit_fees_config')
    .select('id, amount_usd')
    .in('id', ids)
    .eq('is_active', true);
  const byId = new Map((cfg ?? []).map((c: { id: string; amount_usd: number }) => [c.id, Number(c.amount_usd)]));
  let total = 0;
  for (const id of ids) {
    if (!byId.has(id)) throw new Error('Frais inconnu ou inactif.');
    total += byId.get(id) as number;
  }
  total = Math.round(total * 100) / 100;
  if (Math.round(total * 100) !== Math.round(Number(pp.total_amount_usd) * 100)) {
    throw new Error('Le montant enregistré ne correspond pas au barème.');
  }
  return total;
}
