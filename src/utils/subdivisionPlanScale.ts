/**
 * Échelle auto normalisée pour le plan de lotissement.
 *
 * Calcule l'échelle 1:N snappée sur les paliers configurés à partir
 * de la bbox réelle (m) et de la zone dessinable (mm).
 */

const DEFAULT_TIERS = [200, 500, 1000, 2000, 5000, 10000];

export function computeNormalizedScale(
  bboxMaxDimMeters: number,
  drawableMaxDimMm: number,
  tiers: number[] = DEFAULT_TIERS,
): { scale: number; tier: number } {
  const safeDraw = Math.max(1, drawableMaxDimMm);
  const safeBbox = Math.max(0.01, bboxMaxDimMeters);
  // 1 mm sur le plan = (bbox / draw) m sur le terrain
  const raw = (safeBbox * 1000) / safeDraw; // 1:raw
  const sortedTiers = [...tiers].sort((a, b) => a - b);
  const snapped = sortedTiers.find(t => t >= raw) ?? sortedTiers[sortedTiers.length - 1];
  return { scale: raw, tier: snapped };
}

/**
 * Format compact pour l'affichage : "1:500".
 */
export function formatScale(tier: number): string {
  return `1:${tier.toLocaleString('fr-FR')}`;
}
