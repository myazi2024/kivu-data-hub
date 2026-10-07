/**
 * Accès aux rubriques de la fiche cadastrale.
 * Source unique : la liste `access` renvoyée par `get_cadastral_parcel_data`
 * (services achetés et non expirés, ou accès libre en mode test / paiement désactivé).
 * Jamais déduit de la présence de données côté navigateur.
 */
export interface CadastralResultAccess {
  free_access: boolean;
  /** service_id → date de fin d'accès (null = sans limite) */
  services: Record<string, string | null>;
}

export type CadastralSectionKey =
  | 'identification' | 'owner' | 'construction' | 'location' | 'history' | 'obligations' | 'disputes';

/** Ordre fixe des rubriques (numérotation stable écran + PDF). */
export const CADASTRAL_SECTION_ORDER: CadastralSectionKey[] = [
  'identification', 'owner', 'construction', 'location', 'history', 'obligations', 'disputes',
];

/** Service du catalogue qui ouvre chaque rubrique. */
export const SECTION_SERVICE: Record<CadastralSectionKey, string> = {
  identification: 'information',
  owner: 'information',
  construction: 'information',
  location: 'location_history',
  history: 'history',
  obligations: 'obligations',
  disputes: 'land_disputes',
};

export const EMPTY_ACCESS: CadastralResultAccess = { free_access: false, services: {} };

export const normalizeAccess = (raw: unknown): CadastralResultAccess => {
  if (!raw || typeof raw !== 'object') return EMPTY_ACCESS;
  const r = raw as { free_access?: unknown; services?: unknown };
  const services =
    r.services && typeof r.services === 'object' && !Array.isArray(r.services)
      ? (r.services as Record<string, string | null>)
      : {};
  return { free_access: r.free_access === true, services };
};

export const hasService = (access: CadastralResultAccess, serviceId: string, now = Date.now()) => {
  if (access.free_access) return true;
  if (!(serviceId in access.services)) return false;
  const exp = access.services[serviceId];
  return exp == null || new Date(exp).getTime() > now;
};

export const isSectionOpen = (access: CadastralResultAccess, section: CadastralSectionKey, now = Date.now()) => {
  if (section === 'location') {
    // La rubrique Localisation est aussi incluse dans les informations générales.
    return hasService(access, 'location_history', now) || hasService(access, 'information', now);
  }
  return hasService(access, SECTION_SERVICE[section], now);
};

/** Services actifs (pour la facture / la vérification du document). */
export const activeServices = (access: CadastralResultAccess, now = Date.now()) =>
  Object.keys(access.services).filter((id) => hasService({ ...access, free_access: false }, id, now));

export const hasAnyOpenSection = (access: CadastralResultAccess, now = Date.now()) =>
  CADASTRAL_SECTION_ORDER.some((s) => isSectionOpen(access, s, now));

export const sectionNumber = (section: CadastralSectionKey) => CADASTRAL_SECTION_ORDER.indexOf(section) + 1;
