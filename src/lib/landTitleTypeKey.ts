/**
 * Miroir exact de `public.map_land_title_type_key` (serveur) : associe le libellé
 * du titre déduit à la clé du barème. Affichage uniquement ; le serveur fait foi.
 */
export const mapLandTitleTypeKey = (label: string | null | undefined): string => {
  if (!label) return 'concession_ordinaire';
  const l = label.toLowerCase();
  if (/certificat.*enregistrement/.test(l)) return 'certificat_enregistrement';
  if (l.includes('concession perp')) return 'concession_perpetuelle';
  if (l.includes('emphyt')) return 'bail_emphyteotique';
  if (/permis.*occupation/.test(l)) return 'permis_occupation';
  if (/autorisation.*occupation/.test(l)) return 'autorisation_occupation';
  if (l.includes('location')) return 'location';
  return 'concession_ordinaire';
};
