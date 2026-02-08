import { Home, Building2, Factory, Tractor, Landmark } from 'lucide-react';

export const ZONE_OPTIONS = [
  { value: 'urban', label: 'Urbaine', icon: Building2, desc: 'Ville, commune urbaine' },
  { value: 'rural', label: 'Rurale', icon: Tractor, desc: 'Territoire, collectivité' },
];

export const USAGE_OPTIONS = [
  { value: 'residential', label: 'Résidentiel', icon: Home, desc: 'Habitation principale ou secondaire' },
  { value: 'commercial', label: 'Commercial', icon: Building2, desc: 'Bureau, boutique, entrepôt' },
  { value: 'industrial', label: 'Industriel', icon: Factory, desc: 'Usine, atelier de production' },
  { value: 'agricultural', label: 'Agricole', icon: Tractor, desc: 'Exploitation agricole' },
  { value: 'mixed', label: 'Mixte', icon: Landmark, desc: 'Usage combiné' },
];

export const CONSTRUCTION_OPTIONS = [
  { value: 'en_dur', label: 'En dur', desc: 'Béton, briques, ciment' },
  { value: 'semi_dur', label: 'Semi-dur', desc: 'Matériaux mixtes' },
  { value: 'en_paille', label: 'En paille/bois', desc: 'Matériaux traditionnels' },
  { value: 'none', label: 'Terrain nu', desc: 'Pas de construction' },
];

export const CONSTRUCTION_LABELS: Record<string, string> = {
  en_dur: 'En dur',
  semi_dur: 'Semi-dur',
  en_paille: 'En paille/bois',
};

export const ROOFING_LABELS: Record<string, string> = {
  tole: 'Tôle ondulée',
  tuile: 'Tuile',
  beton: 'Dalle en béton',
  chaume: 'Chaume / Paille',
  autre: 'Autre',
};

export const USAGE_LABELS: Record<string, string> = {
  residential: 'Résidentiel',
  commercial: 'Commercial',
  industrial: 'Industriel',
  agricultural: 'Agricole',
  mixed: 'Mixte',
};

/** Validate NIF format: alphanumeric, 6-15 characters */
export const validateNIF = (nif: string): boolean => {
  if (!nif.trim()) return false;
  return /^[A-Za-z0-9]{6,15}$/.test(nif.trim());
};

export const NIF_FORMAT_ERROR = 'Le NIF doit contenir entre 6 et 15 caractères alphanumériques (ex: A0123456B)';
