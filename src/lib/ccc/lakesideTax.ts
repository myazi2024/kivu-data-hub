/** Taxe réservée aux parcelles riveraines d'un lac. */
export const LAKESIDE_TAX_TYPE = 'Taxe compensatoire des 10 mètres de rive';

/** Types de taxe proposés selon le contexte de la parcelle. */
export const getAvailableTaxTypes = (opts: { hasRental: boolean; isLakeside?: boolean }): string[] => [
  'Impôt foncier annuel',
  ...(opts.hasRental ? ['Impôt sur les revenus locatifs'] : []),
  ...(opts.isLakeside === true ? [LAKESIDE_TAX_TYPE] : []),
];
