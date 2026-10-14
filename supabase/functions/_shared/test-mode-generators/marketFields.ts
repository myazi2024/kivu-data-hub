/**
 * Champs communs aux parcelles et contributions de test, alignés sur les
 * onglets du menu Données foncières (carte des circonscriptions, Construction,
 * Location et valeur, Bornage). Valeurs fictives mais cohérentes avec le CCC.
 */
import { pick, randomDateInPast, seededInt } from './_shared.ts';
import { landDistrictsFor, ruralTerritoriesFor } from './geoReference.ts';

const normGeo = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

interface ProvinceRef { province: string; ville: string; commune: string }

/** Localisation SR propre à la province + circonscription foncière officielle de la province. */
export function buildTestLocation(idx: number, prov: ProvinceRef, isSR: boolean) {
  const territories = ruralTerritoriesFor(prov.province);
  const names = Object.keys(territories);
  const territoire = isSR && names.length ? pick(names, idx) : null;
  const collectivites = territoire ? territories[territoire] : [];
  const collectivite = territoire && collectivites.length ? pick(collectivites, idx) : null;

  const districts = landDistrictsFor(prov.province);
  const candidates = isSR ? [territoire] : [prov.commune, prov.ville];
  const exact = districts.find((d) => candidates.some((c) => c && normGeo(c) === normGeo(d)));
  const land_district = exact ?? (districts.length ? pick(districts, idx) : null);

  return {
    territoire,
    collectivite,
    groupement: collectivite ? `Groupement ${collectivite}` : null,
    village: territoire ? `Village ${territoire} ${(idx % 4) + 1}` : null,
    land_district,
  };
}

const ACTUAL_USAGES = ['Habitation', 'Commerce', 'Bureau', 'Usage mixte'];
const ORIENTATIONS = ['Nord', 'Sud', 'Est', 'Ouest'];
const STANDING_RENT: Record<string, [number, number]> = {
  'Haut standing': [800, 2500],
  'Moyen standing': [250, 900],
  'Économique': [60, 300],
};

/** Construction, location, vente et expertise de valeur (même règles que le formulaire CCC). */
export function buildTestMarketFields(
  idx: number,
  opts: { constructionNature: string | null; propertyCategory: string; standing: string | null; areaSqm: number },
) {
  const built = !!opts.constructionNature && opts.propertyCategory !== 'Terrain nu';
  const isApartment = opts.propertyCategory === 'Appartement';
  const isBuilding = opts.propertyCategory === 'Immeuble';
  const [rMin, rMax] = STANDING_RENT[opts.standing || ''] ?? [100, 600];

  // Location : ~40 % des biens bâtis. Immeuble = plusieurs locaux (dont vacant / occupé par le propriétaire).
  const isRented = built && idx % 5 < 2;
  let rental: Record<string, unknown> = { is_rented: built ? isRented : null };
  if (isRented) {
    if (isBuilding) {
      const count = seededInt(idx * 17 + 3, 2, 6);
      const units = Array.from({ length: count }, (_, u) => {
        const ownerOccupied = u === 0 && idx % 3 === 0;
        const vacant = !ownerOccupied && u === count - 1 && idx % 4 === 0;
        return {
          label: `Local ${u + 1}`,
          is_occupied: !vacant,
          occupied_by: ownerOccupied ? 'owner' : vacant ? null : 'tenant',
          monthly_rent_usd: ownerOccupied || vacant ? null : seededInt(idx * 31 + u, rMin, rMax),
          occupant_count: vacant ? 0 : seededInt(idx * 37 + u, 1, 6),
        };
      });
      rental = { ...rental, rental_configuration: 'multi', rental_units_count: count, rental_units: units, monthly_rent_usd: null };
    } else {
      rental = { ...rental, rental_configuration: 'single', rental_units_count: 1, rental_units: null, monthly_rent_usd: seededInt(idx * 29 + 1, rMin, rMax) };
    }
    rental.rental_start_date = randomDateInPast(6);
  }

  // Vente : ~55 % des propriétaires vendraient ; prix déclaré (USD, parfois saisi en CDF).
  const wouldSell = idx % 9 < 5;
  const landValue = opts.areaSqm * seededInt(idx * 41 + 7, 15, 140);
  const buildingValue = built ? seededInt(idx * 43 + 5, 15000, 250000) : 0;
  const resaleUsd = wouldSell ? Math.round((landValue + buildingValue) / 100) * 100 : null;
  const inCdf = wouldSell && idx % 6 === 0;
  // Expertise de valeur récente : ~30 %.
  const hasAppraisal = idx % 10 < 3;
  const appraisedUsd = hasAppraisal
    ? Math.round(((landValue + buildingValue) * seededInt(idx * 47 + 1, 80, 120)) / 100 / 100) * 100
    : null;

  return {
    construction_status: built ? (idx % 7 === 0 ? 'in_progress' : 'completed') : null,
    building_height: built ? (isBuilding ? seededInt(idx * 19 + 2, 9, 40) : seededInt(idx * 19 + 2, 3, 9)) : null,
    actual_usage: built ? pick(ACTUAL_USAGES, idx) : null,
    apartment_length: isApartment ? seededInt(idx * 23 + 1, 6, 18) : null,
    apartment_width: isApartment ? seededInt(idx * 23 + 2, 5, 14) : null,
    apartment_height: isApartment ? 3 : null,
    apartment_orientation: isApartment ? pick(ORIENTATIONS, idx) : null,
    ...rental,
    would_sell_if_offered: wouldSell,
    resale_price_usd: resaleUsd,
    resale_price_amount: resaleUsd == null ? null : inCdf ? resaleUsd * 2800 : resaleUsd,
    resale_price_currency: resaleUsd == null ? null : inCdf ? 'CDF' : 'USD',
    has_recent_appraisal: hasAppraisal,
    appraisal_date: hasAppraisal ? randomDateInPast(2) : null,
    appraised_value_usd: appraisedUsd,
    appraised_value_amount: appraisedUsd,
    appraised_value_currency: appraisedUsd == null ? null : 'USD',
  };
}

const BOUNDARY_PURPOSES = ['Bornage initial', 'Rebornage', 'Litige de limites', 'Morcellement'];

/** Historique de bornage (~35 % des contributions), format du formulaire CCC. */
export function buildTestBoundaryHistory(idx: number, parcelNumber: string) {
  if (idx % 20 >= 7) return [];
  return [{
    pv_reference_number: `PV-${parcelNumber}-${(idx % 9) + 1}`,
    boundary_purpose: pick(BOUNDARY_PURPOSES, idx),
    surveyor_name: `Géomètre Test ${(idx % 12) + 1}`,
    survey_date: randomDateInPast(8),
  }];
}
