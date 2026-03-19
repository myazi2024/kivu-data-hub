/**
 * Constantes centralisées pour les labels d'expertise immobilière.
 * Utilisées dans le formulaire, l'admin, le PDF et le tableau de bord utilisateur.
 */

export const CONSTRUCTION_TYPE_LABELS: Record<string, string> = {
  villa: 'Villa / Maison individuelle',
  appartement: 'Appartement',
  immeuble: 'Immeuble / Bâtiment',
  duplex: 'Duplex / Triplex',
  studio: 'Studio',
  commercial: 'Local commercial',
  entrepot: 'Entrepôt / Hangar',
  terrain_nu: 'Terrain nu',
  autre: 'Autre',
};

export const QUALITY_LABELS: Record<string, string> = {
  luxe: 'Luxe / Haut standing',
  standard: 'Standard / Moyen standing',
  economique: 'Économique / Social',
};

export const CONDITION_LABELS: Record<string, string> = {
  neuf: 'Neuf (< 2 ans)',
  bon: 'Bon état',
  moyen: 'État moyen',
  mauvais: 'Mauvais état',
  a_renover: 'À rénover',
};

export const ROAD_LABELS: Record<string, string> = {
  asphalte: 'Route asphaltée',
  terre: 'Route en terre',
  piste: 'Piste / Sentier',
};

export const WALL_LABELS: Record<string, string> = {
  beton: 'Béton armé',
  briques_cuites: 'Briques cuites',
  briques_adobe: 'Briques adobe',
  parpaings: 'Parpaings / Blocs',
  bois: 'Bois',
  tole: 'Tôles métalliques',
  mixte: 'Mixte',
};

export const ROOF_LABELS: Record<string, string> = {
  tole_bac: 'Tôle bac / Ondulée',
  tuiles: 'Tuiles',
  dalle_beton: 'Dalle béton',
  ardoise: 'Ardoise',
  chaume: 'Chaume / Paille',
  autre: 'Autre',
};

export const SOUND_LABELS: Record<string, string> = {
  tres_calme: 'Très calme',
  calme: 'Calme',
  modere: 'Modéré',
  bruyant: 'Bruyant',
  tres_bruyant: 'Très bruyant',
};

export const WINDOW_LABELS: Record<string, string> = {
  aluminium: 'Aluminium',
  bois: 'Bois',
  pvc: 'PVC',
  fer: 'Fer forgé',
  sans_fenetres: 'Sans fenêtres',
};

export const FLOOR_LABELS: Record<string, string> = {
  carrelage: 'Carrelage',
  ciment_lisse: 'Ciment lissé',
  parquet: 'Parquet / Bois',
  marbre: 'Marbre / Granit',
  terre_battue: 'Terre battue',
  autre: 'Autre',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  assigned: 'Assigné',
  in_progress: 'En cours',
  completed: 'Terminé',
  rejected: 'Rejeté',
};

export const FACADE_ORIENTATION_LABELS: Record<string, string> = {
  nord: 'Nord',
  nord_est: 'Nord-Est',
  est: 'Est',
  sud_est: 'Sud-Est',
  sud: 'Sud',
  sud_ouest: 'Sud-Ouest',
  ouest: 'Ouest',
  nord_ouest: 'Nord-Ouest',
};

export const BUILDING_POSITION_LABELS: Record<string, string> = {
  premiere_position: 'Première position (bordure de route)',
  deuxieme_position: 'Deuxième position',
  fond_parcelle: 'Fond de parcelle',
  dans_servitude: 'Dans une servitude',
  coin_parcelle: 'En coin de parcelle',
};

export const ACCESSIBILITY_LABELS: Record<string, string> = {
  escalier: 'Escalier uniquement',
  ascenseur: 'Ascenseur disponible',
  escalier_ascenseur: 'Escalier + Ascenseur',
  plain_pied: 'Plain-pied (RDC)',
};
