/**
 * Utilitaires de liaison entre les constructions du formulaire CCC et les
 * formes (polygones) tracées dans le croquis de la parcelle.
 *
 * Convention : `linkedIndex` 0 = construction principale, 1+ = constructions
 * additionnelles. Une forme sans `linkedIndex` explicite est traitée comme
 * l'index 0 (cas fréquent de la construction unique).
 */

export interface BuildingShapeLike {
  id: string;
  linkedIndex?: number;
  heightM?: number;
  [key: string]: unknown;
}

/** Retourne la forme du croquis liée à une construction du formulaire. */
export function getShapeForConstructionIndex<T extends BuildingShapeLike>(
  shapes: T[],
  constructionIndex: number,
): T | undefined {
  return shapes.find((s) => (s.linkedIndex ?? 0) === constructionIndex);
}

/** Met à jour la hauteur (en mètres) de la forme identifiée par `shapeId`. */
export function withShapeHeight<T extends BuildingShapeLike>(
  shapes: T[],
  shapeId: string,
  heightM: number | undefined,
): T[] {
  return shapes.map((s) => (s.id === shapeId ? { ...s, heightM } : s));
}

/** Purge les hauteurs de toutes les formes (bien devenu non bâti). */
export function withoutShapeHeights<T extends BuildingShapeLike>(shapes: T[]): T[] {
  return shapes.map((s) => (s.heightM != null ? { ...s, heightM: undefined } : s));
}
