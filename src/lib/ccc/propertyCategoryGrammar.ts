/** Accords grammaticaux selon la catégorie de bien (texte d'interface uniquement). */
type Info = { noun: string; fem: boolean; det: 'ce' | 'cet' | 'cette'; single?: boolean };

const INFO: Record<string, Info> = {
  'Maison': { noun: 'maison', fem: true, det: 'cette' },
  'Maison basse': { noun: 'maison basse', fem: true, det: 'cette' },
  'Villa': { noun: 'villa', fem: true, det: 'cette' },
  'Immeuble/Bâtiment': { noun: 'immeuble', fem: false, det: 'cet' },
  'Local commercial': { noun: 'local commercial', fem: false, det: 'ce' },
  'Entrepôt/Hangar': { noun: 'entrepôt', fem: false, det: 'cet' },
  'Appartement': { noun: 'appartement', fem: false, det: 'cet', single: true },
  'Terrain nu': { noun: 'terrain', fem: false, det: 'ce' },
};
const DEFAULT: Info = { noun: 'bien', fem: false, det: 'ce' };

export const categoryInfo = (cat?: string): Info => INFO[(cat || '').trim()] ?? DEFAULT;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Ce/Cet/Cette <nom> » */
export const subjectOf = (cat?: string): string => {
  const i = categoryInfo(cat);
  return cap(`${i.det} ${i.noun}`);
};
/** il/elle + accord e */
export const agree = (cat?: string) => {
  const fem = categoryInfo(cat).fem;
  return { pron: fem ? 'elle' : 'il', e: fem ? 'e' : '' };
};

export const rentalQuestion = (cat?: string): string => {
  const i = categoryInfo(cat);
  const { pron, e } = agree(cat);
  const part = i.single ? '' : ', dans son intégralité ou en partie,';
  return `${subjectOf(cat)}${part} est-${pron} proposé${e} à la location ?`;
};

export const rentalNote = (cat?: string): string =>
  categoryInfo(cat).single
    ? 'Répondez Oui si le bien est loué ou proposé à la location.'
    : 'Répondez Oui si au moins une partie (chambre, étage, local…) est louée ou proposée à la location.';

export const occupiedQuestion = (cat?: string): string => {
  const i = categoryInfo(cat);
  const { pron, e } = agree(cat);
  return `Votre ${i.noun} est-${pron} habité${e} ?`;
};

export const rentalModeQuestion = (cat?: string): string => {
  const { pron, e } = agree(cat);
  return `Comment ${subjectOf(cat).charAt(0).toLowerCase() + subjectOf(cat).slice(1)} est-${pron} proposé${e} à la location ?`;
};
