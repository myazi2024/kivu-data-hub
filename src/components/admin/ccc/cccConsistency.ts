/**
 * Normalisation + contrôles de cohérence des données locatives et de valeur
 * marchande d'une contribution CCC (côté admin).
 *
 * Les données proviennent du formulaire CCC : les locaux (`rental_units`) sont
 * stockés en snake_case, les annonces (`market_listings`) en camelCase.
 */
import { readField as rr } from './cccHelpers';

export interface AdminRentalUnit {
  label: string | null;
  monthlyRentUsd: number | null;
  isOccupied: boolean | null;
  occupantCount: number | null;
  hostingCapacity: number | null;
  rentalStartDate: string | null;
  floor: string | null;
}

export interface AdminMarketListing {
  constructionRef: string | null;
  unitLabel: string | null;
  listForRent: boolean;
  rentAmount: number | null;
  rentCurrency: string | null;
  targetRentUsd: number | null;
  availableFrom: string | null;
  leaseType: string | null;
  depositMonths: number | null;
  minLeaseMonths: number | null;
  chargesIncluded: string[];
  description: string | null;
  contactChannel: string | null;
  contactValue: string | null;
  visitSlots: string | null;
  coverImageUrls: string[];
  coverImageMainUrl: string | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

export const parseRentalUnits = (raw: unknown): AdminRentalUnit[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u) => u && typeof u === 'object')
    .map((u: any) => ({
      label: rr(u, 'label', 'name'),
      monthlyRentUsd: num(rr(u, 'monthly_rent_usd', 'monthlyRentUsd')),
      isOccupied: (rr(u, 'is_occupied', 'isOccupied') as boolean | null) ?? null,
      occupantCount: num(rr(u, 'occupant_count', 'occupantCount')),
      hostingCapacity: num(rr(u, 'hosting_capacity', 'hostingCapacity')),
      rentalStartDate: rr(u, 'rental_start_date', 'rentalStartDate'),
      floor: rr(u, 'floor'),
    }));
};

export const parseMarketListings = (raw: unknown): AdminMarketListing[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => l && typeof l === 'object')
    .map((l: any) => {
      const charges = rr(l, 'chargesIncluded', 'charges_included') || {};
      return {
        constructionRef: rr(l, 'constructionRef', 'construction_ref'),
        unitLabel: rr(l, 'unitLabel', 'unit_label'),
        listForRent: Boolean(rr(l, 'listForRent', 'list_for_rent')),
        rentAmount: num(rr(l, 'rentAmount', 'rent_amount')),
        rentCurrency: rr(l, 'rentCurrency', 'rent_currency'),
        targetRentUsd: num(rr(l, 'targetRentUsd', 'target_rent_usd')),
        availableFrom: rr(l, 'availableFrom', 'available_from'),
        leaseType: rr(l, 'leaseType', 'lease_type'),
        depositMonths: num(rr(l, 'depositMonths', 'deposit_months')),
        minLeaseMonths: num(rr(l, 'minLeaseMonths', 'min_lease_months')),
        chargesIncluded: Object.entries(charges as Record<string, boolean>)
          .filter(([, v]) => v === true)
          .map(([k]) => k),
        description: rr(l, 'description'),
        contactChannel: rr(l, 'contactChannel', 'contact_channel'),
        contactValue: rr(l, 'contactValue', 'contact_value'),
        visitSlots: rr(l, 'visitSlots', 'visit_slots'),
        coverImageUrls: Array.isArray(rr(l, 'coverImageUrls', 'cover_image_urls'))
          ? (rr(l, 'coverImageUrls', 'cover_image_urls') as string[])
          : [],
        coverImageMainUrl: rr(l, 'coverImageMainUrl', 'cover_image_main_url'),
      };
    });
};

export const sumUnitsRent = (units: AdminRentalUnit[]): number =>
  units.reduce((s, u) => s + (u.monthlyRentUsd ?? 0), 0);

export const sumUnitsCapacity = (units: AdminRentalUnit[]): number =>
  units.reduce((s, u) => s + (u.hostingCapacity ?? 0), 0);

/**
 * Incohérences détectables sans requête supplémentaire. Sert à alerter l'admin
 * avant approbation (aucune ne bloque : ce sont des signalements).
 */
export const detectCCCInconsistencies = (c: any): string[] => {
  if (!c) return [];
  const issues: string[] = [];
  const units = parseRentalUnits(c.rental_units);
  const listings = parseMarketListings(c.market_listings);

  if (c.declared_usage === 'location' && !c.rental_configuration) {
    issues.push("Usage déclaré « location » sans mode de mise en location renseigné.");
  }
  if (c.rental_configuration === 'multi') {
    if (units.length === 0) {
      issues.push('Mode « plusieurs locaux » sélectionné mais aucun local détaillé.');
    } else {
      if (c.rental_units_count && Number(c.rental_units_count) !== units.length) {
        issues.push(`Nombre de locaux déclaré (${c.rental_units_count}) ≠ locaux détaillés (${units.length}).`);
      }
      if (units.some((u) => !u.monthlyRentUsd || u.monthlyRentUsd <= 0)) {
        issues.push('Au moins un local est déclaré sans loyer mensuel valide.');
      }
      const total = sumUnitsRent(units);
      const declared = Number(c.monthly_rent_usd ?? 0);
      if (declared > 0 && Math.abs(declared - total) > 0.5) {
        issues.push(`Loyer global déclaré (${declared} USD) ≠ somme des locaux (${total} USD).`);
      }
    }
  }
  if (c.rental_configuration === 'single' && units.length > 0) {
    issues.push('Mode « un seul local » mais des locaux détaillés subsistent (donnée résiduelle).');
  }
  if (c.has_recent_appraisal && !c.appraisal_date) {
    issues.push('Expertise récente déclarée sans date d’expertise.');
  }
  if (c.appraisal_date && new Date(c.appraisal_date).getTime() > Date.now()) {
    issues.push('La date d’expertise est postérieure à aujourd’hui.');
  }
  if (c.would_sell_if_offered === true && !c.resale_price_usd) {
    issues.push('Disposition à vendre déclarée sans prix de revente estimé.');
  }
  listings.forEach((l, i) => {
    if (l.listForRent && l.coverImageUrls.length === 0) {
      issues.push(`Annonce #${i + 1} sans photo de couverture.`);
    }
    if (l.listForRent && !l.contactValue) {
      issues.push(`Annonce #${i + 1} sans coordonnée de contact.`);
    }
  });

  return issues;
};
