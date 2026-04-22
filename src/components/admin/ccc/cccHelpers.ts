/**
 * Lecture compatible camelCase / snake_case sur un objet JSON.
 * Retourne la première clé non-null trouvée.
 */
export const readField = (obj: any, ...keys: string[]): any => {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
};
