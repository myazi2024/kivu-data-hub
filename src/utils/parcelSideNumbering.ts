/**
 * Numérotation canonique des côtés de parcelle et des bornes GPS.
 *
 * Règle : un côté nommé « Côté N » (ou sans nom) est considéré comme générique
 * et reçoit systématiquement le numéro de sa position (1..N). Un nom personnalisé
 * (« Côté Nord », « Façade avenue… ») est conservé tel quel.
 */

const GENERIC_SIDE_RE = /^\s*côté\s*\d*\s*$/i;
const GENERIC_BORNE_RE = /^\s*borne\s*\d*\s*$/i;

export const isGenericSideName = (name?: string | null) =>
  !name || !name.trim() || GENERIC_SIDE_RE.test(name);

export const isGenericBorneName = (name?: string | null) =>
  !name || !name.trim() || GENERIC_BORNE_RE.test(name);

/** Réattribue « Côté 1..N » aux côtés au nom générique, en préservant les noms personnalisés. */
export function renumberParcelSides<T extends { name?: string }>(sides: T[]): T[] {
  return sides.map((side, i) =>
    isGenericSideName(side.name) ? { ...side, name: `Côté ${i + 1}` } : side
  );
}

/** Réattribue « Borne 1..N » aux bornes au nom générique. */
export function renumberGpsCoordinates<T extends { borne?: string }>(coords: T[]): T[] {
  return coords.map((c, i) =>
    isGenericBorneName(c.borne) ? { ...c, borne: `Borne ${i + 1}` } : c
  );
}

/**
 * Réindexe les informations de limite (`roadSides`) après la suppression du côté
 * `removedIndex` : l'entrée correspondante est retirée et les index supérieurs décalés.
 */
export function reindexRoadSidesAfterRemoval<T extends { sideIndex?: number }>(
  roadSides: T[],
  removedIndex: number
): T[] {
  return roadSides
    .filter(s => s.sideIndex !== removedIndex)
    .map(s =>
      typeof s.sideIndex === 'number' && s.sideIndex > removedIndex
        ? { ...s, sideIndex: s.sideIndex - 1 }
        : s
    );
}
