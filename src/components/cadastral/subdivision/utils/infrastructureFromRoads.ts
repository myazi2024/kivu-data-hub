/**
 * Dérive la liste des items d'infrastructures (clé/quantité) à partir
 * des voies tracées + tarifs admin + métrique. Source unique pour le
 * récapitulatif client et le calcul serveur.
 *
 * Conventions de clefs (`subdivision_infrastructure_tariffs.infrastructure_key`):
 *  - `road_surface_<material>`  unit: sqm        qty = lengthM × widthM
 *  - `drainage`                 unit: linear_m   qty = lengthM × sidesFactor
 *  - `street_lighting`          unit: unit       qty = ceil(lengthM / spacingM) × sidesFactor
 *
 * `sidesFactor` = 2 si side ∈ {both, alternating}, sinon 1.
 */
import type { SubdivisionRoad } from '../types';
import type { MetricFrame } from './metrics';
import { pathLengthM } from './metrics';

export interface TariffLike {
  infrastructure_key: string;
  label: string;
  unit: string;
  rate_usd: number;
  section_type?: string | null;
  is_active?: boolean;
}

export interface DerivedInfraItem {
  infrastructure_key: string;
  label: string;
  unit: string;
  quantity: number;
  rate_usd: number;
  subtotal_usd: number;
  /** Voie source — pour traçabilité dans le récapitulatif. */
  roadId: string;
  roadName: string;
}

const sidesFactor = (side?: string): number => {
  if (!side) return 1;
  return side === 'both' || side === 'alternating' ? 2 : 1;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Retourne `tariff` pour `key` en préférant `sectionType` exact, sinon
 * `section_type === null` (générique), sinon premier actif disponible.
 */
const findTariff = (
  tariffs: TariffLike[],
  key: string,
  sectionType?: 'urban' | 'rural',
): TariffLike | null => {
  const candidates = tariffs.filter(t => t.infrastructure_key === key && t.is_active !== false);
  if (candidates.length === 0) return null;
  return (
    candidates.find(t => t.section_type === sectionType) ??
    candidates.find(t => t.section_type == null) ??
    candidates[0]
  );
};

export interface BuildOptions {
  sectionType?: 'urban' | 'rural';
}

export function buildInfraItemsFromRoads(
  roads: SubdivisionRoad[],
  tariffs: TariffLike[],
  frame: MetricFrame,
  opts: BuildOptions = {},
): DerivedInfraItem[] {
  const out: DerivedInfraItem[] = [];
  for (const road of roads ?? []) {
    const lengthM = pathLengthM(road.path, frame);
    if (lengthM <= 0) continue;
    const roadName = road.name || 'Voie';

    // --- Revêtement ---
    if (road.roadSurface?.material) {
      const key = `road_surface_${road.roadSurface.material}`;
      const tariff = findTariff(tariffs, key, opts.sectionType);
      if (tariff) {
        const qty = round2(lengthM * (road.widthM || 0));
        if (qty > 0) {
          out.push({
            infrastructure_key: key,
            label: tariff.label,
            unit: tariff.unit,
            quantity: qty,
            rate_usd: tariff.rate_usd,
            subtotal_usd: round2(qty * tariff.rate_usd),
            roadId: road.id,
            roadName,
          });
        }
      }
    }

    // --- Canal d'évacuation ---
    if (road.drainageCanal) {
      const tariff = findTariff(tariffs, 'drainage', opts.sectionType);
      if (tariff) {
        const qty = round2(lengthM * sidesFactor(road.drainageCanal.side));
        if (qty > 0) {
          out.push({
            infrastructure_key: 'drainage',
            label: tariff.label,
            unit: tariff.unit,
            quantity: qty,
            rate_usd: tariff.rate_usd,
            subtotal_usd: round2(qty * tariff.rate_usd),
            roadId: road.id,
            roadName,
          });
        }
      }
    }

    // --- Éclairage solaire ---
    if (road.solarLighting && road.solarLighting.spacingM > 0) {
      const tariff = findTariff(tariffs, 'street_lighting', opts.sectionType);
      if (tariff) {
        const poles = Math.ceil(lengthM / road.solarLighting.spacingM) * sidesFactor(road.solarLighting.side);
        if (poles > 0) {
          out.push({
            infrastructure_key: 'street_lighting',
            label: tariff.label,
            unit: tariff.unit,
            quantity: poles,
            rate_usd: tariff.rate_usd,
            subtotal_usd: round2(poles * tariff.rate_usd),
            roadId: road.id,
            roadName,
          });
        }
      }
    }
  }
  return out;
}

export function sumInfraTotal(items: DerivedInfraItem[]): number {
  return round2(items.reduce((s, i) => s + i.subtotal_usd, 0));
}
