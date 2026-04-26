/**
 * Normalise un nom de province RDC pour matching tolérant
 * (accents, casse, espaces, tirets, apostrophes).
 *
 * Garantit que les sources analytics (`Kasaï-Oriental`) matchent
 * la carte SVG (`Kasai Oriental`, `kasai-oriental`...).
 */
export function normalizeProvinceName(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/['’`]/g, '')
    .replace(/[\s\-_]+/g, '-'); // collapse spaces/underscores/dashes
}
