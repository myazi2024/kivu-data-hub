import {
  CONDITION_LABELS,
  ROAD_LABELS, ROOF_LABELS, SOUND_LABELS,
  WINDOW_LABELS, FLOOR_LABELS, FACADE_ORIENTATION_LABELS,
  BUILDING_POSITION_LABELS, ACCESSIBILITY_LABELS
} from '@/constants/expertiseLabels';

// Derive select options from centralized labels
const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const PROPERTY_CONDITION_OPTIONS = toOptions(CONDITION_LABELS);
export const ROAD_ACCESS_OPTIONS = toOptions(ROAD_LABELS);
export const WINDOW_TYPE_OPTIONS = toOptions(WINDOW_LABELS);
export const FLOOR_MATERIAL_OPTIONS = toOptions(FLOOR_LABELS);
export const ROOF_MATERIAL_OPTIONS = toOptions(ROOF_LABELS);

export const SOUND_ENVIRONMENT_OPTIONS = [
  { value: 'tres_calme', label: SOUND_LABELS.tres_calme + ' (< 40 dB)', minDb: 0, maxDb: 40 },
  { value: 'calme', label: SOUND_LABELS.calme + ' (40-55 dB)', minDb: 40, maxDb: 55 },
  { value: 'modere', label: SOUND_LABELS.modere + ' (55-70 dB)', minDb: 55, maxDb: 70 },
  { value: 'bruyant', label: SOUND_LABELS.bruyant + ' (70-85 dB)', minDb: 70, maxDb: 85 },
  { value: 'tres_bruyant', label: SOUND_LABELS.tres_bruyant + ' (> 85 dB)', minDb: 85, maxDb: 200 },
];

export const FACADE_ORIENTATION_OPTIONS = toOptions(FACADE_ORIENTATION_LABELS);

export const BUILDING_POSITION_OPTIONS = toOptions(BUILDING_POSITION_LABELS);

export const ACCESSIBILITY_OPTIONS = toOptions(ACCESSIBILITY_LABELS);

// Générer les options d'année (1950 à année actuelle)
export const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1950 + 1 },
  (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  }
);

export const PROPERTY_CATEGORY_OPTIONS = [
  'Appartement', 'Villa', 'Maison', 'Maison basse', 'Local commercial',
  'Immeuble/Bâtiment', 'Entrepôt/Hangar', 'Terrain nu',
];

export const CATEGORY_TO_CONSTRUCTION_TYPES: Record<string, string[]> = {
  'Appartement': ['Résidentielle'], 'Villa': ['Résidentielle'], 'Maison': ['Résidentielle'],
  'Maison basse': ['Résidentielle'],
  'Local commercial': ['Commerciale'], 'Immeuble/Bâtiment': ['Résidentielle', 'Commerciale', 'Industrielle'],
  'Entrepôt/Hangar': ['Industrielle', 'Agricole'], 'Terrain nu': ['Terrain nu'],
};

export const MATERIALS_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle'],
  'Semi-durable': ['Semi-dur', 'Briques adobes', 'Bois', 'Mixte'],
  Précaire: ['Tôles', 'Bois', 'Paille', 'Autre'],
};

export const STANDING_BY_NATURE_FALLBACK: Record<string, string[]> = {
  Durable: ['Haut standing', 'Moyen standing', 'Économique'],
  'Semi-durable': ['Moyen standing', 'Économique'],
  Précaire: ['Économique'],
};

export const MAX_PARCEL_DOCS = 10;
export const MAX_CONSTRUCTION_IMAGES = 20;
