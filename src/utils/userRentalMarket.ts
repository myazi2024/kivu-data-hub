/**
 * Agrégations locatives, annonces et fiscalité déclarée pour l'espace utilisateur.
 *
 * Source de vérité identique à celle du formulaire CCC et de l'espace admin :
 * les parsers de `cccConsistency` sont réutilisés pour éviter toute divergence
 * de logique entre les trois surfaces.
 */
import { isConstructionRented } from '@/utils/rentalStatus';
import {
  parseRentalUnits,
  parseMarketListings,
  type AdminRentalUnit,
  type AdminMarketListing,
} from '@/components/admin/ccc/cccConsistency';

export type RentalUnit = AdminRentalUnit;
export type MarketListing = AdminMarketListing;

/** Un bien loué = une construction (principale ou additionnelle) en usage Location. */
export interface RentalAsset {
  contributionId: string;
  parcelNumber: string;
  status: string;
  /** 'main' | 'additional:<index>' — même convention que l'IRL du formulaire. */
  constructionRef: string;
  label: string;
  configuration: 'single' | 'multi';
  unitsCount: number;
  units: RentalUnit[];
  /** Loyer mensuel déclaré (mode mono-local). */
  declaredMonthlyRentUsd: number | null;
  monthlyRentUsd: number;
  annualRentUsd: number;
  occupiedCount: number;
  totalCapacity: number;
  /** Écart entre le total des locaux et le nombre de locaux annoncé. */
  unitsCountMismatch: boolean;
  /** Aucun loyer renseigné alors que le bien est déclaré en location. */
  missingRent: boolean;
}

export interface ListingAsset extends MarketListing {
  contributionId: string;
  parcelNumber: string;
  status: string;
  index: number;
}

export interface MarketValueAsset {
  contributionId: string;
  parcelNumber: string;
  status: string;
  wouldSell: boolean | null;
  resalePriceUsd: number | null;
  resalePriceAmount: number | null;
  resalePriceCurrency: string | null;
  hasRecentAppraisal: boolean | null;
  appraisalDate: string | null;
  appraiserName: string | null;
  appraisedValueUsd: number | null;
  appraisalReportUrl: string | null;
  /** Expertise de plus de 12 mois. */
  appraisalOutdated: boolean;
}

export interface TaxObligation {
  contributionId: string;
  parcelNumber: string;
  status: string;
  taxType: string;
  taxYear: string;
  taxAmountUsd: number | null;
  paymentStatus: string;
  paymentDate: string | null;
  remainingAmountUsd: number | null;
  receiptUrl: string | null;
  constructionRef: string | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const readAny = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return null;
};

const constructionLabel = (c: any, index: number): string => {
  const parts = [
    readAny(c, 'propertyCategory', 'property_category'),
    readAny(c, 'constructionType', 'construction_type'),
    readAny(c, 'constructionYear', 'construction_year'),
  ].filter(Boolean);
  return `Construction #${index + 2}${parts.length ? ` (${parts.join(', ')})` : ''}`;
};

const buildRentalAsset = (
  row: any,
  source: any,
  constructionRef: string,
  label: string,
): RentalAsset | null => {
  if (!isConstructionRented(source)) return null;

  const configuration =
    (readAny(source, 'rental_configuration', 'rentalConfiguration') as 'single' | 'multi') || 'single';
  const units = parseRentalUnits(readAny(source, 'rental_units', 'rentalUnits'));
  const declaredMonthlyRentUsd = num(readAny(source, 'monthly_rent_usd', 'monthlyRentUsd'));
  const unitsCount = num(readAny(source, 'rental_units_count', 'rentalUnitsCount')) ?? units.length;

  const monthlyRentUsd =
    configuration === 'multi'
      ? units.reduce((sum, u) => sum + (u.monthlyRentUsd ?? 0), 0)
      : declaredMonthlyRentUsd ?? 0;

  const totalCapacity =
    configuration === 'multi'
      ? units.reduce((sum, u) => sum + (u.hostingCapacity ?? 0), 0)
      : num(readAny(source, 'hosting_capacity', 'hostingCapacity')) ?? 0;

  const occupiedCount =
    configuration === 'multi'
      ? units.filter((u) => u.isOccupied === true).length
      : readAny(source, 'is_occupied', 'isOccupied') === true
        ? 1
        : 0;

  return {
    contributionId: row.id,
    parcelNumber: row.parcel_number,
    status: row.status,
    constructionRef,
    label,
    configuration,
    unitsCount: configuration === 'multi' ? unitsCount : 1,
    units,
    declaredMonthlyRentUsd,
    monthlyRentUsd,
    annualRentUsd: monthlyRentUsd * 12,
    occupiedCount,
    totalCapacity,
    unitsCountMismatch: configuration === 'multi' && units.length !== unitsCount,
    missingRent: monthlyRentUsd <= 0,
  };
};

/** Extrait tous les biens en location d'une liste de contributions. */
export function extractRentalAssets(rows: any[]): RentalAsset[] {
  const assets: RentalAsset[] = [];
  for (const row of rows || []) {
    const main = buildRentalAsset(row, row, 'main', 'Construction principale');
    if (main) assets.push(main);

    const additional = Array.isArray(row.additional_constructions) ? row.additional_constructions : [];
    additional.forEach((c: any, idx: number) => {
      const asset = buildRentalAsset(row, c, `additional:${idx}`, constructionLabel(c, idx));
      if (asset) assets.push(asset);
    });
  }
  return assets;
}

/** Extrait toutes les annonces immobilières déclarées. */
export function extractListings(rows: any[]): ListingAsset[] {
  const listings: ListingAsset[] = [];
  for (const row of rows || []) {
    parseMarketListings(row.market_listings).forEach((l, index) => {
      listings.push({
        ...l,
        contributionId: row.id,
        parcelNumber: row.parcel_number,
        status: row.status,
        index,
      });
    });
  }
  return listings;
}

const MONTHS_12 = 365 * 24 * 60 * 60 * 1000;

/** Extrait les données de valeur marchande renseignées. */
export function extractMarketValues(rows: any[]): MarketValueAsset[] {
  return (rows || [])
    .filter(
      (r) =>
        r.would_sell_if_offered !== null ||
        r.has_recent_appraisal === true ||
        r.resale_price_usd !== null,
    )
    .map((r) => {
      const appraisalDate = r.appraisal_date ?? null;
      return {
        contributionId: r.id,
        parcelNumber: r.parcel_number,
        status: r.status,
        wouldSell: r.would_sell_if_offered ?? null,
        resalePriceUsd: num(r.resale_price_usd),
        resalePriceAmount: num(r.resale_price_amount),
        resalePriceCurrency: r.resale_price_currency ?? null,
        hasRecentAppraisal: r.has_recent_appraisal ?? null,
        appraisalDate,
        appraiserName: r.appraiser_name ?? null,
        appraisedValueUsd: num(r.appraised_value_usd),
        appraisalReportUrl: r.appraisal_report_url ?? null,
        appraisalOutdated:
          !!appraisalDate && Date.now() - new Date(appraisalDate).getTime() > MONTHS_12,
      };
    });
}

/** Extrait la fiscalité déclarée (historique fiscal des contributions). */
export function extractTaxObligations(rows: any[]): TaxObligation[] {
  const out: TaxObligation[] = [];
  for (const row of rows || []) {
    const history = Array.isArray(row.tax_history) ? row.tax_history : [];
    history.forEach((t: any) => {
      out.push({
        contributionId: row.id,
        parcelNumber: row.parcel_number,
        status: row.status,
        taxType: readAny(t, 'tax_type', 'taxType') || 'Impôt',
        taxYear: String(readAny(t, 'tax_year', 'taxYear') ?? ''),
        taxAmountUsd: num(readAny(t, 'tax_amount', 'taxAmount')),
        paymentStatus: readAny(t, 'payment_status', 'paymentStatus') || 'unknown',
        paymentDate: readAny(t, 'payment_date', 'paymentDate'),
        remainingAmountUsd: num(readAny(t, 'remaining_amount', 'remainingAmount')),
        receiptUrl: readAny(t, 'receipt_url', 'receiptUrl', 'existingReceiptUrl'),
        constructionRef: readAny(t, 'construction_ref', 'constructionRef'),
      });
    });
  }
  return out;
}

export const formatUsd = (v: number | null | undefined) =>
  v === null || v === undefined
    ? 'Non renseigné'
    : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USD`;

export const formatDateFr = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('fr-FR') : 'Non renseignée';
