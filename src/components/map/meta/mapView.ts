/**
 * Vue de carte effectivement affichée en Données foncières.
 *
 * Aucun sélecteur manuel : la vue est dérivée de l'état des filtres Analytics et du
 * mode visuel, dans l'ordre de priorité décrit dans AGENTS.md. La vue par défaut est
 * celle des circonscriptions foncières.
 */
export type MapView = 'districts' | 'provinces' | 'territoires' | 'communes' | 'quartiers';

export interface MapViewState {
  /** Un visuel analytics projette ses données sur la carte (« Mode visuel »). */
  projectionActive: boolean;
  /** Une circonscription foncière est sélectionnée (filtre Analytics ou clic sur la carte). */
  landDistrictSelected: boolean;
  provinceSelected: boolean;
  ville?: string;
  commune?: string;
  territoire?: string;
  sectionType: string;
}

export function resolveMapView(state: MapViewState): MapView {
  if (state.projectionActive) return 'provinces';
  if (state.landDistrictSelected) return 'districts';
  if (state.sectionType === 'rurale' || (state.territoire && state.provinceSelected)) return 'territoires';
  if (state.ville && state.commune) return 'quartiers';
  if (state.ville) return 'communes';
  return 'districts';
}
