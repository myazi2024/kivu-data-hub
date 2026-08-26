import { normalizeConstructionNature } from '@/utils/constructionNatureNormalizer';

/**
 * Prédicats partagés du formulaire CCC.
 *
 * Ces règles étaient dupliquées (avec des définitions divergentes) dans
 * `ConstructionSection`, `LocationTab`, `ReviewTab`, `useFormValidation` et
 * `useCCCFormState`. Une seule source de vérité évite que l'affichage et la
 * validation se contredisent.
 */

export interface UnbuiltLandInput {
  propertyCategory?: string | null;
  constructionType?: string | null;
  constructionNature?: string | null;
}

/**
 * Terrain non bâti : terrain nu explicite (catégorie ou type) ou nature
 * « Non bâti » (ex. parcelle agricole non construite).
 * Ni matériaux, ni standing, ni année de construction ne s'appliquent.
 */
export const isUnbuiltLand = (data?: UnbuiltLandInput | null): boolean => {
  if (!data) return false;
  if (data.propertyCategory === 'Terrain nu' || data.constructionType === 'Terrain nu') return true;
  const nature = data.constructionNature ? normalizeConstructionNature(data.constructionNature) : '';
  return nature === 'Non bâti';
};

/** Terrain nu déclaré explicitement (catégorie ou type), hors nature « Non bâti ». */
export const isTerrainNuCategory = (data?: UnbuiltLandInput | null): boolean =>
  !!data && (data.propertyCategory === 'Terrain nu' || data.constructionType === 'Terrain nu');

/**
 * Une parcelle porte-t-elle une référence SU/SR connue ?
 * L'origine de la recherche fait foi : un formulaire ouvert depuis une recherche
 * « N° parcelle (SU/SR) » porte un numéro SU/SR même sans préfixe saisi.
 */
export const hasSuSrReference = (
  parcelNumber?: string | null,
  searchOrigin?: 'parcel' | 'title',
  searchParcelNumber?: string | null,
): boolean => {
  const raw = (parcelNumber || '').trim();
  const fromParcelSearch = searchOrigin === 'parcel' && !!(searchParcelNumber || '').trim();
  return fromParcelSearch || /^S\s*[UR]\s*[0-9]/i.test(raw);
};

/**
 * Le n° SU/SR est-il demandé ? Non pour « Fiche parcellaire » sans référence
 * SU/SR connue — le numéro du titre sert alors de référence.
 */
export const computeParcelNumberRequired = (
  propertyTitleType?: string | null,
  hasSuSr = false,
): boolean => propertyTitleType !== 'Fiche parcellaire' || hasSuSr;
