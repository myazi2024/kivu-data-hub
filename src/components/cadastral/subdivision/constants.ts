// Shared constants for subdivision module

export const SUBDIVISION_PURPOSE_KEYS = {
  sale: 'sale',
  inheritance: 'inheritance',
  investment: 'investment',
  construction: 'construction',
  donation: 'donation',
  family: 'family',
  commercial: 'commercial',
  other: 'other',
} as const;

export const SUBDIVISION_PURPOSE_LABELS: Record<string, string> = {
  sale: 'Vente',
  inheritance: 'Succession / Héritage',
  investment: 'Investissement immobilier',
  construction: 'Construction de logements',
  donation: 'Donation',
  family: 'Partage familial',
  commercial: 'Projet commercial',
  other: 'Autre',
};
